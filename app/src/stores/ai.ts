/**
 * AI 对话状态管理（主 Orchestrator Store）
 *
 * 组合子 store 和子模块，暴露统一接口。
 * 子模块：
 * - ai/events.ts — 流式事件处理
 * - ai/workflow.ts — 工作流执行
 * - ai/requirement.ts — 需求确认流程
 *
 * 子 store（独立 Pinia store）：
 * - conversation.ts — 对话管理
 * - stream.ts — 流式连接
 * - schema.ts — Schema 状态
 * - llm.ts — LLM Provider
 * - rag.ts — RAG 搜索
 * - chatSettings.ts — 聊天设置
 * - hitl.ts — HITL 中断
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  AIMessage,
  AgentType,
  ChatContext,
  Widget,
  FlowGraph,
  MentionReference,
} from '@/types'
import type {
  SearchResult,
  MentionType,
  MentionSearchResult,
  FeedbackType,
} from '@/api/aiApi'
import {
  searchConversations,
  mentionSearch,
  submitMessageFeedback,
} from '@/api/aiApi'
import { handleStreamEvent } from './ai/events'
import { createWorkflowModule } from './ai/workflow'
import { createRequirementModule } from './ai/requirement'

import { useConversationStore } from './conversation'
import { useStreamStore } from './stream'
import { useSchemaStore } from './schema'
import { useLLMStore } from './llm'
import { useRAGStore } from './rag'
import { useChatSettingsStore } from './chatSettings'
import { useHITLStore } from './hitl'
import { getInputPlaceholder } from '@/utils/requirementConfirmFlow'
import type { RequirementConfirmContext } from '@/utils/requirementConfirmFlow'

export const useAiStore = defineStore('ai', () => {
  // ---- 内部 store 引用 ----
  const conversationStore = useConversationStore()
  const streamStore = useStreamStore()
  const schemaStore = useSchemaStore()
  const llmStore = useLLMStore()
  const ragStore = useRAGStore()
  const chatSettingsStore = useChatSettingsStore()
  const hitlStore = useHITLStore()

  // ---- 本地状态 ----
  const activeAgent = ref<AgentType>('auto')
  const context = ref<ChatContext>({ source: 'standalone' })
  const taskChain = ref<import('@/types').TaskChainStep[]>([])
  const taskChainIndex = ref(0)

  // ---- 子模块初始化 ----

  const workflowModule = createWorkflowModule({
    lastWorkflowExecutionId: ref<string | null>(null),
    pendingWorkflowExecutionId: ref<string | null>(null),
    activeWorkflowExecutionId: ref<string | null>(null),
    workflowPollAborted: false,
  })

  const requirementModule = createRequirementModule({
    conversationStore,
    hitlStore,
    streamStore,
  })

  // ---- 流式事件处理适配 ----

  function handleStreamEventForStore(
    event: import('@/types').StreamEvent,
    assistantIndex: number,
  ): void {
    handleStreamEvent(event, assistantIndex, conversationStore.messages, {
      schemaStore,
      streamStore,
      hitlStore,
      conversationStore,
      taskChain,
      taskChainIndex,
    })
  }

  // ---- Actions ----

  function switchAgent(agent: AgentType): void {
    activeAgent.value = agent
    context.value.source = agent === 'auto' ? 'standalone' : (agent as 'editor' | 'flow')
  }

  async function sendMessage(
    content: string,
    mentions?: MentionReference[],
    attachments?: import('@/types').MessageDocumentAttachment[],
  ): Promise<void> {
    if (chatSettingsStore.chatSettings.agentWorkflowId) {
      await workflowModule.sendWorkflowMessage(content, {
        chatSettingsStore,
        streamStore,
        ragStore,
        conversationStore,
      }, attachments)
      return
    }

    // 需求确认等待中：输入框发送 = 渐进式作答，不开启新对话轮次
    if (hitlStore.pendingInterrupt?.type === 'requirement_confirm') {
      const trimmed = content.trim()
      if (!trimmed) return
      if (/^(跳过|skip)$/i.test(trimmed)) {
        await requirementModule.skipRequirement(handleStreamEventForStore)
        return
      }
      await requirementModule.submitRequirementAnswer(trimmed, handleStreamEventForStore)
      return
    }

    streamStore.cancelCurrent()
    streamStore.lastMessagePayload = { content, mentions, attachments }
    streamStore.retryCount = 0
    streamStore.loading = true
    streamStore.error = null

    // 将 RAG context 注入消息内容
    const ragPrefix = ragStore.getRagContextContent()
    const enrichedContent = ragPrefix + content

    // 追加用户消息
    conversationStore.messages.push({
      role: 'user',
      content: enrichedContent,
      attachments,
      timestamp: new Date(),
      status: 'sent',
    })

    // 准备 assistant 消息占位
    const assistantIndex = conversationStore.messages.length
    conversationStore.messages.push({
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'streaming',
    })

    await streamStore.executeStream(enrichedContent, mentions, assistantIndex, conversationStore.messages, {
      onStreamEvent: handleStreamEventForStore,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: () => ({
        context: context.value,
        chatSettings: chatSettingsStore.chatSettings,
        currentSchema: schemaStore.currentSchema,
        currentFlow: schemaStore.currentFlow,
        currentConversationId: conversationStore.currentConversationId,
      }),
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
          onStreamEvent: handleStreamEventForStore,
          onDone: (conversationId) => {
            if (conversationId) conversationStore.loadConversations()
          },
          getContext: () => ({
            context: context.value,
            chatSettings: chatSettingsStore.chatSettings,
            currentSchema: schemaStore.currentSchema,
            currentFlow: schemaStore.currentFlow,
            currentConversationId: conversationStore.currentConversationId,
          }),
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
      onStreamEvent: handleStreamEventForStore,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: () => ({
        context: context.value,
        chatSettings: chatSettingsStore.chatSettings,
        currentSchema: schemaStore.currentSchema,
        currentFlow: schemaStore.currentFlow,
        currentConversationId: conversationStore.currentConversationId,
      }),
    })
  }

  async function respondInterrupt(confirmed: boolean): Promise<void> {
    const interrupt = hitlStore.pendingInterrupt
    if (!interrupt) return

    streamStore.loading = true
    streamStore.error = null
    hitlStore.clearInterrupt()

    await streamStore.executeResume(interrupt.threadId, confirmed, conversationStore.messages, {
      onStreamEvent: handleStreamEventForStore,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: () => ({
        currentConversationId: conversationStore.currentConversationId,
      }),
    })
  }

  async function loadConversation(id: string): Promise<void> {
    conversationStore.clearConversation()
    schemaStore.clearSchemaState()
    hitlStore.clearInterrupt()

    const result = await conversationStore.loadConversation(id)
    if (result.schema) schemaStore.setCurrentSchema(result.schema)
    if (result.flow) schemaStore.setCurrentFlow(result.flow)
    streamStore.error = null
  }

  async function removeConversation(id: string): Promise<void> {
    await conversationStore.removeConversation(id)
    if (conversationStore.currentConversationId === id) {
      clearConversation()
    }
  }

  function clearConversation(): void {
    streamStore.cancelCurrent()
    conversationStore.clearConversation()
    schemaStore.clearSchemaState()
    hitlStore.clearInterrupt()
    workflowModule.resetWorkflowExecutionState()
    streamStore.streamStatus = 'idle'
    streamStore.retryCount = 0
    streamStore.lastMessagePayload = null
    streamStore.error = null
  }

  async function loadConversations(): Promise<void> {
    await conversationStore.loadConversations()
  }

  async function publishCurrent(): Promise<{ id: string; publishId?: string; type: 'schema' | 'flow' } | null> {
    if (!conversationStore.currentConversationId) return null

    const type = schemaStore.currentSchema ? 'schema' : 'flow'
    const payload = schemaStore.currentSchema ?? schemaStore.currentFlow
    if (!payload) return null

    return conversationStore.publishCurrent({ type, data: payload })
  }

  function setContext(ctx: Partial<ChatContext>): void {
    context.value = { ...context.value, ...ctx }
  }

  // ---- 搜索 ----

  async function searchConversationsAction(
    params: string | import('@/api/aiApi').SearchConversationsParams,
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

  // ---- 消息操作 ----

  async function submitFeedback(messageIndex: number, type: FeedbackType): Promise<void> {
    const msg = conversationStore.messages[messageIndex]
    if (!msg) return

    const messageId = msg.id
    if (!messageId) return

    const newFeedback = msg.feedback === type ? null : type
    msg.feedback = newFeedback

    try {
      await submitMessageFeedback(messageId, type)
    } catch {
      msg.feedback = msg.feedback === type ? null : type
    }
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
      onStreamEvent: handleStreamEventForStore,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: () => ({
        context: context.value,
        chatSettings: chatSettingsStore.chatSettings,
        currentSchema: schemaStore.currentSchema,
        currentFlow: schemaStore.currentFlow,
        currentConversationId: conversationStore.currentConversationId,
      }),
    })
  }

  // ---- 需求确认代理方法 ----

  function getRequirementConfirmContext(): RequirementConfirmContext | null {
    return requirementModule.getRequirementConfirmContext()
  }

  return {
    // state（从子 store 代理）
    conversations: computed(() => conversationStore.conversations),
    currentConversationId: computed(() => conversationStore.currentConversationId),
    messages: computed(() => conversationStore.messages),
    activeAgent,
    context,
    loading: computed(() => streamStore.loading),
    currentSchema: computed(() => schemaStore.currentSchema),
    currentFlow: computed(() => schemaStore.currentFlow),
    error: computed(() => streamStore.error),
    taskChain,
    taskChainIndex,
    schemaHistory: computed(() => schemaStore.schemaHistory),
    currentDiff: computed(() => schemaStore.currentDiff),
    currentFlowDiff: computed(() => schemaStore.currentFlowDiff),
    schemaUpdateDescription: computed(() => schemaStore.schemaUpdateDescription),
    versionHistory: computed(() => schemaStore.versionHistory),
    currentVersionIndex: computed(() => schemaStore.currentVersionIndex),
    streamStatus: computed(() => streamStore.streamStatus),
    retryCount: computed(() => streamStore.retryCount),
    llmProviders: computed(() => llmStore.llmProviders),
    llmDefaultProvider: computed(() => llmStore.llmDefaultProvider),
    llmDefaultStrategy: computed(() => llmStore.llmDefaultStrategy),
    llmStrategies: computed(() => llmStore.llmStrategies),
    llmUsage: computed(() => llmStore.llmUsage),
    llmLoading: computed(() => llmStore.llmLoading),
    chatSettings: computed(() => chatSettingsStore.chatSettings),
    selectedAgentWorkflowId: computed(() => chatSettingsStore.chatSettings.agentWorkflowId),
    pendingWorkflowExecutionId: computed(() => workflowModule.state.pendingWorkflowExecutionId.value),
    ragSearchResults: computed(() => ragStore.ragSearchResults),
    ragSearching: computed(() => ragStore.ragSearching),
    ragContext: computed(() => ragStore.ragContext),
    pendingInterrupt: computed(() => hitlStore.pendingInterrupt),
    requirementConfirmContext: computed(() => getRequirementConfirmContext()),
    requirementInputPlaceholder: computed(() =>
      getInputPlaceholder(getRequirementConfirmContext()),
    ),
    isAwaitingRequirementConfirm: computed(
      () => hitlStore.pendingInterrupt?.type === 'requirement_confirm',
    ),

    // getters
    currentConversation: computed(() => conversationStore.currentConversation),
    hasPreview: computed(() => schemaStore.hasPreview),
    canUndoSchema: computed(() => schemaStore.canUndoSchema),
    MAX_AUTO_RETRIES: computed(() => streamStore.MAX_AUTO_RETRIES),

    // actions
    sendMessage,
    retryLastMessage,
    retryToolCall,
    stopGeneration: () => {
      streamStore.stopGeneration()
      workflowModule.stopWorkflowGeneration()
    },
    switchAgent,
    clearConversation,
    loadConversations,
    loadConversation,
    removeConversation,
    publishCurrent,
    setContext,
    setCurrentSchema: (schema: Widget[] | null) => schemaStore.setCurrentSchema(schema),
    setCurrentFlow: (flow: FlowGraph | null) => schemaStore.setCurrentFlow(flow),
    undoLastSchemaUpdate: () => schemaStore.undoLastSchemaUpdate(),
    clearDiff: () => schemaStore.clearDiff(),
    loadVersionHistory: (conversationId: string) => schemaStore.loadVersionHistory(conversationId),
    rollbackToVersion: (conversationId: string, versionId: string) => schemaStore.rollbackToVersion(conversationId, versionId),
    loadLLMProviders: () => llmStore.loadLLMProviders(),
    loadLLMStrategies: () => llmStore.loadLLMStrategies(),
    loadLLMUsage: () => llmStore.loadLLMUsage(),
    switchProvider: (provider: string) => llmStore.switchProvider(provider),
    switchStrategy: (strategy: string | null) => llmStore.switchStrategy(strategy),
    updateChatSettings: (settings: Parameters<typeof chatSettingsStore.updateChatSettings>[0]) => {
      const prevWorkflowId = chatSettingsStore.chatSettings.agentWorkflowId
      chatSettingsStore.updateChatSettings(settings)
      if (
        settings.agentWorkflowId !== undefined
        && settings.agentWorkflowId !== prevWorkflowId
      ) {
        workflowModule.resetWorkflowExecutionState()
      }
    },
    updateAgentWorkflowId: (workflowId: string | null) => {
      if (workflowId !== chatSettingsStore.chatSettings.agentWorkflowId) {
        chatSettingsStore.updateAgentWorkflowId(workflowId)
        workflowModule.resetWorkflowExecutionState()
      }
    },
    loadChatSettings: () => chatSettingsStore.chatSettings,
    searchRagAction: (query: string, limit?: number) => ragStore.searchRagAction(query, limit),
    addRagContext: (item: any) => ragStore.addRagContext(item),
    removeRagContext: (id: string) => ragStore.removeRagContext(id),
    clearRagContext: () => ragStore.clearRagContext(),
    searchConversationsAction,
    mentionSearchAction,
    clearInterrupt: () => hitlStore.clearInterrupt(),
    respondInterrupt,
    submitFeedback,
    regenerateMessage,
    confirmRequirement: (answers: Record<string, string>) => requirementModule.confirmRequirement(answers, handleStreamEventForStore),
    skipRequirement: () => requirementModule.skipRequirement(handleStreamEventForStore),
    submitRequirementAnswer: (rawInput: string, questionId?: string) => requirementModule.submitRequirementAnswer(rawInput, handleStreamEventForStore, questionId),
    answerRequirementOption: (questionId: string, option: string) => requirementModule.answerRequirementOption(questionId, option, handleStreamEventForStore),
  }
})
