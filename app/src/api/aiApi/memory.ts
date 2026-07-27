/**
 * Memory API：长程记忆检索、写入、管理（跨会话，按 userId 隔离）
 *
 * 与 RAG 的区别：RAG 检索知识文档（schema/flow/document）；
 * Memory 检索用户偏好/事实/事件/技能（跨会话沉淀的个性化记忆）。
 */
import { request } from './base'

export type MemoryNamespace = 'preference' | 'fact' | 'event' | 'skill'

export interface MemoryItem {
  id: string
  userId: string
  namespace: MemoryNamespace
  content: string
  importance: number
  lastAccessedAt: string
  accessCount: number
  source?: {
    conversationId?: string
    messageId?: string
    workflowId?: string
    nodeId?: string
  }
  supersededBy?: string | null
  createdAt: string
  updatedAt: string
}

export interface MemoryRecallParams {
  query: string
  userId?: string
  namespace?: 'all' | MemoryNamespace
  limit?: number
}

export interface MemoryWriteParams {
  content: string
  userId?: string
  namespace: MemoryNamespace
  importance?: number
  source?: MemoryItem['source']
}

/** 检索用户长程记忆（语义 top-k） */
export async function recallMemory(params: MemoryRecallParams): Promise<MemoryItem[]> {
  return request<MemoryItem[]>('/ai/memory/recall', {
    method: 'POST',
    body: {
      query: params.query,
      userId: params.userId,
      namespace: params.namespace ?? 'all',
      limit: params.limit ?? 5,
    },
  })
}

/** 写入一条长程记忆 */
export async function writeMemory(params: MemoryWriteParams): Promise<MemoryItem> {
  return request<MemoryItem>('/ai/memory', {
    method: 'POST',
    body: {
      content: params.content,
      userId: params.userId,
      namespace: params.namespace,
      importance: params.importance ?? 0.5,
      source: params.source,
    },
  })
}

/** 列出用户全部记忆（管理用） */
export async function listMemory(userId: string): Promise<MemoryItem[]> {
  const query = new URLSearchParams({ userId })
  return request<MemoryItem[]>(`/ai/memory?${query.toString()}`)
}

/** 删除一条记忆 */
export async function deleteMemory(id: string): Promise<{ id: string; deleted: boolean }> {
  return request<{ id: string; deleted: boolean }>(`/ai/memory/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
