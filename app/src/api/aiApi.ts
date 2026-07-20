/**
 * AI API 客户端
 *
 * - 对话管理 CRUD
 * - 发布接口
 * - 文件上传等 REST 能力
 *
 * Chat 流式对话走 WebSocket（stream store → chat:send / chat:event），不在此模块。
 */

import type {
  PublishRequest,
  PublishResponse,
  Conversation,
  RagSearchResponse,
} from '@/types'
import { redirectToLogin } from '@schema-platform/platform-shared/utils/authPaths'
import {
  request as sharedRequest,
  buildHeaders as sharedBuildHeaders,
  ApiError,
} from '@/api/shared/request'
import { requestBlob, uploadBlob, triggerBlobDownload } from '@/api/shared/blobRequest'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'

// ---- 错误类型 (re-export for backward compat) ----

export class AiApiError extends ApiError {
  constructor(message: string, status: number) {
    super(message, status)
    this.name = 'AiApiError'
  }
}

// ---- Auth helpers (delegate to shared module) ----

/** @deprecated Use setTokenProvider from @/api/shared/request */
export function setTokenProvider(provider: () => string | null): void {
  // Already handled by setupCapabilityAuth via shared module
}

/** @deprecated Use setUnauthorizedHandler from @/api/shared/request */
export function setUnauthorizedHandler(handler: () => void): void {
  // Already handled by setupCapabilityAuth via shared module
}

/** 构建请求 headers，自动注入 Authorization */
export function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  return sharedBuildHeaders(extra)
}

/**
 * 带认证的原始 fetch，返回 Response 对象。
 * 适用于需要读取二进制流（arrayBuffer / blob）的场景。
 */
export async function fetchRaw(url: string, init?: RequestInit): Promise<Response> {
  const mergedInit: RequestInit = { ...init }
  mergedInit.headers = sharedBuildHeaders(init?.headers as Record<string, string>)

  const response = await fetch(url, mergedInit)
  if (response.status === 401) {
    redirectToLogin()
    throw new ApiError('Authentication required', 401)
  }
  return response
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return sharedRequest<T>(path, init)
}

// ---- 对话管理 ----

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

// ---- 发布 ----

export async function publish(payload: PublishRequest): Promise<PublishResponse> {
  return request<PublishResponse>('/ai/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// ---- 文件上传 ----

export interface UploadResult {
  id: string
  filename: string
  mimetype: string
  size: number
  text: string
  textLength?: number
  chunkCount?: number
  excerpt?: string
  hasOriginalFile?: boolean
  extractionMethod?: 'ocr' | 'pdf' | 'docx' | 'doc' | 'csv' | 'xlsx' | 'ofd' | 'txt' | 'empty'
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  return uploadBlob<UploadResult>('/ai/documents/upload', form)
}

export interface DocumentPreviewResult {
  id: string
  filename: string
  mimetype: string
  size: number
  text: string
  excerpt: string
  chunks: Array<{ page: number; text: string; startOffset: number }>
  summary?: StructuredSummary
  hasOriginalFile?: boolean
  extractionMethod?: 'ocr' | 'pdf' | 'docx' | 'doc' | 'csv' | 'xlsx' | 'ofd' | 'txt' | 'empty'
}

export interface StructuredSummary {
  title: string
  summary: string
  keyPoints: string[]
  sections: Array<{ heading: string; content: string }>
  entities?: string[]
  generatedAt: string
}

export interface DocumentSummarizeResult {
  documentId: string
  filename: string
  summary: StructuredSummary
}

export async function getDocumentPreview(documentId: string): Promise<DocumentPreviewResult> {
  return request<DocumentPreviewResult>(`/ai/documents/${encodeURIComponent(documentId)}/preview`)
}

export async function summarizeDocument(
  documentId: string,
  force = false,
): Promise<DocumentSummarizeResult> {
  return request<DocumentSummarizeResult>(`/ai/documents/${encodeURIComponent(documentId)}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force }),
  })
}

export function getDocumentFileUrl(documentId: string): string {
  return `${BASE_URL}/ai/documents/${encodeURIComponent(documentId)}/file`
}

export async function downloadDocumentFile(documentId: string, filename: string): Promise<void> {
  const blob = await requestBlob(`/ai/documents/${encodeURIComponent(documentId)}/file`)
  triggerBlobDownload(blob, filename)
}

export async function reparseDocument(documentId: string): Promise<UploadResult> {
  return request<UploadResult>(`/ai/documents/${encodeURIComponent(documentId)}/reparse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}

// ---- 图片分析 ----

export interface AnalyzeImageResult {
  description: string
}

export async function analyzeImage(base64Image: string): Promise<AnalyzeImageResult> {
  return request<AnalyzeImageResult>('/ai/analyze-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  })
}

// ---- 对话导出 ----

export type ExportFormat = 'json' | 'markdown' | 'html'

export async function downloadConversation(id: string, format: ExportFormat): Promise<void> {
  const blob = await requestBlob(
    `/ai/conversations/${encodeURIComponent(id)}/export?format=${format}`,
  )
  triggerBlobDownload(blob, `conversation-${id}.${format === 'markdown' ? 'md' : format}`)
}

// ---- 监控 ----

export interface MonitorSummary {
  totalCalls: number
  successRate: number
  avgDuration: number
  maxDuration: number
  totalTokens: number
  slowCalls: number
}

export interface AgentMetricStats {
  agentName: string
  operation: string
  totalCalls: number
  successRate: number
  avgDuration: number
  p95Duration: number
  maxDuration: number
  totalTokens: number
}

export interface AgentMetric {
  id: string
  agentName: string
  operation: string
  duration: number
  success: boolean
  error?: string
  tokenUsage?: { total?: number }
  createdAt: string
}

export interface AgentAlert {
  id: string
  agentName: string
  alertType: 'failure' | 'slow' | 'high_token'
  operation: string
  duration: number
  tokenUsage?: { total?: number }
  error?: string
  createdAt: string
}

// ---- 插件监控 ----

export interface PluginMetricStats {
  pluginId: string
  pluginName: string
  pluginType: 'expert' | 'tool' | 'mcp' | 'skill'
  totalCalls: number
  successRate: number
  avgDuration: number
  p95Duration: number
  maxDuration: number
  failureRate: number
  recentErrors: Array<{ error: string; at: string }>
}

export interface PluginMetric {
  id: string
  pluginId: string
  pluginName: string
  pluginType: 'expert' | 'tool' | 'mcp' | 'skill'
  duration: number
  success: boolean
  error?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface PluginMetricSummary {
  totalCalls: number
  successRate: number
  avgDuration: number
  maxDuration: number
  slowCalls: number
  activePlugins: number
  periodHours: number
}

export async function getPluginMetricStats(params?: {
  pluginType?: string
  sortBy?: string
  sortOrder?: string
}): Promise<PluginMetricStats[]> {
  const search = new URLSearchParams()
  if (params?.pluginType) search.set('pluginType', params.pluginType)
  if (params?.sortBy) search.set('sortBy', params.sortBy)
  if (params?.sortOrder) search.set('sortOrder', params.sortOrder)
  const query = search.toString()
  return request<PluginMetricStats[]>(`/ai/monitor/plugin-stats${query ? `?${query}` : ''}`)
}

export async function getPluginMetricRecent(params?: {
  pluginId?: string
  pluginType?: string
  success?: string
  page?: number
  pageSize?: number
}): Promise<MonitorPaginatedResult<PluginMetric>> {
  const search = new URLSearchParams()
  if (params?.pluginId) search.set('pluginId', params.pluginId)
  if (params?.pluginType) search.set('pluginType', params.pluginType)
  if (params?.success) search.set('success', params.success)
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  const query = search.toString()
  return request<MonitorPaginatedResult<PluginMetric>>(`/ai/monitor/plugin-recent${query ? `?${query}` : ''}`)
}

export async function getPluginMetricSummary(hours?: number): Promise<PluginMetricSummary> {
  const query = hours ? `?hours=${hours}` : ''
  return request<PluginMetricSummary>(`/ai/monitor/plugin-summary${query}`)
}

export async function getMonitorSummary(hours?: number): Promise<MonitorSummary> {
  const query = hours ? `?hours=${hours}` : ''
  return request<MonitorSummary>(`/ai/monitor/summary${query}`)
}

export async function getMonitorStats(): Promise<AgentMetricStats[]> {
  return request<AgentMetricStats[]>('/ai/monitor/stats')
}

export interface MonitorPaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getMonitorRecent(params?: {
  limit?: number
  page?: number
  pageSize?: number
}): Promise<MonitorPaginatedResult<AgentMetric>> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  else if (params?.limit) search.set('limit', String(params.limit))
  const query = search.toString()
  return request<MonitorPaginatedResult<AgentMetric>>(`/ai/monitor/recent${query ? `?${query}` : ''}`)
}

export async function getMonitorAlerts(params?: {
  limit?: number
  page?: number
  pageSize?: number
}): Promise<MonitorPaginatedResult<AgentAlert>> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  else if (params?.limit) search.set('limit', String(params.limit))
  const query = search.toString()
  return request<MonitorPaginatedResult<AgentAlert>>(`/ai/monitor/alerts${query ? `?${query}` : ''}`)
}

// ---- 搜索对话 ----

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

// ---- RAG Smart Match ----

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

// ---- LLM Provider Management ----

export interface LLMProviderInfo {
  name: string
  models: string[]
  defaultModel: string
  isDefault: boolean
  qualityScore: number
  speedScore: number
  costPer1kPromptTokens: number
  costPer1kCompletionTokens: number
}

export interface LLMProvidersResponse {
  providers: LLMProviderInfo[]
  default: string
  defaultStrategy: string | null
}

export async function getLLMProviders(): Promise<LLMProvidersResponse> {
  return request<LLMProvidersResponse>('/ai/llm-providers')
}

export async function switchLLMProvider(provider: string): Promise<{ provider: string; message: string }> {
  return request<{ provider: string; message: string }>('/ai/llm-provider', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider }),
  })
}

export interface UsageStats {
  totalTokens: number
  totalCost: number
  requestCount: number
  promptTokens: number
  completionTokens: number
}

export interface LLMAggregatedUsage {
  total: UsageStats
  byProvider: Array<{ name: string; usage: UsageStats }>
}

export async function getLLMUsage(provider?: string): Promise<LLMAggregatedUsage | { provider: string; usage: UsageStats }> {
  const query = provider ? `?provider=${encodeURIComponent(provider)}` : ''
  return request(`/ai/llm-usage${query}`)
}

export interface LLMStrategiesResponse {
  strategies: string[]
  default: string | null
}

export async function getLLMStrategies(): Promise<LLMStrategiesResponse> {
  return request<LLMStrategiesResponse>('/ai/llm-strategies')
}

export async function switchLLMStrategy(strategy: string | null): Promise<{ strategy: string | null; message: string }> {
  return request<{ strategy: string | null; message: string }>('/ai/llm-strategy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategy }),
  })
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

/**
 * 获取对话的版本历史列表。
 */
export async function getVersions(conversationId: string): Promise<VersionEntry[]> {
  return request<VersionEntry[]>(`/ai/conversations/${encodeURIComponent(conversationId)}/versions`)
}

/**
 * 获取指定版本的详细内容。
 */
export async function getVersion(versionId: string): Promise<VersionDetail> {
  return request<VersionDetail>(`/ai/versions/${encodeURIComponent(versionId)}`)
}

/**
 * 回滚到指定版本。
 */
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

/**
 * 为消息提交反馈（点赞/点踩）。
 */
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

// ---- 模型配置 ----

export interface ModelConfigItem {
  id: string
  name: string
  provider: string
  model: string
  isDefault: boolean
  parameters?: {
    temperature?: number
    maxTokens?: number
    topP?: number
  }
}

export async function getModelConfigs(): Promise<ModelConfigItem[]> {
  const res = await request<{ items: ModelConfigItem[]; total: number }>('/model-configs?pageSize=100')
  return res.items
}

// ---- Chat Starter Prompts ----

export interface StarterPrompt {
  icon: string
  text: string
  agent: string
}

export async function getStarterPrompts(): Promise<StarterPrompt[]> {
  return request<StarterPrompt[]>('/ai/chat/starter-prompts')
}

// ---- AI 健康检查 ----

export interface AIProviderHealth {
  name: string
  hasApiKey: boolean
  model: string
  isDefault: boolean
}

export interface AIHealthResponse {
  status: 'ok' | 'unconfigured'
  defaultProvider: string
  providers: AIProviderHealth[]
  hasApiKey: boolean
}

/**
 * 检查 AI 服务健康状态（API Key 配置、Provider 可用性）。
 */
export async function checkAIHealth(): Promise<AIHealthResponse> {
  return request<AIHealthResponse>('/ai/health')
}
