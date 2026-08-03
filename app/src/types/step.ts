/**
 * Step Card 类型定义
 */

import type { RequirementAnalysis } from './requirement'
import type { ActionProposal } from './proposal'
import type { ImageGenerateResult, PptGenerateResult } from './generation'

// ---- Step Card ----

export type StepType = 'thinking' | 'tool_call' | 'tool_error' | 'result' | 'text' | 'code' | 'requirement_confirm' | 'action_proposal' | 'image_generate' | 'ppt_generate' | 'artifact' | 'sub_workflow' | 'agent_handoff' | 'cost_usage' | 'approval_gate' | 'variable_change' | 'error_recovery'

export type StepStatus = 'pending' | 'running' | 'done' | 'error'

export interface StepData {
  type: StepType
  title: string
  content?: string
  status: StepStatus
  /** 工具名称（tool_call / tool_error 类型） */
  toolName?: string
  /** 工具显示名称（中文） */
  toolDisplayName?: string
  /** 工具调用结果 */
  toolResult?: unknown
  /** 工具调用参数 */
  toolArguments?: Record<string, unknown>
  /** 错误信息 */
  error?: string
  /** 工具调用在 toolCalls 数组中的索引（用于重试） */
  toolCallIndex?: number
  /** artifact 类型（type === 'artifact'） */
  artifactType?: 'code' | 'json' | 'html' | 'form'
  /** artifact 语言（code/json/html） */
  artifactLanguage?: string
  /** 嵌入的卡片类型：schema 或 flow */
  cardType?: 'schema' | 'flow'
  /** 卡片标题 */
  cardTitle?: string
  /** 卡片操作标签 */
  primaryAction?: string
  secondaryAction?: string
  /** 步骤时间戳 */
  timestamp?: Date
  /** 智能体类型 */
  agent?: 'editor' | 'flow' | 'page' | 'auto' | 'general'
  /** 需求分析结果（requirement_confirm 类型） */
  requirementAnalysis?: RequirementAnalysis
  /** 已收集的部分答案 */
  requirementPartialAnswers?: Record<string, string>
  /** 当前待回答问题 id */
  requirementNextQuestionId?: string | null
  /** 是否等待用户确认（requirement_confirm 类型） */
  waitingConfirmation?: boolean
  /** 行动方案数据（action_proposal 类型） */
  actionProposal?: ActionProposal
  /** 图片生成数据（image_generate 类型） */
  imageGenerateData?: ImageGenerateResult
  /** PPT 生成数据（ppt_generate 类型） */
  pptGenerateData?: PptGenerateResult
  /** 工作流执行数据（workflow_execution 类型） */
  workflowExecution?: unknown
  /** 子工作流数据（sub_workflow 类型） */
  subWorkflowData?: {
    workflowName?: string
    executionId?: string
    status?: string
    durationMs?: number
    error?: string
    nodeCount?: number
    completedNodes?: number
  }
  /** 智能体切换数据（agent_handoff 类型） */
  handoffData?: {
    sourceAgent?: string
    targetAgent?: string
    reason?: string
    timestamp?: Date
  }
  /** Token 消耗数据（cost_usage 类型） */
  costData?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    estimatedCost?: number
    model?: string
    provider?: string
  }
  /** 审批数据（approval_gate 类型） */
  approvalData?: {
    title?: string
    description?: string
    questions?: Array<{
      id: string
      question: string
      options?: string[]
      required?: boolean
    }>
    status?: 'waiting' | 'approved' | 'rejected'
    selectedAnswers?: Record<string, string>
  }
  /** 变量变更数据（variable_change 类型） */
  variableChangeData?: {
    changes?: Array<{
      type: 'add' | 'update' | 'delete'
      name: string
      oldValue?: unknown
      newValue?: unknown
    }>
    nodeId?: string
    nodeName?: string
  }
  /** 错误恢复数据（error_recovery 类型） */
  errorRecoveryData?: {
    error?: string
    nodeId?: string
    nodeName?: string
    nodeType?: string
    strategies?: string[]
    selectedStrategy?: string | null
    retryCount?: number
    maxRetries?: number
  }
}
