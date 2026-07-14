/**
 * 工作流执行管理
 *
 * 职责：Workflow 消息发送、执行状态轮询、HITL 审批
 */

import type { AIMessage, MessageDocumentAttachment } from '@/types'
import { message } from '@schema-platform/platform-shared/utils/message'
import { isWorkflowHitlApprovalMessage, extractWorkflowStreamingText } from '@/utils/workflowChatResponse'
import { buildWorkflowMessageExecution } from '@/utils/workflowMessageExecution'
import { runWorkflowChatTurn } from '@/composables/useWorkflowChatExecution'
import { connect, isConnected } from '@schema-platform/platform-shared/socket'
import { cancelExecution } from '@/api/agentWorkflowApi'

/** 工作流执行状态（ref 对象） */
export interface WorkflowExecutionState {
  lastWorkflowExecutionId: { value: string | null }
  pendingWorkflowExecutionId: { value: string | null }
  activeWorkflowExecutionId: { value: string | null }
  workflowPollAborted: boolean
}

/** sendWorkflowMessage 所需的外部依赖 */
export interface WorkflowDeps {
  chatSettingsStore: {
    chatSettings: { agentWorkflowId: string | null }
  }
  streamStore: {
    loading: boolean
    error: string | null
  }
  ragStore: {
    getRagContextContent: () => string
  }
  conversationStore: {
    messages: AIMessage[]
    currentConversationId: string | null
    loadConversations: () => Promise<void>
  }
}

export function createWorkflowModule(state: WorkflowExecutionState) {
  function resetWorkflowExecutionState(): void {
    state.lastWorkflowExecutionId.value = null
    state.pendingWorkflowExecutionId.value = null
    state.activeWorkflowExecutionId.value = null
    state.workflowPollAborted = false
  }

  async function sendWorkflowMessage(
    content: string,
    deps: WorkflowDeps,
    attachments?: MessageDocumentAttachment[],
  ): Promise<void> {
    const { chatSettingsStore, streamStore, ragStore, conversationStore } = deps
    const workflowId = chatSettingsStore.chatSettings.agentWorkflowId
    if (!workflowId) return

    state.workflowPollAborted = false
    if (!isConnected()) connect()
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

    try {
      const hitlDecision = state.pendingWorkflowExecutionId.value
        ? isWorkflowHitlApprovalMessage(content)
        : null

      const result = await runWorkflowChatTurn({
        workflowId,
        message: enrichedContent,
        attachments,
        lastExecutionId: state.pendingWorkflowExecutionId.value ? null : state.lastWorkflowExecutionId.value,
        pendingExecutionId: state.pendingWorkflowExecutionId.value,
        hitlApproved: hitlDecision === null ? true : hitlDecision,
        isAborted: () => state.workflowPollAborted,
        onExecutionStarted: (id) => {
          state.activeWorkflowExecutionId.value = id
        },
        onProgress: (execution) => {
          if (state.workflowPollAborted) return
          conversationStore.messages[assistantIndex].workflowExecution =
            buildWorkflowMessageExecution(execution)
          const partial = extractWorkflowStreamingText(execution)
          if (partial != null) {
            conversationStore.messages[assistantIndex].content = partial
          }
        },
      })

      if (state.workflowPollAborted) {
        conversationStore.messages[assistantIndex].content = '已停止生成'
        conversationStore.messages[assistantIndex].status = 'received'
        return
      }

      state.lastWorkflowExecutionId.value = result.lastExecutionId
      state.pendingWorkflowExecutionId.value = result.pendingExecutionId
      conversationStore.messages[assistantIndex].workflowExecution =
        buildWorkflowMessageExecution(result.execution)
      conversationStore.messages[assistantIndex].content = result.responseText
      conversationStore.messages[assistantIndex].status = 'received'
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '工作流执行失败'
      streamStore.error = errorMessage
      conversationStore.messages[assistantIndex].content = errorMessage
      conversationStore.messages[assistantIndex].status = 'error'
      message.error(errorMessage)
    } finally {
      state.activeWorkflowExecutionId.value = null
      streamStore.loading = false
    }
  }

  function stopWorkflowGeneration(): void {
    state.workflowPollAborted = true
    const execId = state.activeWorkflowExecutionId.value
    if (execId) {
      void cancelExecution(execId).catch(() => {})
    }
  }

  return {
    state,
    resetWorkflowExecutionState,
    sendWorkflowMessage,
    stopWorkflowGeneration,
  }
}
