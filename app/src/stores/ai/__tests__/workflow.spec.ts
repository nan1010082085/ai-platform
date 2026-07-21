/**
 * stores/ai/workflow.ts unit tests
 *
 * 覆盖 createWorkflowModule 的 resetWorkflowExecutionState 和 stopWorkflowGeneration。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/workflowChatResponse', () => ({
  isWorkflowHitlApprovalMessage: vi.fn(),
  extractWorkflowStreamingText: vi.fn(),
}))

vi.mock('@/utils/workflowMessageExecution', () => ({
  buildWorkflowMessageExecution: vi.fn(),
}))

vi.mock('@/composables/useWorkflowChatExecution', () => ({
  runWorkflowChatTurn: vi.fn(),
}))

vi.mock('@schema-platform/platform-shared/socket', () => ({
  connect: vi.fn(),
  isConnected: vi.fn().mockReturnValue(true),
}))

vi.mock('@/api/agentWorkflowApi', () => ({
  cancelExecution: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/utils/telemetry', () => ({
  trackAi: vi.fn(),
  AI_TELEMETRY_EVENTS: { WORKFLOW_EXECUTE_FAIL: 'workflow_execute_fail' },
  reportAiError: vi.fn(),
}))

vi.mock('@schema-platform/platform-shared/utils/message', () => ({
  message: { error: vi.fn() },
}))

import { createWorkflowModule, type WorkflowExecutionState } from '@/stores/ai/workflow'

function createState(): WorkflowExecutionState {
  return {
    lastWorkflowExecutionId: { value: null },
    pendingWorkflowExecutionId: { value: null },
    activeWorkflowExecutionId: { value: null },
    workflowPollAborted: false,
  }
}

describe('workflow module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resetWorkflowExecutionState clears all state', () => {
    const state = createState()
    state.lastWorkflowExecutionId.value = 'exec-1'
    state.pendingWorkflowExecutionId.value = 'exec-2'
    state.activeWorkflowExecutionId.value = 'exec-3'
    state.workflowPollAborted = true

    const { resetWorkflowExecutionState } = createWorkflowModule(state)
    resetWorkflowExecutionState()

    expect(state.lastWorkflowExecutionId.value).toBeNull()
    expect(state.pendingWorkflowExecutionId.value).toBeNull()
    expect(state.activeWorkflowExecutionId.value).toBeNull()
    expect(state.workflowPollAborted).toBe(false)
  })

  it('stopWorkflowGeneration sets pollAborted and cancels active execution', async () => {
    const { cancelExecution } = await import('@/api/agentWorkflowApi')
    const state = createState()
    state.activeWorkflowExecutionId.value = 'exec-1'

    const { stopWorkflowGeneration } = createWorkflowModule(state)
    stopWorkflowGeneration()

    expect(state.workflowPollAborted).toBe(true)
    // cancelExecution is called asynchronously
    await vi.waitFor(() => {
      expect(cancelExecution).toHaveBeenCalledWith('exec-1')
    })
  })

  it('stopWorkflowGeneration does not cancel when no active execution', () => {
    const state = createState()
    state.activeWorkflowExecutionId.value = null

    const { stopWorkflowGeneration } = createWorkflowModule(state)
    stopWorkflowGeneration()

    expect(state.workflowPollAborted).toBe(true)
  })

  it('sendWorkflowMessage returns early when no workflowId', async () => {
    const state = createState()
    const deps = {
      chatSettingsStore: { chatSettings: { agentWorkflowId: null } },
      streamStore: { loading: false, error: null },
      ragStore: { getRagContextContent: () => '' },
      conversationStore: { messages: [] as never[], currentConversationId: null, loadConversations: vi.fn() },
    }

    const { sendWorkflowMessage } = createWorkflowModule(state)
    await sendWorkflowMessage('hello', deps as never)

    expect(deps.streamStore.loading).toBe(false)
    expect(deps.conversationStore.messages).toHaveLength(0)
  })

  it('exports expected interface', () => {
    const state = createState()
    const module = createWorkflowModule(state)
    expect(module).toHaveProperty('state')
    expect(module).toHaveProperty('resetWorkflowExecutionState')
    expect(module).toHaveProperty('sendWorkflowMessage')
    expect(module).toHaveProperty('stopWorkflowGeneration')
    expect(typeof module.resetWorkflowExecutionState).toBe('function')
    expect(typeof module.sendWorkflowMessage).toBe('function')
    expect(typeof module.stopWorkflowGeneration).toBe('function')
  })

  it('sendWorkflowMessage pushes user + assistant messages and calls runWorkflowChatTurn', async () => {
    const { runWorkflowChatTurn } = await import('@/composables/useWorkflowChatExecution')
    const { buildWorkflowMessageExecution } = await import('@/utils/workflowMessageExecution')
    const { extractWorkflowStreamingText } = await import('@/utils/workflowChatResponse')

    vi.mocked(runWorkflowChatTurn).mockResolvedValue({
      lastExecutionId: 'exec-1',
      pendingExecutionId: null,
      execution: { id: 'exec-1', status: 'success' },
      responseText: 'Generated!',
    } as never)
    vi.mocked(buildWorkflowMessageExecution).mockReturnValue({ id: 'exec-1', status: 'success' } as never)
    vi.mocked(extractWorkflowStreamingText).mockReturnValue(null)

    const state = createState()
    const messages: never[] = []
    const deps = {
      chatSettingsStore: { chatSettings: { agentWorkflowId: 'wf-1' } },
      streamStore: { loading: false, error: null },
      ragStore: { getRagContextContent: () => '' },
      conversationStore: { messages, currentConversationId: 'conv-1', loadConversations: vi.fn() },
    }

    const { sendWorkflowMessage } = createWorkflowModule(state)
    await sendWorkflowMessage('hello', deps as never)

    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('hello')
    expect(messages[1].role).toBe('assistant')
    expect(messages[1].content).toBe('Generated!')
    expect(messages[1].status).toBe('received')
    expect(state.lastWorkflowExecutionId.value).toBe('exec-1')
  })

  it('sendWorkflowMessage sets error on catch', async () => {
    const { runWorkflowChatTurn } = await import('@/composables/useWorkflowChatExecution')
    vi.mocked(runWorkflowChatTurn).mockRejectedValue(new Error('LLM timeout'))

    const state = createState()
    const messages: never[] = []
    const deps = {
      chatSettingsStore: { chatSettings: { agentWorkflowId: 'wf-1' } },
      streamStore: { loading: false, error: null },
      ragStore: { getRagContextContent: () => '' },
      conversationStore: { messages, currentConversationId: 'conv-1', loadConversations: vi.fn() },
    }

    const { sendWorkflowMessage } = createWorkflowModule(state)
    await sendWorkflowMessage('hello', deps as never)

    expect(deps.streamStore.error).toBe('LLM timeout')
    expect(messages[1].status).toBe('error')
    expect(messages[1].content).toBe('LLM timeout')
  })

  it('sendWorkflowMessage handles abort path', async () => {
    const { runWorkflowChatTurn } = await import('@/composables/useWorkflowChatExecution')
    const { buildWorkflowMessageExecution } = await import('@/utils/workflowMessageExecution')
    const { extractWorkflowStreamingText } = await import('@/utils/workflowChatResponse')

    const state = createState()

    vi.mocked(runWorkflowChatTurn).mockImplementation(async () => {
      // Simulate abort during execution (after the reset at line 60)
      state.workflowPollAborted = true
      return {
        lastExecutionId: 'exec-1',
        pendingExecutionId: null,
        execution: { id: 'exec-1', status: 'cancelled' },
        responseText: '',
      } as never
    })
    vi.mocked(buildWorkflowMessageExecution).mockReturnValue({ id: 'exec-1', status: 'cancelled' } as never)
    vi.mocked(extractWorkflowStreamingText).mockReturnValue(null)

    const messages: never[] = []
    const deps = {
      chatSettingsStore: { chatSettings: { agentWorkflowId: 'wf-1' } },
      streamStore: { loading: false, error: null },
      ragStore: { getRagContextContent: () => '' },
      conversationStore: { messages, currentConversationId: 'conv-1', loadConversations: vi.fn() },
    }

    const { sendWorkflowMessage } = createWorkflowModule(state)
    await sendWorkflowMessage('hello', deps as never)

    expect(messages[1].content).toBe('已停止生成')
    expect(messages[1].status).toBe('received')
  })

  it('sendWorkflowMessage enriches content with RAG prefix', async () => {
    const { runWorkflowChatTurn } = await import('@/composables/useWorkflowChatExecution')
    vi.mocked(runWorkflowChatTurn).mockResolvedValue({
      lastExecutionId: 'exec-1',
      pendingExecutionId: null,
      execution: { id: 'exec-1', status: 'success' },
      responseText: 'ok',
    } as never)

    const state = createState()
    const messages: never[] = []
    const deps = {
      chatSettingsStore: { chatSettings: { agentWorkflowId: 'wf-1' } },
      streamStore: { loading: false, error: null },
      ragStore: { getRagContextContent: () => '[RAG] context\n\n' },
      conversationStore: { messages, currentConversationId: 'conv-1', loadConversations: vi.fn() },
    }

    const { sendWorkflowMessage } = createWorkflowModule(state)
    await sendWorkflowMessage('hello', deps as never)

    expect(messages[0].content).toBe('[RAG] context\n\nhello')
    expect(runWorkflowChatTurn).toHaveBeenCalledWith(
      expect.objectContaining({ message: '[RAG] context\n\nhello' }),
    )
  })

  it('sendWorkflowMessage uses HITL decision when pendingWorkflowExecutionId exists', async () => {
    const { runWorkflowChatTurn } = await import('@/composables/useWorkflowChatExecution')
    const { isWorkflowHitlApprovalMessage } = await import('@/utils/workflowChatResponse')
    vi.mocked(isWorkflowHitlApprovalMessage).mockReturnValue(true)
    vi.mocked(runWorkflowChatTurn).mockResolvedValue({
      lastExecutionId: 'exec-1',
      pendingExecutionId: null,
      execution: { id: 'exec-1', status: 'success' },
      responseText: 'approved',
    } as never)

    const state = createState()
    state.pendingWorkflowExecutionId.value = 'pending-exec-1'
    const messages: never[] = []
    const deps = {
      chatSettingsStore: { chatSettings: { agentWorkflowId: 'wf-1' } },
      streamStore: { loading: false, error: null },
      ragStore: { getRagContextContent: () => '' },
      conversationStore: { messages, currentConversationId: 'conv-1', loadConversations: vi.fn() },
    }

    const { sendWorkflowMessage } = createWorkflowModule(state)
    await sendWorkflowMessage('approve', deps as never)

    expect(isWorkflowHitlApprovalMessage).toHaveBeenCalledWith('approve')
    expect(runWorkflowChatTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingExecutionId: 'pending-exec-1',
        hitlApproved: true,
      }),
    )
  })

  it('sendWorkflowMessage updates content on progress with partial text', async () => {
    const { runWorkflowChatTurn } = await import('@/composables/useWorkflowChatExecution')
    const { extractWorkflowStreamingText } = await import('@/utils/workflowChatResponse')

    let progressCallback: ((execution: never) => void) | undefined
    vi.mocked(runWorkflowChatTurn).mockImplementation(async (opts: { onProgress?: (e: never) => void }) => {
      progressCallback = opts.onProgress
      return {
        lastExecutionId: 'exec-1',
        pendingExecutionId: null,
        execution: { id: 'exec-1', status: 'success' },
        responseText: 'final',
      } as never
    })
    vi.mocked(extractWorkflowStreamingText).mockReturnValue('partial content')

    const state = createState()
    const messages: never[] = []
    const deps = {
      chatSettingsStore: { chatSettings: { agentWorkflowId: 'wf-1' } },
      streamStore: { loading: false, error: null },
      ragStore: { getRagContextContent: () => '' },
      conversationStore: { messages, currentConversationId: 'conv-1', loadConversations: vi.fn() },
    }

    const { sendWorkflowMessage } = createWorkflowModule(state)
    const promise = sendWorkflowMessage('hello', deps as never)

    // Trigger progress callback
    if (progressCallback) progressCallback({ id: 'exec-1', status: 'running' } as never)

    await promise

    expect(messages[1].content).toBe('final') // final overwrites partial
  })
})
