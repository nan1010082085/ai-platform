/**
 * stores/ai/actions.ts unit tests (partial)
 *
 * 覆盖 searchConversationsAction 和 mentionSearchAction（未覆盖的函数）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/aiApi', () => ({
  searchConversations: vi.fn(),
  mentionSearch: vi.fn(),
  sendMessageToConversation: vi.fn(),
  sendWorkflowMessageToConversation: vi.fn(),
  submitMessageFeedback: vi.fn(),
}))

vi.mock('@schema-platform/platform-shared/utils/message', () => ({
  message: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}))

vi.mock('@/utils/telemetry', () => ({
  trackAi: vi.fn(),
  AI_TELEMETRY_EVENTS: {},
}))

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

import { searchConversations, mentionSearch } from '@/api/aiApi'
import { createAiActions } from '@/stores/ai/actions'

function createMockContext() {
  return {
    stores: {
      conversationStore: {
        messages: [],
        currentConversationId: 'conv-1',
        loadConversations: vi.fn(),
        loadConversation: vi.fn(),
      },
      streamStore: {
        loading: false,
        error: null,
      },
      chatSettingsStore: {
        chatSettings: { agentWorkflowId: null, selectedAgent: 'auto' },
      },
      ragStore: {
        getRagContextContent: () => '',
      },
      hitlStore: {
        pendingInterrupt: null,
        clearInterrupt: vi.fn(),
      },
    },
    activeAgent: { value: 'auto' },
    handleStreamEvent: vi.fn(),
    workflowModule: {
      sendWorkflowMessage: vi.fn(),
      stopWorkflowGeneration: vi.fn(),
    },
    requirementModule: {
      submitRequirementAnswer: vi.fn(),
      answerRequirementOption: vi.fn(),
      confirmRequirement: vi.fn(),
      skipRequirement: vi.fn(),
    },
  }
}

describe('actions - searchConversationsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('converts string params to keyword object', async () => {
    vi.mocked(searchConversations).mockResolvedValue({ conversations: [], total: 0, page: 1, pageSize: 20 })

    const ctx = createMockContext()
    const actions = createAiActions(ctx as never)
    await actions.searchConversationsAction('test query')

    expect(searchConversations).toHaveBeenCalledWith({ keyword: 'test query' })
  })

  it('passes object params directly', async () => {
    vi.mocked(searchConversations).mockResolvedValue({ conversations: [], total: 0, page: 1, pageSize: 20 })

    const ctx = createMockContext()
    const actions = createAiActions(ctx as never)
    const params = { keyword: 'test', source: 'editor', page: 2 }
    await actions.searchConversationsAction(params)

    expect(searchConversations).toHaveBeenCalledWith(params)
  })

  it('returns search result', async () => {
    const result = { conversations: [{ id: 'c1' }], total: 1, page: 1, pageSize: 20 }
    vi.mocked(searchConversations).mockResolvedValue(result as never)

    const ctx = createMockContext()
    const actions = createAiActions(ctx as never)
    const response = await actions.searchConversationsAction('test')

    expect(response).toEqual(result)
  })
})

describe('actions - mentionSearchAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls mentionSearch with correct args', async () => {
    vi.mocked(mentionSearch).mockResolvedValue([])

    const ctx = createMockContext()
    const actions = createAiActions(ctx as never)
    await actions.mentionSearchAction('input', 'widget', 20)

    expect(mentionSearch).toHaveBeenCalledWith('input', 'widget', 20)
  })

  it('uses default limit of 10', async () => {
    vi.mocked(mentionSearch).mockResolvedValue([])

    const ctx = createMockContext()
    const actions = createAiActions(ctx as never)
    await actions.mentionSearchAction('test', 'schema')

    expect(mentionSearch).toHaveBeenCalledWith('test', 'schema', 10)
  })

  it('returns mention results', async () => {
    const results = [{ id: 'w1', type: 'widget', name: 'Input' }]
    vi.mocked(mentionSearch).mockResolvedValue(results as never)

    const ctx = createMockContext()
    const actions = createAiActions(ctx as never)
    const response = await actions.mentionSearchAction('input', 'widget')

    expect(response).toEqual(results)
  })
})

describe('actions - regenerateMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns early when message not found or not assistant', async () => {
    const ctx = createMockContext()
    ctx.stores.conversationStore.messages = [] as never
    const actions = createAiActions(ctx as never)
    await actions.regenerateMessage(0)
    // Should not throw or call stream
    expect(ctx.stores.streamStore.loading).toBe(false)
  })

  it('returns early when no preceding user message', async () => {
    const ctx = createMockContext()
    ctx.stores.conversationStore.messages = [
      { role: 'assistant', content: 'hello', status: 'received' },
    ] as never
    const actions = createAiActions(ctx as never)
    await actions.regenerateMessage(0)
    expect(ctx.stores.streamStore.loading).toBe(false)
  })

  it('clears assistant message and re-streams', async () => {
    const ctx = createMockContext()
    const messages = [
      { role: 'user', content: 'make a form', status: 'sent' },
      { role: 'assistant', content: 'old response', status: 'received', thinking: 'old thinking' },
    ] as never
    ctx.stores.conversationStore.messages = messages
    ctx.stores.streamStore.cancelCurrent = vi.fn()
    ctx.stores.streamStore.executeStream = vi.fn()
    ctx.stores.streamStore.loading = false
    ctx.stores.streamStore.error = null

    const actions = createAiActions(ctx as never)
    await actions.regenerateMessage(1)

    expect(messages[1].content).toBe('')
    expect(messages[1].thinking).toBeUndefined()
    expect(messages[1].status).toBe('streaming')
    expect(ctx.stores.streamStore.executeStream).toHaveBeenCalled()
  })
})

describe('actions - submitFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns early when message not found', async () => {
    const ctx = createMockContext()
    ctx.stores.conversationStore.messages = [] as never
    const actions = createAiActions(ctx as never)
    await actions.submitFeedback(0, 'positive')
    // Should not throw
  })

  it('returns early when message has no id', async () => {
    const ctx = createMockContext()
    ctx.stores.conversationStore.messages = [{ role: 'assistant', content: 'hi' }] as never
    const actions = createAiActions(ctx as never)
    await actions.submitFeedback(0, 'positive')
    // Should not throw
  })

  it('sets feedback and calls API', async () => {
    const { submitMessageFeedback } = await import('@/api/aiApi')
    vi.mocked(submitMessageFeedback).mockResolvedValue(undefined as never)

    const ctx = createMockContext()
    const msg = { id: 'm1', role: 'assistant', content: 'hi', feedback: null }
    ctx.stores.conversationStore.messages = [msg] as never

    const actions = createAiActions(ctx as never)
    await actions.submitFeedback(0, 'positive')

    expect(msg.feedback).toBe('positive')
    expect(submitMessageFeedback).toHaveBeenCalledWith('m1', 'positive')
  })

  it('toggles feedback off when same type submitted again', async () => {
    const { submitMessageFeedback } = await import('@/api/aiApi')
    vi.mocked(submitMessageFeedback).mockResolvedValue(undefined as never)

    const ctx = createMockContext()
    const msg = { id: 'm1', role: 'assistant', content: 'hi', feedback: 'positive' }
    ctx.stores.conversationStore.messages = [msg] as never

    const actions = createAiActions(ctx as never)
    await actions.submitFeedback(0, 'positive')

    expect(msg.feedback).toBeNull()
  })

  it('reverts feedback on API error', async () => {
    const { submitMessageFeedback } = await import('@/api/aiApi')
    vi.mocked(submitMessageFeedback).mockRejectedValue(new Error('network'))

    const ctx = createMockContext()
    const msg = { id: 'm1', role: 'assistant', content: 'hi', feedback: null }
    ctx.stores.conversationStore.messages = [msg] as never

    const actions = createAiActions(ctx as never)
    await actions.submitFeedback(0, 'positive')

    // Feedback should be reverted
    expect(msg.feedback).toBeNull()
  })
})
