/**
 * 评测体系类型定义
 */

// ---- 评测体系 ----

export type JudgeType = 'keyword' | 'regex' | 'llm' | 'semantic'

export interface EvaluationTestcase {
  id: string
  input: string
  expectedOutput?: string
  judgeType: JudgeType
  /** keyword: 逗号分隔关键词；regex: 正则字符串；llm: 评判 prompt */
  judgeConfig: string
}

export interface EvaluationDataset {
  id: string
  name: string
  description: string
  testcases: EvaluationTestcase[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** 评测用例对应的节点执行轨迹 */
export interface EvaluationNodeTraceItem {
  nodeId: string
  nodeType: string
  label?: string
  status: string
  durationMs?: number
  error?: string
}

export interface EvaluationResultItem {
  testcaseId: string
  input: string
  expectedOutput: string
  actualOutput: string
  passed: boolean
  durationMs: number
  tokens: number
  llmScore?: number | null
  error?: string
  executionId?: string
  nodeTrace?: EvaluationNodeTraceItem[]
}

export interface EvaluationRunSummary {
  total: number
  passed: number
  failed: number
  passRate: number
  avgDurationMs: number
  avgTokens: number
  avgLlmScore?: number | null
}

export type EvaluationRunStatus = 'running' | 'completed' | 'failed'

export interface EvaluationRun {
  id: string
  datasetId: string
  datasetName: string
  target: {
    type: 'workflow' | 'agent'
    id: string
    name: string
    version: string
  }
  judgeMethods: JudgeType[]
  status: EvaluationRunStatus
  results: EvaluationResultItem[]
  summary: EvaluationRunSummary
  createdBy: string
  createdAt: string
  updatedAt: string
}
