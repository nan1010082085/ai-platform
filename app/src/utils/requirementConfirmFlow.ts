/**
 * Chat 需求确认渐进式作答流程
 *
 * 用户在底部输入框或卡片选项逐条回答，必填项完成后自动 resume，无需二次点击「确认」。
 */

import type { RequirementAnalysis } from '@/types'

export interface RequirementConfirmContext {
  analysis: RequirementAnalysis
  partialAnswers: Record<string, string>
  /** 下一个待回答的问题（优先必填） */
  nextQuestion: RequirementAnalysis['confirmQuestions'][number] | null
  /** 必填是否已全部回答 */
  allRequiredAnswered: boolean
}

export function getUnansweredQuestions(
  analysis: RequirementAnalysis,
  partialAnswers: Record<string, string>,
  requiredOnly = false,
): RequirementAnalysis['confirmQuestions'] {
  return analysis.confirmQuestions.filter((q) => {
    if (requiredOnly && !q.required) return false
    return !partialAnswers[q.id]?.trim()
  })
}

export function getNextQuestion(
  analysis: RequirementAnalysis,
  partialAnswers: Record<string, string>,
): RequirementAnalysis['confirmQuestions'][number] | null {
  const requiredPending = getUnansweredQuestions(analysis, partialAnswers, true)
  if (requiredPending.length > 0) return requiredPending[0]
  const optionalPending = getUnansweredQuestions(analysis, partialAnswers, false)
    .filter((q) => !q.required)
  return optionalPending[0] ?? null
}

export function isAllRequiredAnswered(
  analysis: RequirementAnalysis,
  partialAnswers: Record<string, string>,
): boolean {
  return getUnansweredQuestions(analysis, partialAnswers, true).length === 0
}

export function buildRequirementContext(
  analysis: RequirementAnalysis,
  partialAnswers: Record<string, string>,
): RequirementConfirmContext {
  return {
    analysis,
    partialAnswers,
    nextQuestion: getNextQuestion(analysis, partialAnswers),
    allRequiredAnswered: isAllRequiredAnswered(analysis, partialAnswers),
  }
}

/** 将用户输入匹配到选项或自由文本 */
export function resolveAnswerForQuestion(
  question: RequirementAnalysis['confirmQuestions'][number],
  rawInput: string,
): string {
  const trimmed = rawInput.trim()
  if (!trimmed) return ''

  if (question.options?.length) {
    const byIndex = trimmed.match(/^(\d+)$/)
    if (byIndex) {
      const idx = Number(byIndex[1]) - 1
      if (idx >= 0 && idx < question.options.length) {
        return question.options[idx]
      }
    }
    const exact = question.options.find((o) => o === trimmed)
    if (exact) return exact
    const fuzzy = question.options.find((o) => o.includes(trimmed) || trimmed.includes(o))
    if (fuzzy) return fuzzy
  }

  return trimmed
}

export function getInputPlaceholder(ctx: RequirementConfirmContext | null): string {
  if (!ctx?.nextQuestion) {
    return ctx?.allRequiredAnswered ? '补充说明后发送，或直接发送继续执行…' : '继续描述…'
  }
  const q = ctx.nextQuestion
  if (q.options?.length) {
    return `回复：${q.question}（可输入序号 1-${q.options.length} 或选项文字）`
  }
  return `回复：${q.question}`
}
