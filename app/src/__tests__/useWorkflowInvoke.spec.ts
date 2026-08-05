/**
 * useWorkflowInvoke 单测：Open API invoke/轮询 + HITL resume + cancel + JWT 降级
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'

vi.mock('element-plus', () => ({
  ElMessage: {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/api/workflowInvokeApi', () => ({
  invokeWorkflowOpenApi: vi.fn(),
  getInvokeExecutionOpenApi: vi.fn(),
  resumeInvokeOpenApi: vi.fn(),
  cancelInvokeOpenApi: vi.fn(),
}))

vi.mock('@/api/agentWorkflowApi', () => ({
  resumeExecution: vi.fn(),
  cancelExecution: vi.fn(),
}))

import { ElMessage } from 'element-plus'
import { invokeWorkflowOpenApi, getInvokeExecutionOpenApi, resumeInvokeOpenApi, cancelInvokeOpenApi } from '@/api/workflowInvokeApi'
import { resumeExecution, cancelExecution as jwtCancelExecution } from '@/api/agentWorkflowApi'
import { useWorkflowInvoke } from '@/composables/useWorkflowInvoke'
import type { AgentWorkflowExecution } from '@/types/agentWorkflow'

const mockInvoke = vi.mocked(invokeWorkflowOpenApi)
const mockGetExec = vi.mocked(getInvokeExecutionOpenApi)
const mockResume = vi.mocked(resumeInvokeOpenApi)
const mockCancel = vi.mocked(cancelInvokeOpenApi)
const mockJwtResume = vi.mocked(resumeExecution)
const mockJwtCancel = vi.mocked(jwtCancelExecution)

function makeExecution(partial: Partial<AgentWorkflowExecution>): AgentWorkflowExecution {
  return {
    id: 'exec-1',
    workflowId: 'wf-1',
    workflowName: 'Test',
    versionId: null,
    version: '20260101000000',
    status: 'running',
    trigger: 'api',
    startedAt: new Date().toISOString(),
    nodeRecords: [],
    ...partial,
  }
}

function makeWaitingExec(): AgentWorkflowExecution {
  return makeExecution({
    status: 'waiting',
    nodeRecords: [{
      nodeId: 'hitl-1',
      nodeType: 'hitl',
      nodeName: '人工确认',
      status: 'waiting',
      output: { message: '请确认' },
    }],
  })
}

function withInvoke(opts?: Parameters<typeof useWorkflowInvoke>[0]) {
  const scope = effectScope()
  const api = scope.run(() => useWorkflowInvoke(opts))!
  return { ...api, dispose: () => scope.stop() }
}

describe('useWorkflowInvoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('invoke 成功后轮询，success 时停止', async () => {
    mockInvoke.mockResolvedValue({
      success: true,
      data: {
        executionId: 'exec-1',
        workflowId: 'wf-1',
        workflowName: 'Test',
        status: 'running',
        execution: makeExecution({ status: 'running' }),
      },
    })
    mockGetExec.mockResolvedValue({
      success: true,
      data: makeExecution({ status: 'success' }),
    })

    const { invoke, execution, dispose } = withInvoke({ pollIntervalMs: 100, maxAttempts: 5 })
    const ok = await invoke('my-slug', 'wf_key', '你好')
    expect(ok).toBe(true)
    expect(mockInvoke).toHaveBeenCalledWith('my-slug', 'wf_key', { message: '你好' })

    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(execution.value?.status).toBe('success')
    dispose()
  })

  it('轮询到 waiting 时停止并暴露 pendingHitl', async () => {
    const waitingExec = makeWaitingExec()
    mockInvoke.mockResolvedValue({
      success: true,
      data: {
        executionId: 'exec-1',
        workflowId: 'wf-1',
        workflowName: 'Test',
        status: 'running',
        execution: makeExecution({ status: 'running' }),
      },
    })
    mockGetExec.mockResolvedValue({ success: true, data: waitingExec })

    const { invoke, pendingHitl, dispose } = withInvoke({ pollIntervalMs: 100, maxAttempts: 5 })
    await invoke('slug', 'key', '你好，请介绍一下自己')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(pendingHitl.value?.nodeName).toBe('人工确认')
    expect(ElMessage.info).toHaveBeenCalledWith('工作流等待人工确认')
    dispose()
  })

  it('resumeHitl 通过 Open API 确认后继续轮询', async () => {
    mockInvoke.mockResolvedValue({
      success: true,
      data: {
        executionId: 'exec-1',
        workflowId: 'wf-1',
        workflowName: 'Test',
        status: 'waiting',
        execution: makeWaitingExec(),
      },
    })
    mockResume.mockResolvedValue({ success: true, data: makeExecution({ status: 'running' }) })
    mockGetExec.mockResolvedValue({ success: true, data: makeExecution({ status: 'success' }) })

    const { invoke, resumeHitl, execution, dispose } = withInvoke({ pollIntervalMs: 100, maxAttempts: 5 })
    await invoke('slug', 'key', '你好')

    const ok = await resumeHitl({ approved: true, answers: { q1: '确认' } })
    expect(ok).toBe(true)
    expect(mockResume).toHaveBeenCalledWith('exec-1', 'key', {
      approved: true,
      comment: '',
      answers: { q1: '确认' },
    })
    expect(mockJwtResume).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()
    expect(execution.value?.status).toBe('success')
    dispose()
  })

  it('resumeHitl Open API 404 时降级到 JWT', async () => {
    mockInvoke.mockResolvedValue({
      success: true,
      data: {
        executionId: 'exec-1',
        workflowId: 'wf-1',
        workflowName: 'Test',
        status: 'waiting',
        execution: makeWaitingExec(),
      },
    })
    // Open API 返回 not_found
    mockResume.mockResolvedValue({ success: false, error: { message: 'Not found', code: 'not_found' } })
    // JWT 降级成功
    mockJwtResume.mockResolvedValue(makeExecution({ status: 'success' }))

    const { invoke, resumeHitl, execution, usingJwtFallback, dispose } = withInvoke()
    await invoke('slug', 'key', 'hi')

    const ok = await resumeHitl({ approved: true })
    expect(ok).toBe(true)
    expect(usingJwtFallback.value).toBe(true)
    expect(mockJwtResume).toHaveBeenCalledWith('exec-1', expect.objectContaining({ approved: true }))
    expect(execution.value?.status).toBe('success')
    dispose()
  })

  it('resumeHitlByMessage 识别「确认」关键词', async () => {
    mockInvoke.mockResolvedValue({
      success: true,
      data: {
        executionId: 'exec-1',
        workflowId: 'wf-1',
        workflowName: 'Test',
        status: 'waiting',
        execution: makeWaitingExec(),
      },
    })
    mockResume.mockResolvedValue({ success: true, data: makeExecution({ status: 'success' }) })

    const { invoke, resumeHitlByMessage, dispose } = withInvoke()
    await invoke('slug', 'key', 'hi')
    const result = await resumeHitlByMessage('确认')
    expect(result).toBe(true)
    expect(mockResume).toHaveBeenCalledWith('exec-1', 'key', expect.objectContaining({ approved: true }))
    dispose()
  })

  it('resumeHitlByMessage 对非关键词返回 null', async () => {
    const { resumeHitlByMessage, dispose } = withInvoke()
    expect(await resumeHitlByMessage('随便说说')).toBeNull()
    expect(mockResume).not.toHaveBeenCalled()
    dispose()
  })

  it('cancelExecution 通过 Open API 取消', async () => {
    mockInvoke.mockResolvedValue({
      success: true,
      data: {
        executionId: 'exec-1',
        workflowId: 'wf-1',
        workflowName: 'Test',
        status: 'running',
        execution: makeExecution({ status: 'running' }),
      },
    })
    mockCancel.mockResolvedValue({ success: true, data: makeExecution({ status: 'cancelled' }) })

    const { invoke, cancelExecution, execution, dispose } = withInvoke()
    await invoke('slug', 'key', 'hi')
    const ok = await cancelExecution('用户主动取消')
    expect(ok).toBe(true)
    expect(mockCancel).toHaveBeenCalledWith('exec-1', 'key', '用户主动取消')
    expect(mockJwtCancel).not.toHaveBeenCalled()
    expect(execution.value?.status).toBe('cancelled')
    dispose()
  })

  it('cancelExecution Open API 404 时降级到 JWT', async () => {
    mockInvoke.mockResolvedValue({
      success: true,
      data: {
        executionId: 'exec-1',
        workflowId: 'wf-1',
        workflowName: 'Test',
        status: 'running',
        execution: makeExecution({ status: 'running' }),
      },
    })
    mockCancel.mockResolvedValue({ success: false, error: { message: 'Not found', code: 'not_found' } })
    mockJwtCancel.mockResolvedValue(makeExecution({ status: 'cancelled' }))

    const { invoke, cancelExecution, execution, usingJwtFallback, dispose } = withInvoke()
    await invoke('slug', 'key', 'hi')
    const ok = await cancelExecution('手动取消')
    expect(ok).toBe(true)
    expect(usingJwtFallback.value).toBe(true)
    expect(mockJwtCancel).toHaveBeenCalledWith('exec-1', '手动取消')
    expect(execution.value?.status).toBe('cancelled')
    dispose()
  })

  it('resumeHitl 失败时返回 false 并展示错误', async () => {
    mockInvoke.mockResolvedValue({
      success: true,
      data: {
        executionId: 'exec-1',
        workflowId: 'wf-1',
        workflowName: 'Test',
        status: 'waiting',
        execution: makeWaitingExec(),
      },
    })
    mockResume.mockResolvedValue({ success: false, error: { message: '密钥已过期' } })

    const { invoke, resumeHitl, dispose } = withInvoke()
    await invoke('slug', 'key', 'hi')
    const ok = await resumeHitl({ approved: true })
    expect(ok).toBe(false)
    expect(ElMessage.error).toHaveBeenCalledWith('密钥已过期')
    dispose()
  })
})
