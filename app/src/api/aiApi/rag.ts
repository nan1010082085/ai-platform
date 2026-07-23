/**
 * RAG API：语义搜索、知识库管理、mention 搜索
 */
import type { RagSearchResponse } from '@/types'
import { request } from './base'
import { uploadBlob } from '@/api/shared/blobRequest'

export interface RagSearchParams {
  query: string
  limit?: number
  type?: 'form' | 'search_list'
}

export async function searchRag(params: RagSearchParams): Promise<RagSearchResponse> {
  const query = new URLSearchParams()
  query.set('query', params.query)
  if (params.limit !== undefined) query.set('limit', String(params.limit))
  if (params.type) query.set('type', params.type)

  return request<RagSearchResponse>(`/ai/rag/search?${query.toString()}`)
}

// ---- Mention Search ----

export type MentionType = 'schema' | 'flow' | 'widget'

export interface MentionSearchResult {
  id: string
  type: MentionType
  name: string
  description?: string
  updatedAt?: string
}

/**
 * Search schemas, flows, or widgets for @mention autocomplete.
 */
export async function mentionSearch(
  query: string,
  type: MentionType,
  limit = 10,
): Promise<MentionSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  return request<MentionSearchResult[]>(`/ai/mention/search/${type}?${params}`)
}

// ---- RAG Knowledge Base Management ----

export interface RagStatusData {
  embeddingConfigured: boolean
  autoIndexEnabled: boolean
  totalSchemas: number
  totalFlows: number
  totalEmbeddings: number
  indexed: number
  unindexed: number
  indexedFlows: number
  unindexedFlows: number
  stale: number
  unindexedSchemas: Array<{ id: string; name: string; type: string }>
}

export interface RagReindexResult {
  total: number
  created: number
  updated: number
  skipped: number
  errors: number
  flowsTotal: number
  flowsCreated: number
  flowsUpdated: number
  flowsSkipped: number
  flowsErrors: number
}

export interface RagSingleReindexResult {
  schemaId: string
  action: 'created' | 'updated' | 'skipped'
}

export async function getRagStatus(): Promise<RagStatusData> {
  return request<RagStatusData>('/ai/rag/status')
}

export async function reindexAllRag(): Promise<RagReindexResult> {
  return request<RagReindexResult>('/ai/rag/reindex', {
    method: 'POST',
  })
}

export async function reindexSingleRag(schemaId: string): Promise<RagSingleReindexResult> {
  return request<RagSingleReindexResult>(`/ai/rag/reindex/${encodeURIComponent(schemaId)}`, {
    method: 'POST',
  })
}

export async function deleteRagEmbedding(schemaId: string): Promise<{ schemaId: string; deleted: boolean }> {
  return request<{ schemaId: string; deleted: boolean }>(`/ai/rag/${encodeURIComponent(schemaId)}`, {
    method: 'DELETE',
  })
}

export interface RagUploadResult {
  documentId: string
  filename: string
  action: 'created' | 'updated' | 'skipped'
}

export async function uploadRagDocument(file: File): Promise<RagUploadResult> {
  const form = new FormData()
  form.append('file', file)
  return uploadBlob<RagUploadResult>('/ai/rag/upload', form)
}
