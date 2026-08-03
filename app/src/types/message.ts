/**
 * 对话消息类型定义
 */

import type { Widget } from './widget'
import type { FlowGraph } from './flow'

export interface ToolCallInfo {
  /** Unique run ID for matching calling/result phases (S4) */
  id?: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
  /** Whether the tool execution failed (S5) */
  error?: string
}

export interface AIMessage {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  /** 消息子类型（如 interrupt 表示 HITL 确认） */
  type?: 'interrupt' | string
  agent?: 'editor' | 'flow' | 'page' | 'general'
  thinking?: string
  thinkingExpanded?: boolean
  tip?: string
  toolCalls?: ToolCallInfo[]
  toolCallsExpanded?: boolean
  schema?: Widget[]
  flow?: FlowGraph
  timestamp: Date
  /** 消息状态（用于实时同步） */
  status?: MessageStatus
  /** 消息反馈状态 */
  feedback?: 'positive' | 'negative' | null
  /** 附加数据（如 interrupt 的确认信息） */
  extra?: Record<string, unknown>
  /** 文档附件列表 */
  attachments?: MessageDocumentAttachment[]
  /** 文档摘要列表 */
  documentSummaries?: MessageDocumentSummary[]
}

export interface WorkflowMessageExecution {
  executionId: string
  workflowId: string
  workflowName: string
  status: string
  nodeRecords?: Array<{
    nodeId: string
    nodeName: string
    nodeType: string
    status: string
    startedAt?: string
    finishedAt?: string
    durationMs?: number
  }>
  durationMs?: number
  error?: string
}

export type MessageStatus = 'sending' | 'sent' | 'streaming' | 'received' | 'error'

export interface MessageDocumentAttachment {
  documentId: string
  filename: string
  mimetype: string
  size?: number
}

export interface MessageDocumentSummary {
  documentId: string
  filename: string
  summary: string
  pageCount?: number
}
