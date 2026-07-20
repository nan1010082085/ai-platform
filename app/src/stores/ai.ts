/**
 * AI 对话状态管理（主 Orchestrator Store）
 *
 * 组合子 store 和子模块，暴露统一接口。
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  AgentType,
  ChatContext,
  Widget,
  FlowGraph,
  MentionReference,
} from '@/types'
import { handleStreamEvent } from './ai/events'
import { createWorkflowModule } from './ai/workflow'
import { createRequirementModule } from './ai/requirement'
import { createAiActions } from './ai/actions'

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
  const conversationStore = useConversationStore()
  const streamStore = useStreamStore()
  const schemaStore = useSchemaStore()
  const llmStore = useLLMStore()
  const ragStore = useRAGStore()
  const chatSettingsStore = useChatSettingsStore()
  const hitlStore = useHITLStore()

  const activeAgent = ref<AgentType>('auto')
  const context = ref<ChatContext>({ source: 'standalone' })
  const taskChain = ref<import('@/types').TaskChainStep[]>([])
  const taskChainIndex = ref(0)

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

  const actions = createAiActions({
    stores: {
      conversationStore,
      streamStore,
      schemaStore,
      ragStore,
      chatSettingsStore,
      hitlStore,
    },
    activeAgent,
    context,
    handleStreamEvent: handleStreamEventForStore,
    workflowModule,
    requirementModule,
  })

  function switchAgent(agent: AgentType): void {
    activeAgent.value = agent
    context.value.source = agent === 'auto' ? 'standalone' : (agent as 'editor' | 'flow')
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

  function getRequirementConfirmContext(): RequirementConfirmContext | null {
    return requirementModule.getRequirementConfirmContext()
  }

  return {
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

    currentConversation: computed(() => conversationStore.currentConversation),
    hasPreview: computed(() => schemaStore.hasPreview),
    canUndoSchema: computed(() => schemaStore.canUndoSchema),
    MAX_AUTO_RETRIES: computed(() => streamStore.MAX_AUTO_RETRIES),

    sendMessage: actions.sendMessage,
    retryLastMessage: actions.retryLastMessage,
    retryToolCall: actions.retryToolCall,
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
    searchConversationsAction: actions.searchConversationsAction,
    mentionSearchAction: actions.mentionSearchAction,
    clearInterrupt: () => hitlStore.clearInterrupt(),
    respondInterrupt,
    submitFeedback: actions.submitFeedback,
    regenerateMessage: actions.regenerateMessage,
    confirmRequirement: (answers: Record<string, string>) => requirementModule.confirmRequirement(answers, handleStreamEventForStore),
    skipRequirement: () => requirementModule.skipRequirement(handleStreamEventForStore),
    submitRequirementAnswer: (rawInput: string, questionId?: string) => requirementModule.submitRequirementAnswer(rawInput, handleStreamEventForStore, questionId),
    answerRequirementOption: (questionId: string, option: string) => requirementModule.answerRequirementOption(questionId, option, handleStreamEventForStore),
  }
})
