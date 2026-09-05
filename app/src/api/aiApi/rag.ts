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

// ---- RAG 检索调试 ----

import type { RagDebugParams, RagDebugResult } from '@/types'

/**
 * 检索调试：对同一 query 并行跑 semantic / rerank / hybrid 三路，返回对比结果。
 * /ai/debug/* 返回裸对象，使用 raw 信封。
 */
export async function debugRagSearch(params: RagDebugParams): Promise<RagDebugResult> {
  return request<RagDebugResult>('/ai/debug/rag', {
    method: 'POST',
    body: {
      query: params.query,
      topK: params.topK,
      type: params.type,
      minScore: params.minScore,
      rerankEnabled: params.rerankEnabled,
      semanticWeight: params.semanticWeight,
      keywordWeight: params.keywordWeight,
      filter: params.filter,
    },
    raw: true,
  })
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

export interface RagPendingItem {
  id: string
  name: string
  type: string
  entityKind: 'schema' | 'flow'
  /** 仅流程未索引时可能有 */
  status?: string
}

export interface RagStaleItem {
  id: string
  name: string
  type: string
  entityKind: 'schema' | 'flow'
}

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
  unindexedSchemas: RagPendingItem[]
  /** 流程待索引清单 */
  unindexedFlowsList?: RagPendingItem[]
  /** 过期索引清单（源已变更未重同步） */
  staleItems?: RagStaleItem[]
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
  entityKind: string
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

export async function reindexSingleRag(
  schemaId: string,
  entityKind: 'schema' | 'flow' | 'document' = 'schema',
): Promise<RagSingleReindexResult> {
  return request<RagSingleReindexResult>(`/ai/rag/reindex/${encodeURIComponent(schemaId)}?entityKind=${entityKind}`, {
    method: 'POST',
  })
}

export async function deleteRagEmbedding(
  schemaId: string,
  entityKind: 'schema' | 'flow' | 'document' = 'schema',
): Promise<{ schemaId: string; entityKind: string; deleted: boolean }> {
  return request<{ schemaId: string; entityKind: string; deleted: boolean }>(`/ai/rag/${encodeURIComponent(schemaId)}?entityKind=${entityKind}`, {
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
