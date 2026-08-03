/**
 * 流式事件类型定义
 */

// ---- 流式连接状态 ----

export type StreamConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

// ---- 流式事件 ----

export type StreamEventType =
  | 'message_start'
  | 'message_delta'
  | 'message_end'
  | 'thinking_start'
  | 'thinking_delta'
  | 'thinking_end'
  | 'tool_call_start'
  | 'tool_call_delta'
  | 'tool_call_end'
  | 'tool_result'
  | 'schema_update'
  | 'flow_update'
  | 'error'
  | 'done'

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
