/**
 * 流式事件类型定义
 */

// ---- 流式连接状态 ----

export type StreamConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

// ---- 流式事件 ----

export type StreamEventType =
  // 基础消息流
  | 'message_start'
  | 'message_delta'
  | 'message_end'
  | 'text_delta'
  | 'thinking_start'
  | 'thinking_delta'
  | 'thinking_end'
  // 工具调用
  | 'tool_call_start'
  | 'tool_call_delta'
  | 'tool_call_end'
  | 'tool_result'
  | 'tool_error'
  // Schema 生成
  | 'schema_start'
  | 'schema_progress'
  | 'schema_complete'
  | 'schema_update'
  | 'schema_diff'
  // Flow 生成
  | 'flow_start'
  | 'flow_progress'
  | 'flow_complete'
  | 'flow_update'
  | 'flow_diff'
  // 任务链
  | 'chain_start'
  | 'chain_step'
  | 'chain_complete'
  // Agent 协作
  | 'agent_switch'
  // 需求分析
  | 'requirement_analysis_start'
  | 'requirement_analysis_complete'
  | 'requirement_confirm_response'
  // 任务规划
  | 'task_plan_start'
  | 'task_plan_complete'
  | 'task_progress'
  // 思考推理
  | 'thinker_start'
  | 'thinker_complete'
  // 质量检查
  | 'quality_check_start'
  | 'quality_check_complete'
  // 文档摘要
  | 'document_summaries'
  // 状态
  | 'error'
  | 'done'
  | 'interrupt'

export interface StreamEvent {
  type: StreamEventType
  data?: unknown
  /** 事件 ID（用于断线重连） */
  id?: string
  /** 错误信息 */
  error?: string
  /** 工具调用信息 */
  toolCall?: {
    id?: string
    name: string
    arguments?: Record<string, unknown>
    result?: unknown
    error?: string
  }
  /** Schema 更新 */
  schema?: unknown[]
  /** Flow 更新 */
  flow?: unknown
  /** 消息内容增量 */
  delta?: string
  /** 思考内容增量 */
  thinkingDelta?: string
}
