/**
 * agentWorkflowApi unit tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/shared/request', () => ({
  request: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

import { request } from '@/api/shared/request'
import {
  listWorkflows,
  createWorkflow,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  publishWorkflow,
  rotateWorkflowInvokeKey,
  listWorkflowVersions,
  getWorkflowVersion,
  executeWorkflow,
  listExecutions,
  getExecution,
  continueExecution,
  resumeExecution,
  cancelExecution,
} from '@/api/agentWorkflowApi'

const mockedRequest = vi.mocked(request)

describe('agentWorkflowApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listWorkflows fetches /ai/workflows', async () => {
    mockedRequest.mockResolvedValue([])
    await listWorkflows()
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflows')
  })

  it('createWorkflow POSTs name/description/templateId', async () => {
    mockedRequest.mockResolvedValue({ id: 'w1' })
    await createWorkflow('My Flow', 'desc', 'blank')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflows', {
      method: 'POST',
      body: { name: 'My Flow', description: 'desc', templateId: 'blank' },
    })
  })

  it('createWorkflow defaults description to empty string', async () => {
    mockedRequest.mockResolvedValue({ id: 'w1' })
    await createWorkflow('My Flow')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflows', {
      method: 'POST',
      body: { name: 'My Flow', description: '', templateId: undefined },
    })
  })

  it('getWorkflow fetches by id', async () => {
    mockedRequest.mockResolvedValue({ id: 'w1' })
    await getWorkflow('w1')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflows/w1')
  })

  it('updateWorkflow PUTs patch', async () => {
    mockedRequest.mockResolvedValue({ id: 'w1' })
    await updateWorkflow('w1', { name: 'Updated' })
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflows/w1', {
      method: 'PUT',
      body: { name: 'Updated' },
    })
  })

  it('deleteWorkflow sends DELETE', async () => {
    mockedRequest.mockResolvedValue({ deleted: true })
    await deleteWorkflow('w1')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflows/w1', { method: 'DELETE' })
  })

  it('publishWorkflow POSTs to /publish', async () => {
    mockedRequest.mockResolvedValue({ version: '1.0.0' })
    await publishWorkflow('w1')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflows/w1/publish', { method: 'POST' })
  })

  it('rotateWorkflowInvokeKey POSTs to /rotate-invoke-key', async () => {
    mockedRequest.mockResolvedValue({ invokeKey: 'sk-xxx', invokeKeyMasked: 'sk-***', invokePath: null })
    await rotateWorkflowInvokeKey('w1')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflows/w1/rotate-invoke-key', { method: 'POST' })
  })

  it('listWorkflowVersions fetches by id', async () => {
    mockedRequest.mockResolvedValue([])
    await listWorkflowVersions('w1')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflows/w1/versions')
  })

  it('getWorkflowVersion fetches by id and version', async () => {
    mockedRequest.mockResolvedValue({})
    await getWorkflowVersion('w1', '1.0.0')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflows/w1/versions/1.0.0')
  })

  it('executeWorkflow POSTs input and trigger', async () => {
    mockedRequest.mockResolvedValue({ id: 'e1' })
    await executeWorkflow('w1', { message: 'hi' }, { trigger: 'chat' })
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflows/w1/execute', {
      method: 'POST',
      body: { input: { message: 'hi' }, trigger: 'chat' },
    })
  })

  it('executeWorkflow defaults input to empty object', async () => {
    mockedRequest.mockResolvedValue({ id: 'e1' })
    await executeWorkflow('w1')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflows/w1/execute', {
      method: 'POST',
      body: { input: {}, trigger: undefined },
    })
  })

  it('listExecutions builds query string', async () => {
    mockedRequest.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
    await listExecutions({ workflowId: 'w1', page: 2, pageSize: 10 })
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflow-executions?workflowId=w1&page=2&pageSize=10')
  })

  it('listExecutions without params fetches base', async () => {
    mockedRequest.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
    await listExecutions()
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflow-executions')
  })

  it('getExecution fetches by id', async () => {
    mockedRequest.mockResolvedValue({ id: 'e1' })
    await getExecution('e1')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflow-executions/e1')
  })

  it('continueExecution POSTs input', async () => {
    mockedRequest.mockResolvedValue({ id: 'e1' })
    await continueExecution('e1', { confirmed: true })
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflow-executions/e1/continue', {
      method: 'POST',
      body: { input: { confirmed: true } },
    })
  })

  it('resumeExecution POSTs input', async () => {
    mockedRequest.mockResolvedValue({ id: 'e1' })
    await resumeExecution('e1')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflow-executions/e1/resume', {
      method: 'POST',
      body: { input: {} },
    })
  })

  it('cancelExecution POSTs reason when provided', async () => {
    mockedRequest.mockResolvedValue({ id: 'e1' })
    await cancelExecution('e1', 'user cancelled')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflow-executions/e1/cancel', {
      method: 'POST',
      body: { reason: 'user cancelled' },
    })
  })

  it('cancelExecution POSTs empty body when no reason', async () => {
    mockedRequest.mockResolvedValue({ id: 'e1' })
    await cancelExecution('e1')
    expect(mockedRequest).toHaveBeenCalledWith('/ai/workflow-executions/e1/cancel', {
      method: 'POST',
      body: {},
    })
  })
})
