/**
 * hitl store 测试
 *
 * T6 验收：
 * - hasPendingInterrupt 仅响应传统 pendingInterrupt
 * - agent API 已隔离到 hitl.agent.poc.ts，不参与正式状态
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHITLStore } from '@/stores/hitl'
import { createAgentInterruptState } from '@/stores/hitl.agent.poc'

describe('useHITLStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hasPendingInterrupt is false by default', () => {
    const store = useHITLStore()
    expect(store.hasPendingInterrupt).toBe(false)
  })

  it('hasPendingInterrupt is true after setInterrupt', () => {
    const store = useHITLStore()
    store.setInterrupt({
      threadId: 't1',
      type: 'requirement_confirm',
      message: '确认？',
    })
    expect(store.hasPendingInterrupt).toBe(true)
  })

  it('hasPendingInterrupt is false after clearInterrupt', () => {
    const store = useHITLStore()
    store.setInterrupt({ threadId: 't1', type: 'test', message: 'x' })
    store.clearInterrupt()
    expect(store.hasPendingInterrupt).toBe(false)
  })

  it('hasPendingInterrupt ignores agent POC interrupts (T6 隔离)', () => {
    const store = useHITLStore()
    const agentState = createAgentInterruptState()

    // agent POC 注册中断
    agentState.registerAgentInterrupt({
      sessionId: 'sess-1',
      nodeId: 'node-1',
      nodeName: 'Agent',
      message: '等待审批',
      interruptedAt: Date.now(),
    })

    // 传统 HITL 无中断时，hasPendingInterrupt 应为 false
    expect(store.hasPendingInterrupt).toBe(false)
    // agent 队列有数据但不影响正式状态
    expect(agentState.pendingAgentInterrupts.value).toHaveLength(1)
  })
})
