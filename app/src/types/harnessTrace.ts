/**
 * DSH 会话轨迹读模型（platform.nodeTrace 投影的协议类型）。
 *
 * 与 harness 的 trajectory-forward 插件（zod schema）一一对应；
 * 事件映射见 ai/docs/design/dsh-cordis-integration.md §5.8。
 *
 * 字段约定：可选字段恒存在，未发生时为 null（对齐 zod nullable 语义）。
 * 放置说明（M0）：本类型当前唯一消费者是 ai/app 前端，暂放本地；
 * 正式化时迁移到 shared/platform-shared/ai（跨项目，需立项确认）。
 */

export interface AgentNodeTraceTurn {
  turn: number
  startSeq: number
  endSeq: number | null
  endReason: string | null
}

export interface AgentNodeTraceToolCall {
  callId: string
  turn: number
  step: number
  name: string
  /** 模型原始 JSON 字符串参数（未解析） */
  arguments: string
  callSeq: number
  resultSeq: number | null
  isError: boolean | null
}

export interface AgentNodeTraceMessage {
  turn: number
  step: number
  text: string
}

export interface AgentNodeTrace {
  turns: AgentNodeTraceTurn[]
  toolCalls: AgentNodeTraceToolCall[]
  messages: AgentNodeTraceMessage[]
}

/** GET /session/:id/trace 响应 */
export interface HarnessTraceResponse {
  sessionId: string
  asOfSeq: number
  trace: AgentNodeTrace | null
}
