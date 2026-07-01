import { describe, it, expect } from 'vitest'
import {
  buildRequirementContext,
  resolveAnswerForQuestion,
  isAllRequiredAnswered,
} from '@/utils/requirementConfirmFlow'
import type { RequirementAnalysis } from '@/types'

const analysis: RequirementAnalysis = {
  intent: 'create',
  type: 'form',
  complexity: 'medium',
  completeness: { score: 60, missing: [], assumptions: [] },
  confirmQuestions: [
    { id: 'q1', question: '字段？', required: true },
    { id: 'q2', question: '布局？', options: ['单列', '双列'], required: true },
  ],
  suggestedChain: [],
}

describe('requirementConfirmFlow', () => {
  it('returns next required question first', () => {
    const ctx = buildRequirementContext(analysis, {})
    expect(ctx.nextQuestion?.id).toBe('q1')
    expect(ctx.allRequiredAnswered).toBe(false)
  })

  it('resolves option by index', () => {
    const q = analysis.confirmQuestions[1]
    expect(resolveAnswerForQuestion(q, '2')).toBe('双列')
  })

  it('detects all required answered', () => {
    const partial = { q1: '姓名', q2: '单列' }
    expect(isAllRequiredAnswered(analysis, partial)).toBe(true)
  })
})
