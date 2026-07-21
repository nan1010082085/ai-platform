/**
 * aiApi unit tests
 *
 * 覆盖 aiApi.ts 中对话管理、发布、文件上传、监控、RAG、搜索、LLM 等 API 函数。
 * 注意：aiApi 的 local request wrapper 会传 init(undefined) 给 sharedRequest，
 * 所以断言需匹配 (path, undefined) 签名。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@schema-platform/platform-shared/utils/authPaths', () => ({
  redirectToLogin: vi.fn(),
}))

vi.mock('@/api/shared/request', () => ({
  request: vi.fn(),
  buildHeaders: vi.fn((extra?: Record<string, string>) => ({
    Authorization: 'Bearer test-token',
    ...extra,
  })),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/api/shared/blobRequest', () => ({
  requestBlob: vi.fn(),
  uploadBlob: vi.fn(),
  triggerBlobDownload: vi.fn(),
}))

import { request as sharedRequest, buildHeaders } from '@/api/shared/request'
import { requestBlob, uploadBlob, triggerBlobDownload } from '@/api/shared/blobRequest'
import {
  getConversations,
  getConversationDetail,
  deleteConversation,
  publish,
  uploadFile,
  getDocumentPreview,
  summarizeDocument,
  getDocumentFileUrl,
  downloadDocumentFile,
  reparseDocument,
  analyzeImage,
  downloadConversation,
  getMonitorSummary,
  getMonitorStats,
  getMonitorRecent,
  getMonitorAlerts,
  getPluginMetricStats,
  getPluginMetricRecent,
  getPluginMetricSummary,
  searchConversations,
  searchRag,
  mentionSearch,
  getRagStatus,
  reindexAllRag,
  reindexSingleRag,
  deleteRagEmbedding,
  uploadRagDocument,
  getLLMProviders,
  switchLLMProvider,
  getLLMUsage,
  getVersions,
  getVersion,
  rollbackVersion,
  submitMessageFeedback,
  getModelConfigs,
  getStarterPrompts,
  checkAIHealth,
  buildHeaders as aiBuildHeaders,
  fetchRaw,
  AiApiError,
} from '@/api/aiApi'

const mockedRequest = vi.mocked(sharedRequest)
const mockedRequestBlob = vi.mocked(requestBlob)
const mockedUploadBlob = vi.mocked(uploadBlob)
const mockedTriggerDownload = vi.mocked(triggerBlobDownload)

/** 断言 sharedRequest 被调用（忽略 init 参数差异） */
function expectCalledWithPath(path: string) {
  expect(mockedRequest).toHaveBeenCalledWith(path, undefined)
}

/** 断言 sharedRequest 被调用且 init 匹配 */
function expectCalledWith(path: string, init: Record<string, unknown>) {
  expect(mockedRequest).toHaveBeenCalledWith(path, expect.objectContaining(init))
}

describe('aiApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  // ---- 对话管理 ----

  it('getConversations extracts items from envelope', async () => {
    mockedRequest.mockResolvedValue({ items: [{ id: 'c1' }], total: 1, page: 1, pageSize: 20, totalPages: 1 })
    const result = await getConversations()
    expect(result).toEqual([{ id: 'c1' }])
    expectCalledWithPath('/ai/conversations')
  })

  it('getConversationDetail fetches by encoded id', async () => {
    mockedRequest.mockResolvedValue({ id: 'c1', messages: [] })
    await getConversationDetail('c1')
    expectCalledWithPath('/ai/conversations/c1')
  })

  it('deleteConversation sends DELETE', async () => {
    mockedRequest.mockResolvedValue(undefined)
    await deleteConversation('c1')
    expectCalledWith('/ai/conversations/c1', { method: 'DELETE' })
  })

  // ---- 发布 ----

  it('publish POSTs payload', async () => {
    mockedRequest.mockResolvedValue({ url: 'https://example.com' })
    await publish({ schema: [{ type: 'input' }] } as never)
    expectCalledWith('/ai/publish', { method: 'POST' })
  })

  // ---- 文件上传 ----

  it('uploadFile delegates to uploadBlob', async () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    mockedUploadBlob.mockResolvedValue({ id: 'd1', filename: 'test.txt' })
    const result = await uploadFile(file)
    expect(result.id).toBe('d1')
    expect(mockedUploadBlob).toHaveBeenCalledWith('/ai/documents/upload', expect.any(FormData))
  })

  // ---- 文档操作 ----

  it('getDocumentPreview fetches by encoded id', async () => {
    mockedRequest.mockResolvedValue({ id: 'd1', text: 'hello' })
    await getDocumentPreview('d1')
    expectCalledWithPath('/ai/documents/d1/preview')
  })

  it('summarizeDocument POSTs with force flag', async () => {
    mockedRequest.mockResolvedValue({ documentId: 'd1', summary: {} })
    await summarizeDocument('d1', true)
    expectCalledWith('/ai/documents/d1/summarize', { method: 'POST' })
    const body = JSON.parse(mockedRequest.mock.calls[0]![1]!.body as string)
    expect(body.force).toBe(true)
  })

  it('summarizeDocument defaults force to false', async () => {
    mockedRequest.mockResolvedValue({ documentId: 'd1', summary: {} })
    await summarizeDocument('d1')
    const body = JSON.parse(mockedRequest.mock.calls[0]![1]!.body as string)
    expect(body.force).toBe(false)
  })

  it('getDocumentFileUrl returns full URL', () => {
    const url = getDocumentFileUrl('d1')
    expect(url).toContain('/ai/documents/d1/file')
  })

  it('downloadDocumentFile calls requestBlob and triggers download', async () => {
    const blob = new Blob(['content'])
    mockedRequestBlob.mockResolvedValue(blob)
    await downloadDocumentFile('d1', 'report.pdf')
    expect(mockedRequestBlob).toHaveBeenCalledWith('/ai/documents/d1/file')
    expect(mockedTriggerDownload).toHaveBeenCalledWith(blob, 'report.pdf')
  })

  it('reparseDocument POSTs empty body', async () => {
    mockedRequest.mockResolvedValue({ id: 'd1' })
    await reparseDocument('d1')
    expectCalledWith('/ai/documents/d1/reparse', { method: 'POST' })
  })

  // ---- 图片分析 ----

  it('analyzeImage POSTs base64 image', async () => {
    mockedRequest.mockResolvedValue({ description: 'a cat' })
    const result = await analyzeImage('data:image/png;base64,...')
    expect(result.description).toBe('a cat')
    expectCalledWith('/ai/analyze-image', { method: 'POST' })
  })

  // ---- 对话导出 ----

  it('downloadConversation fetches blob and triggers download', async () => {
    const blob = new Blob(['export'])
    mockedRequestBlob.mockResolvedValue(blob)
    await downloadConversation('c1', 'markdown')
    expect(mockedRequestBlob).toHaveBeenCalledWith('/ai/collaboration/conversations/c1/export?format=markdown')
    expect(mockedTriggerDownload).toHaveBeenCalledWith(blob, 'conversation-c1.md')
  })

  it('downloadConversation uses correct extension for json/html', async () => {
    const blob = new Blob(['{}'])
    mockedRequestBlob.mockResolvedValue(blob)
    await downloadConversation('c1', 'json')
    expect(mockedTriggerDownload).toHaveBeenCalledWith(blob, 'conversation-c1.json')
  })

  // ---- 监控 ----

  it('getMonitorSummary fetches with optional hours', async () => {
    mockedRequest.mockResolvedValue({ totalCalls: 100 })
    await getMonitorSummary(24)
    expectCalledWithPath('/ai/monitor/summary?hours=24')
  })

  it('getMonitorSummary without hours', async () => {
    mockedRequest.mockResolvedValue({ totalCalls: 100 })
    await getMonitorSummary()
    expectCalledWithPath('/ai/monitor/summary')
  })

  it('getMonitorStats fetches stats', async () => {
    mockedRequest.mockResolvedValue([])
    await getMonitorStats()
    expectCalledWithPath('/ai/monitor/stats')
  })

  it('getMonitorRecent builds query string', async () => {
    mockedRequest.mockResolvedValue({ items: [], total: 0 })
    await getMonitorRecent({ page: 2, pageSize: 10 })
    expectCalledWithPath('/ai/monitor/recent?page=2&pageSize=10')
  })

  it('getMonitorRecent uses limit when no page/pageSize', async () => {
    mockedRequest.mockResolvedValue({ items: [], total: 0 })
    await getMonitorRecent({ limit: 5 })
    expectCalledWithPath('/ai/monitor/recent?limit=5')
  })

  it('getMonitorAlerts builds query string', async () => {
    mockedRequest.mockResolvedValue({ items: [], total: 0 })
    await getMonitorAlerts({ limit: 3 })
    expectCalledWithPath('/ai/monitor/alerts?limit=3')
  })

  // ---- 插件监控 ----

  it('getPluginMetricStats builds query string', async () => {
    mockedRequest.mockResolvedValue([])
    await getPluginMetricStats({ pluginType: 'expert', sortBy: 'calls', sortOrder: 'desc' })
    expectCalledWithPath('/ai/monitor/plugin-stats?pluginType=expert&sortBy=calls&sortOrder=desc')
  })

  it('getPluginMetricRecent builds query string', async () => {
    mockedRequest.mockResolvedValue({ items: [], total: 0 })
    await getPluginMetricRecent({ pluginId: 'p1', page: 1, pageSize: 20 })
    expectCalledWithPath('/ai/monitor/plugin-recent?pluginId=p1&page=1&pageSize=20')
  })

  it('getPluginMetricSummary fetches with hours', async () => {
    mockedRequest.mockResolvedValue({ totalCalls: 10 })
    await getPluginMetricSummary(12)
    expectCalledWithPath('/ai/monitor/plugin-summary?hours=12')
  })

  // ---- 搜索 ----

  it('searchConversations builds query string', async () => {
    mockedRequest.mockResolvedValue({ conversations: [], total: 0 })
    await searchConversations({ keyword: 'test', source: 'editor', page: 1 })
    expectCalledWithPath('/ai/conversations/search?keyword=test&source=editor&page=1')
  })

  it('searchRag builds query string', async () => {
    mockedRequest.mockResolvedValue({ results: [] })
    await searchRag({ query: 'form', limit: 5, type: 'form' })
    expectCalledWithPath('/ai/rag/search?query=form&limit=5&type=form')
  })

  it('mentionSearch builds params', async () => {
    mockedRequest.mockResolvedValue([])
    await mentionSearch('input', 'widget', 20)
    expectCalledWithPath('/ai/mention/search/widget?q=input&limit=20')
  })

  // ---- RAG ----

  it('getRagStatus fetches status', async () => {
    mockedRequest.mockResolvedValue({ totalSchemas: 100 })
    await getRagStatus()
    expectCalledWithPath('/ai/rag/status')
  })

  it('reindexAllRag POSTs', async () => {
    mockedRequest.mockResolvedValue({ total: 50 })
    await reindexAllRag()
    expectCalledWith('/ai/rag/reindex', { method: 'POST' })
  })

  it('reindexSingleRag POSTs by encoded id', async () => {
    mockedRequest.mockResolvedValue({ schemaId: 's1', action: 'created' })
    await reindexSingleRag('s1')
    expectCalledWith('/ai/rag/reindex/s1', { method: 'POST' })
  })

  it('deleteRagEmbedding sends DELETE', async () => {
    mockedRequest.mockResolvedValue({ schemaId: 's1', deleted: true })
    await deleteRagEmbedding('s1')
    expectCalledWith('/ai/rag/s1', { method: 'DELETE' })
  })

  it('uploadRagDocument delegates to uploadBlob', async () => {
    mockedUploadBlob.mockResolvedValue({ documentId: 'rd1', filename: 'rag.pdf', action: 'created' })
    const file = new File([''], 'rag.pdf')
    await uploadRagDocument(file)
    expect(mockedUploadBlob).toHaveBeenCalledWith('/ai/rag/upload', expect.any(FormData))
  })

  // ---- LLM ----

  it('getLLMProviders fetches providers', async () => {
    mockedRequest.mockResolvedValue({ providers: [], defaultProvider: 'deepseek' })
    await getLLMProviders()
    expectCalledWithPath('/ai/llm-providers')
  })

  it('switchLLMProvider POSTs provider name', async () => {
    mockedRequest.mockResolvedValue({ provider: 'openai', message: 'switched' })
    await switchLLMProvider('openai')
    expectCalledWith('/ai/llm-provider', { method: 'POST' })
    const body = JSON.parse(mockedRequest.mock.calls[0]![1]!.body as string)
    expect(body.provider).toBe('openai')
  })

  it('getLLMUsage fetches with optional provider', async () => {
    mockedRequest.mockResolvedValue({ total: {} })
    await getLLMUsage('deepseek')
    expectCalledWithPath('/ai/llm-usage?provider=deepseek')
  })

  it('getLLMUsage without provider', async () => {
    mockedRequest.mockResolvedValue({ total: {} })
    await getLLMUsage()
    expectCalledWithPath('/ai/llm-usage')
  })

  // ---- 版本历史 ----

  it('getVersions fetches by conversation id', async () => {
    mockedRequest.mockResolvedValue([])
    await getVersions('c1')
    expectCalledWithPath('/ai/conversations/c1/versions')
  })

  it('getVersion fetches by version id', async () => {
    mockedRequest.mockResolvedValue({ id: 'v1' })
    await getVersion('v1')
    expectCalledWithPath('/ai/versions/v1')
  })

  it('rollbackVersion POSTs version id', async () => {
    mockedRequest.mockResolvedValue({ id: 'v1', version: 3 })
    await rollbackVersion('c1', 'v1')
    expectCalledWith('/ai/conversations/c1/rollback', { method: 'POST' })
    const body = JSON.parse(mockedRequest.mock.calls[0]![1]!.body as string)
    expect(body.versionId).toBe('v1')
  })

  // ---- 反馈 ----

  it('submitMessageFeedback POSTs feedback', async () => {
    mockedRequest.mockResolvedValue(undefined)
    await submitMessageFeedback('m1', 'positive', 'great!')
    expectCalledWith('/ai/messages/m1/feedback', { method: 'POST' })
    const body = JSON.parse(mockedRequest.mock.calls[0]![1]!.body as string)
    expect(body.feedback).toBe('positive')
    expect(body.comment).toBe('great!')
  })

  it('submitMessageFeedback without comment', async () => {
    mockedRequest.mockResolvedValue(undefined)
    await submitMessageFeedback('m1', 'negative')
    const body = JSON.parse(mockedRequest.mock.calls[0]![1]!.body as string)
    expect(body.comment).toBeUndefined()
  })

  // ---- 模型配置 / 健康 ----

  it('getModelConfigs extracts items', async () => {
    mockedRequest.mockResolvedValue({ items: [{ id: 'mc1' }], total: 1 })
    const result = await getModelConfigs()
    expect(result).toEqual([{ id: 'mc1' }])
    expectCalledWithPath('/model-configs?pageSize=100')
  })

  it('getStarterPrompts fetches prompts', async () => {
    mockedRequest.mockResolvedValue([{ icon: 'star', text: 'hello', agent: 'general' }])
    await getStarterPrompts()
    expectCalledWithPath('/ai/chat/starter-prompts')
  })

  it('checkAIHealth fetches health', async () => {
    mockedRequest.mockResolvedValue({ status: 'ok', providers: [] })
    await checkAIHealth()
    expectCalledWithPath('/ai/health')
  })

  // ---- helpers ----

  it('buildHeaders delegates to shared buildHeaders', () => {
    const headers = aiBuildHeaders({ 'X-Custom': 'yes' })
    expect(headers['Authorization']).toBe('Bearer test-token')
    expect(headers['X-Custom']).toBe('yes')
  })

  it('fetchRaw returns response on success', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200 } as Response)
    const resp = await fetchRaw('/api/test')
    expect(resp.status).toBe(200)
  })

  it('fetchRaw throws on 401', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 } as Response)
    await expect(fetchRaw('/api/test')).rejects.toMatchObject({ status: 401 })
  })

  it('AiApiError extends ApiError', () => {
    const err = new AiApiError('test', 500)
    expect(err.name).toBe('AiApiError')
    expect(err.status).toBe(500)
  })
})
