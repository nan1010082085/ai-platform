/**
 * 需求分析类型定义
 */

// ---- Requirement Analysis ----

/** 需求分析结果 */
export interface RequirementAnalysis {
  intent: 'create' | 'modify' | 'query' | 'help'
  type: 'form' | 'flow' | 'page' | 'mixed' | 'general'
  complexity: 'simple' | 'medium' | 'complex'
  completeness: {
    score: number
    missing: string[]
    assumptions: string[]
  }
  confirmQuestions: Array<{
    id: string
    question: string
    options?: string[]
    required: boolean
  }>
  suggestedChain: Array<{
    agent: string
    description: string
  }>
}
