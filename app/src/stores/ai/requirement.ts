/**
 * 需求确认渐进式作答流程
 *
 * 职责：HITL 需求确认、渐进式回答、跳过/确认提交
 */

import type { AIMessage, StreamEvent, RequirementAnalysis } from '@/types'
import { message } from '@schema-platform/platform-shared/utils/message'
import {
  buildRequirementContext,
  isAllRequiredAnswered,
  resolveAnswerForQuestion,
  getInputPlaceholder,
  type RequirementConfirmContext,
} from '@/utils/requirementConfirmFlow'

/** handleStreamEvent 回调类型 */
type StreamEventHandler = (event: StreamEvent, assistantIndex: number) => void

/** 需求确认模块所需的外部依赖 */
export interface RequirementDeps {
  conversationStore: {
    messages: AIMessage[]
    currentConversationId: string | null
    loadConversations: () => Promise<void>
  }
  hitlStore: {
    pendingInterrupt: import('@/types').PendingInterrupt | null
    clearInterrupt: () => void
  }
  streamStore: {
    loading: boolean
    error: string | null
    executeResume: (
      threadId: string,
      resumeValue: boolean | Record<string, unknown>,
      messages: AIMessage[],
      handlers: {
        onStreamEvent: StreamEventHandler
        onDone: (conversationId?: string) => void
        getContext: () => { currentConversationId: string | null }
      },
    ) => Promise<void>
  }
}

export function createRequirementModule(deps: RequirementDeps) {
  const { conversationStore, hitlStore, streamStore } = deps

  function findRequirementConfirmToolCall(): {
    msgIndex: number
    toolIndex: number
    result: Record<string, unknown>
  } | null {
    for (let i = conversationStore.messages.length - 1; i >= 0; i--) {
      const msg = conversationStore.messages[i]
      if (msg.role !== 'assistant' || !msg.toolCalls) continue
      const toolIndex = msg.toolCalls.findIndex((tc) => tc.name === 'requirement_confirm')
      if (toolIndex < 0) continue
      const result = msg.toolCalls[toolIndex].result as Record<string, unknown> | undefined
      if (!result?.analysis) continue
      if (result.waitingConfirmation === false) continue
      return { msgIndex: i, toolIndex, result }
    }
    return null
  }

  function getRequirementConfirmContext(): RequirementConfirmContext | null {
    if (hitlStore.pendingInterrupt?.type !== 'requirement_confirm') return null
    const found = findRequirementConfirmToolCall()
    const analysis = (found?.result.analysis ?? (hitlStore.pendingInterrupt.data as Record<string, unknown> | undefined)?.analysis) as RequirementAnalysis | undefined
    if (!analysis) return null
    const partialAnswers = (found?.result.partialAnswers ?? {}) as Record<string, string>
    return buildRequirementContext(analysis, partialAnswers)
  }

  function syncRequirementPartialAnswers(partialAnswers: Record<string, string>): void {
    const found = findRequirementConfirmToolCall()
    if (!found) return
    const msg = conversationStore.messages[found.msgIndex]
    if (!msg.toolCalls) return
    const newToolCalls = [...msg.toolCalls]
    newToolCalls[found.toolIndex] = {
      ...newToolCalls[found.toolIndex],
      result: {
        ...found.result,
        partialAnswers,
        waitingConfirmation: true,
      },
    }
    msg.toolCalls = newToolCalls
  }

  function markRequirementConfirmResolved(
    skipped: boolean,
    answers?: Record<string, string>,
  ): void {
    const found = findRequirementConfirmToolCall()
    if (!found) return

    const msg = conversationStore.messages[found.msgIndex]
    if (!msg.toolCalls) return

    const newToolCalls = [...msg.toolCalls]
    newToolCalls[found.toolIndex] = {
      ...newToolCalls[found.toolIndex],
      result: {
        ...found.result,
        waitingConfirmation: false,
        partialAnswers: answers ?? found.result.partialAnswers,
        ...(skipped ? { skipped: true } : { userAnswers: answers }),
      },
    }
    msg.toolCalls = newToolCalls
  }

  /** 渐进式提交单条答案：输入框发送或卡片点选 */
  async function submitRequirementAnswer(
    rawInput: string,
    handleStreamEvent: StreamEventHandler,
    questionId?: string,
  ): Promise<void> {
    const ctx = getRequirementConfirmContext()
    if (!ctx) {
      message.error('当前没有待确认的需求')
      return
    }

    const question = questionId
      ? ctx.analysis.confirmQuestions.find((q) => q.id === questionId)
      : ctx.nextQuestion

    if (!question) {
      if (ctx.allRequiredAnswered) {
        await confirmRequirement(ctx.partialAnswers, handleStreamEvent)
        return
      }
      message.warning('请先回答上方待确认的问题')
      return
    }

    const value = resolveAnswerForQuestion(question, rawInput)
    if (!value) {
      message.warning('请输入有效回答')
      return
    }

    const mergedAnswers = { ...ctx.partialAnswers, [question.id]: value }
    syncRequirementPartialAnswers(mergedAnswers)

    conversationStore.messages.push({
      role: 'user',
      content: value,
      timestamp: new Date(),
      status: 'sent',
    })

    if (isAllRequiredAnswered(ctx.analysis, mergedAnswers)) {
      await confirmRequirement(mergedAnswers, handleStreamEvent)
    }
  }

  async function answerRequirementOption(
    questionId: string,
    option: string,
    handleStreamEvent: StreamEventHandler,
  ): Promise<void> {
    await submitRequirementAnswer(option, handleStreamEvent, questionId)
  }

  async function confirmRequirement(
    answers: Record<string, string>,
    handleStreamEvent: StreamEventHandler,
  ): Promise<void> {
    const threadId = hitlStore.pendingInterrupt?.threadId
      ?? conversationStore.currentConversationId
    if (!threadId) {
      message.error('会话尚未就绪，请稍候再试')
      return
    }

    markRequirementConfirmResolved(false, answers)
    hitlStore.clearInterrupt()

    await streamStore.executeResume(threadId, { answers }, conversationStore.messages, {
      onStreamEvent: handleStreamEvent,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: () => ({
        currentConversationId: conversationStore.currentConversationId,
      }),
    })
  }

  async function skipRequirement(handleStreamEvent: StreamEventHandler): Promise<void> {
    const threadId = hitlStore.pendingInterrupt?.threadId
      ?? conversationStore.currentConversationId
    if (!threadId) {
      message.error('会话尚未就绪，请稍候再试')
      return
    }

    markRequirementConfirmResolved(true)
    hitlStore.clearInterrupt()

    await streamStore.executeResume(threadId, { skipped: true }, conversationStore.messages, {
      onStreamEvent: handleStreamEvent,
      onDone: (conversationId) => {
        if (conversationId) conversationStore.loadConversations()
      },
      getContext: () => ({
        currentConversationId: conversationStore.currentConversationId,
      }),
    })
  }

  return {
    getRequirementConfirmContext,
    submitRequirementAnswer,
    answerRequirementOption,
    confirmRequirement,
    skipRequirement,
    getInputPlaceholder,
  }
}
