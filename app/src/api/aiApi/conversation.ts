/**
 * 对话管理 API：CRUD、发布、搜索、导出、版本历史、消息反馈
 */
import type {
  PublishRequest,
  PublishResponse,
  Conversation,
} from '@/types'
import { request } from './base'
import { requestBlob, triggerBlobDownload } from '@/api/shared/blobRequest'

export type ExportFormat = 'json' | 'markdown' | 'html'

export async function getConversations(): Promise<Conversation[]> {
  const response = await request<{ items: Conversation[]; total: number; page: number; pageSize: number; totalPages: number }>('/ai/conversations')
  return response.items
}

export async function getConversationDetail(id: string): Promise<Conversation & { messages: Array<{ role: string; content: string; thinking?: string; tip?: string; schema?: unknown[]; flow?: unknown; timestamp: string }> }> {
  return request(`/ai/conversations/${encodeURIComponent(id)}`)
}

export async function deleteConversation(id: string): Promise<void> {
  await request<void>(`/ai/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function publish(payload: PublishRequest): Promise<PublishResponse> {
  return request<PublishResponse>('/ai/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function downloadConversation(id: string, format: ExportFormat): Promise<void> {
  const blob = await requestBlob(
    `/ai/collaboration/conversations/${encodeURIComponent(id)}/export?format=${format}`,
  )
  triggerBlobDownload(blob, `conversation-${id}.${format === 'markdown' ? 'md' : format}`)
}

export interface SearchConversationsParams {
  keyword?: string
  startDate?: string
  endDate?: string
  source?: string
  page?: number
  pageSize?: number
}

export interface SearchResult {
  conversations: Conversation[]
  total: number
  page: number
  pageSize: number
}

export async function searchConversations(params: SearchConversationsParams): Promise<SearchResult> {
  const query = new URLSearchParams()
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.startDate) query.set('startDate', params.startDate)
  if (params.endDate) query.set('endDate', params.endDate)
  if (params.source) query.set('source', params.source)
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.pageSize !== undefined) query.set('pageSize', String(params.pageSize))

  const qs = query.toString()
  return request<SearchResult>(`/ai/conversations/search${qs ? `?${qs}` : ''}`)
}

// ---- 版本历史 ----

export interface VersionEntry {
  id: string
  version: number
  type: 'schema' | 'flow'
  description?: string
  createdAt: string
}

export interface VersionDetail extends VersionEntry {
  conversationId: string
  content: Record<string, unknown>[] | Record<string, unknown>
}

export interface RollbackResult {
  id: string
  version: number
  type: 'schema' | 'flow'
  content: Record<string, unknown>[] | Record<string, unknown>
  description?: string
  rollbackFrom: string
}

export async function getVersions(conversationId: string): Promise<VersionEntry[]> {
  return request<VersionEntry[]>(`/ai/conversations/${encodeURIComponent(conversationId)}/versions`)
}

export async function getVersion(versionId: string): Promise<VersionDetail> {
  return request<VersionDetail>(`/ai/versions/${encodeURIComponent(versionId)}`)
}

export async function rollbackVersion(conversationId: string, versionId: string): Promise<RollbackResult> {
  return request<RollbackResult>(`/ai/conversations/${encodeURIComponent(conversationId)}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ versionId }),
  })
}

// ---- 消息反馈 ----

export type FeedbackType = 'positive' | 'negative'

export interface MessageFeedback {
  feedback: FeedbackType
  comment?: string
}

export async function submitMessageFeedback(
  messageId: string,
  feedback: FeedbackType,
  comment?: string,
): Promise<void> {
  await request<void>(`/ai/messages/${encodeURIComponent(messageId)}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback, comment }),
  })
}
