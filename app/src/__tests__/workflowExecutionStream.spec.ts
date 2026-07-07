import { describe, it, expect, vi, beforeEach } from 'vitest'

const socketMocks = vi.hoisted(() => ({
  emitWorkflowSubscribe: vi.fn(),
  emitWorkflowUnsubscribe: vi.fn(),
  onWorkflowEvent: vi.fn(),
  onWorkflowError: vi.fn(),
  isConnected: vi.fn(() => true),
  connect: vi.fn(),
}))

vi.mock('@schema-platform/platform-shared/socket', () => socketMocks)

import { waitForWorkflowExecution } from '@/composables/useWorkflowExecutionStream'

describe('waitForWorkflowExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    socketMocks.onWorkflowEvent.mockImplementation((handler) => {
      queueMicrotask(() => {
        handler({
          executionId: 'exec-1',
          execution: { id: 'exec-1', status: 'success', workflowId: 'wf-1', workflowName: 'Test' },
        })
      })
      return () => {}
    })
    socketMocks.onWorkflowError.mockReturnValue(() => {})
  })

  it('subscribes and resolves on terminal workflow:event', async () => {
    const execution = await waitForWorkflowExecution('exec-1', () => false)
    expect(socketMocks.emitWorkflowSubscribe).toHaveBeenCalledWith({ executionId: 'exec-1' })
    expect(execution.status).toBe('success')
    expect(socketMocks.emitWorkflowUnsubscribe).toHaveBeenCalledWith({ executionId: 'exec-1' })
  })
})
