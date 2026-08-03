/**
 * AI 应用类型定义
 *
 * 对齐后端 AIConversationState 和 API 响应结构。
 * 按域拆分到独立文件，此文件统一导出。
 */

import type { AgentExecutionStatus, AgentNodeRecord } from '@/types/agentWorkflow'

// ---- 按域拆分的类型导出 ----

export * from './widget'
export * from './flow'
export * from './message'
export * from './chat'
export * from './stream'
export * from './requirement'
export * from './proposal'
export * from './generation'
export * from './step'
export * from './rag'
export * from './evaluation'
export * from './monitor'

// ---- 任务链 ----

export interface TaskChainStep {
  agent: string
  description: string
  status?: 'pending' | 'running' | 'done' | 'error'
}

// ---- Diff ----

export interface SchemaDiffEntry {
  type: 'add' | 'remove' | 'modify'
  path: string
  oldValue?: unknown
  newValue?: unknown
}

export interface SchemaDiff {
  entries: SchemaDiffEntry[]
  summary: string
}

export interface FlowDiffEntry {
  type: 'add' | 'remove' | 'modify'
  elementId: string
  elementType: string
  oldValue?: unknown
  newValue?: unknown
}

export interface FlowDiff {
  entries: FlowDiffEntry[]
  summary: string
}

// ---- 版本历史 ----

export interface VersionEntry {
  id: string
  version: number
  description?: string
  createdBy: string
  createdAt: string
}

// ---- 发布 ----

export interface PublishRequest {
  schemaId?: string
  flowId?: string
  version?: number
  description?: string
}

export interface PublishResponse {
  success: boolean
  version: number
  message?: string
}

// ---- 对话列表 ----

export interface Conversation {
  id: string
  title: string
  lastMessage?: string
  lastMessageAt?: string
  messageCount: number
  createdAt: string
}

// ---- HITL Interrupt ----

/** 前端 pending interrupt 状态 */
export interface PendingInterrupt {
  threadId: string
  type: string
  message: string
  data?: unknown
}

// ---- Agent ----

export type AgentType = 'editor' | 'flow' | 'page' | 'auto' | 'general'

// ---- AI 版本 ----

export interface AIVersion {
  id: string
  version: number
  type: 'schema' | 'flow'
  description?: string
  messageId: string
  createdAt: string
}

// ---- 附件 ----

export interface Attachment {
  documentId?: string
  filename: string
  mimetype: string
  size: number
  text: string
  excerpt?: string
  previewText?: string
  status: 'uploading' | 'done' | 'error'
  error?: string
}

// ---- 文档摘要 ----

export interface StructuredSummary {
  title: string
  summary: string
  keyPoints: string[]
  sections: Array<{ heading: string; content: string }>
  entities?: string[]
  generatedAt: string
}
