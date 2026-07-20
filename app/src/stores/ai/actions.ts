/**
 * AI store message / search actions (extracted to keep ai.ts under size limit).
 * Public API remains on useAiStore — this module only holds implementations.
 */

import type { AgentType, ChatContext, MentionReference, MessageDocumentAttachment, StreamEvent } from '@/types'
import type {
  SearchResult,
  MentionType,
  MentionSearchResult,
  FeedbackType,
  SearchConversationsParams,
} from '@/api/aiApi'
import {
  searchConversations,
  mentionSearch,
  submitMessageFeedback,
} from '@/api/aiApi'
import { message } from '@schema-platform/platform-shared/utils/message'
import { trackAi, AI_TELEMETRY_EVENTS } from '@/utils/telemetry'

export interface AiActionStores {
  conversationStore: {
    messages: import('@/types').AIMessage[]
    currentConversationId: string | null
    loadConversations: () => Promise<void>
  }
  streamStore: {
    cancelCurrent: () => void
    lastMessagePayload: {
      content: string
      mentions?: MentionReference[]
      attachments?: MessageDocumentAttachment[]
    } | null
    retryCount: number
    loading: boolean
    error: string | null
    executeStream: (
      content: string,
      mentions: MentionReference[] | undefined,
      assistantIndex: number,
      messages: import('@/types').AIMessage[],
      handlers: {
        onStreamEvent: (event: StreamEvent, assistantIndex: number) => void
        onDone: (conversationId?: string) => void
        getContext: () => Record<string, unknown>
        documentAttachments?: MessageDocumentAttachment[]
      },
    ) => Promise<void>
  }
  schemaStore: {
    currentSchema: import('@/types').Widget[] | null
    currentFlow: import('@/types').FlowGraph | null
  }
  ragStore: {
    getRagContextContent: () => string
  }
  chatSettingsStore: {
    chatSettings: { agentWorkflowId: string | null }
  }
  hitlStore: {
    pendingInterrupt: import('@/types').PendingInterrupt | null
  }
}

export interface AiActionContext {
  stores: AiActionStores
  activeAgent: { value: AgentType }
  context: { value: ChatContext }
  handleStreamEvent: (event: StreamEvent, assistantIndex: number) => void
  workflowModule: {
    sendWorkflowMessage: (
      content: string,
      deps: {
        chatSettingsStore: AiActionStores['chatSettingsStore']
        streamStore: AiActionStores['streamStore'] & { loading: boolean; error: string | null }
        ragStore: AiActionStores['ragStore']
        conversationStore: AiActionStores['conversationStore']
      },
      attachments?: MessageDocumentAttachment[],
    ) => Promise<void>
  }
  requirementModule: {
    skipRequirement: (handler: (event: StreamEvent, assistantIndex: number) => void) => Promise<void>
    submitRequirementAnswer: (
      rawInput: string,
      handler: (event: StreamEvent, assistantIndex: number) => void,
      questionId?: string,
    ) => Promise<void>
  }
}

function streamContext(ctx: AiActionContext) {
  const { stores, context } = ctx
  return () => ({
    context: context.value,
    chatSettings: stores.chatSettingsStore.chatSettings,
    currentSchema: stores.schemaStore.currentSchema,
    currentFlow: stores.schemaStore.currentFlow,
    currentConversationId: stores.conversationStore.currentConversationId,
  })
}

export function createAiActions(ctx: AiActionContext) {
  const { stores, activeAgent, handleStreamEvent, workflowModule, requirementModule } = ctx
  const {
    conversationStore,
    streamStore,
    ragStore,
    chatSettingsStore,
    hitlStore,
  } = stores

  async function sendMessage(
    content: string,
    mentions?: MentionReference[],
    attachments?: MessageDocumentAttachment[],
  ): Promise<void> {
    trackAi(AI_TELEMETRY_EVENTS.CHAT_SEND, {
      agent: activeAgent.value,
      hasMentions: Boolean(mentions?.length),
      hasAttachments: Boolean(attachments?.length),
      viaWorkflow: Boolean(chatSettingsStore.chatSettings.agentWorkflowId),
    })
    if (chatSettingsStore.chatSettings.agentWorkflowId) {
      await workflowModule.sendWorkflowMessage(content, {
        chatSettingsStore,
        streamStore,
        ragStore,
        conversationStore,
      }, attachments)
      return
    }

    if (hitlStore.pendingInterrupt?.type === 'requirement_confirm') {
      const trimmed = content.trim()
      if (!trimmed) return
      if (/^(跳过|skip)$/i.test(trimmed)) {
        await requirementModule.skipRequirement(handleStreamEvent)
        return
      }
      await requirementModule.submitRequirementAnswer(trimmed, handleStreamEvent)
      return
    }

    streamStore.cancelCurrent()
    streamStore.lastMessagePayload = { content, mentions, attachments }
    streamStore.retryCount = 0
    streamStore.loading = true
    streamStore.error = null

    const ragPrefix = ragStore.getRagContextContent()
    const enrichedContent = ragPrefix + content

    conversationStore.messages.push({
      role: 'user',
      content: enrichedContent,
      attachments,
      timestamp: new Date(),
      status: 'sent',
    })

    const assistantIndex = conversationStore.messages.length
    conversationStore.messages.push({
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'streaming',
    })

    await streamStore.executeStream(enrichedContent, mentions, assistantIndex, conversationStore.messages, {
      onStreamEvent: handleStreamEvent,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: streamContext(ctx),
      documentAttachments: attachments,
    })
  }

  async function retryLastMessage(): Promise<void> {
    if (!streamStore.lastMessagePayload) return

    streamStore.cancelCurrent()
    streamStore.retryCount = 0
    streamStore.loading = true
    streamStore.error = null

    const lastIdx = conversationStore.messages.length - 1
    if (lastIdx >= 0 && conversationStore.messages[lastIdx].role === 'assistant') {
      conversationStore.messages[lastIdx].content = ''
      conversationStore.messages[lastIdx].status = 'streaming'
      await streamStore.executeStream(
        streamStore.lastMessagePayload.content,
        streamStore.lastMessagePayload.mentions,
        lastIdx,
        conversationStore.messages,
        {
          onStreamEvent: handleStreamEvent,
          onDone: (conversationId) => {
            if (conversationId) conversationStore.loadConversations()
          },
          getContext: streamContext(ctx),
          documentAttachments: streamStore.lastMessagePayload.attachments,
        },
      )
    }
  }

  async function retryToolCall(messageIndex: number, toolCallIndex: number): Promise<void> {
    const msg = conversationStore.messages[messageIndex]
    if (!msg || msg.role !== 'assistant' || !msg.toolCalls) return

    const toolCall = msg.toolCalls[toolCallIndex]
    if (!toolCall || !toolCall.error) return

    toolCall.error = undefined
    toolCall.result = undefined

    let userContent = ''
    let userMentions: MentionReference[] | undefined
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (conversationStore.messages[i].role === 'user') {
        userContent = conversationStore.messages[i].content
        break
      }
    }
    if (!userContent) return

    streamStore.cancelCurrent()
    streamStore.loading = true
    streamStore.error = null
    msg.status = 'streaming'

    await streamStore.executeStream(userContent, userMentions, messageIndex, conversationStore.messages, {
      onStreamEvent: handleStreamEvent,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: streamContext(ctx),
    })
  }

  async function regenerateMessage(messageIndex: number): Promise<void> {
    const msg = conversationStore.messages[messageIndex]
    if (!msg || msg.role !== 'assistant') return

    let userContent = ''
    let userMentions: MentionReference[] | undefined
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (conversationStore.messages[i].role === 'user') {
        userContent = conversationStore.messages[i].content
        break
      }
    }
    if (!userContent) return

    streamStore.cancelCurrent()
    streamStore.loading = true
    streamStore.error = null

    msg.content = ''
    msg.thinking = undefined
    msg.tip = undefined
    msg.toolCalls = undefined
    msg.schema = undefined
    msg.flow = undefined
    msg.feedback = null
    msg.status = 'streaming'

    await streamStore.executeStream(userContent, userMentions, messageIndex, conversationStore.messages, {
      onStreamEvent: handleStreamEvent,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: streamContext(ctx),
    })
  }

  async function submitFeedback(messageIndex: number, type: FeedbackType): Promise<void> {
    const msg = conversationStore.messages[messageIndex]
    if (!msg) return

    const messageId = msg.id
    if (!messageId) return

    const newFeedback = msg.feedback === type ? null : type
    msg.feedback = newFeedback

    try {
      await submitMessageFeedback(messageId, type)
    } catch (err) {
      msg.feedback = msg.feedback === type ? null : type
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('[ai:feedback] 提交反馈失败:', errorMsg)
      message.error('反馈提交失败，请稍后重试')
    }
  }

  async function searchConversationsAction(
    params: string | SearchConversationsParams,
  ): Promise<SearchResult> {
    const normalized = typeof params === 'string' ? { keyword: params } : params
    return searchConversations(normalized)
  }

  async function mentionSearchAction(
    query: string,
    type: MentionType,
    limit = 10,
  ): Promise<MentionSearchResult[]> {
    return mentionSearch(query, type, limit)
  }

  return {
    sendMessage,
    retryLastMessage,
    retryToolCall,
    regenerateMessage,
    submitFeedback,
    searchConversationsAction,
    mentionSearchAction,
  }
}
