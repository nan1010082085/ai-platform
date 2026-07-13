/**
 * Model Configuration API Client
 *
 * 对接 server /api/model-configs 端点：CRUD + 测试连接。
 */

import { redirectToLogin } from '@schema-platform/platform-shared/utils/authPaths'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'
const ACCESS_TOKEN_KEY = 'sfp_access_token'

// ---- 复用 aiApi 的基础请求模式 ----

let tokenProvider: (() => string | null) | null = null
let onUnauthorized: (() => void) | null = null

export function setModelConfigTokenProvider(provider: () => string | null): void {
  tokenProvider = provider
}

export function setModelConfigUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

function resolveToken(): string | null {
  return tokenProvider?.() || localStorage.getItem(ACCESS_TOKEN_KEY)
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: { message: string }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra }
  const token = resolveToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export class ModelConfigApiError extends Error {
  public readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ModelConfigApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const mergedInit: RequestInit = { ...init }
  mergedInit.headers = buildHeaders(init?.headers as Record<string, string>)

  const response = await fetch(`${BASE_URL}${path}`, mergedInit)

  if (!response.ok) {
    if (response.status === 401) {
      onUnauthorized?.()
      redirectToLogin()
      throw new ModelConfigApiError('Authentication required', 401)
    }
    const body = await response.json().catch(() => null)
    const msg = body?.error?.message ?? `${response.status} ${response.statusText}`
    throw new ModelConfigApiError(msg, response.status)
  }

  const body = (await response.json()) as ApiResponse<T>
  if (!body.success) {
    throw new ModelConfigApiError(body.error?.message ?? 'Request failed', response.status)
  }
  return body.data
}

// ---- 类型 ----

export type ModelProvider = 'deepseek' | 'openai' | 'anthropic' | 'ollama' | 'mimo'

export interface ModelConfigItem {
  id: string
  name: string
  provider: ModelProvider
  model: string
  apiKey: string
  baseUrl: string
  parameters?: {
    temperature?: number
    maxTokens?: number
    topP?: number
  }
  isDefault: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ModelConfigListResponse {
  items: ModelConfigItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateModelConfigPayload {
  name: string
  provider: ModelProvider
  model: string
  apiKey?: string
  baseUrl?: string
  parameters?: { temperature?: number; maxTokens?: number; topP?: number }
  isDefault?: boolean
}

export interface UpdateModelConfigPayload {
  name?: string
  provider?: ModelProvider
  model?: string
  apiKey?: string
  baseUrl?: string
  parameters?: { temperature?: number; maxTokens?: number; topP?: number }
  isDefault?: boolean
}

export interface TestConnectionResult {
  reply: string
  tokens: number
  model: string
  provider: string
}

// ---- API 方法 ----

/** 获取模型配置列表 */
export async function getModelConfigs(params?: {
  search?: string
  provider?: ModelProvider
  page?: number
  pageSize?: number
}): Promise<ModelConfigListResponse> {
  const search = new URLSearchParams()
  if (params?.search) search.set('search', params.search)
  if (params?.provider) search.set('provider', params.provider)
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  const qs = search.toString()
  return request<ModelConfigListResponse>(`/model-configs${qs ? `?${qs}` : ''}`)
}

/** 获取单个模型配置 */
export async function getModelConfig(id: string): Promise<ModelConfigItem> {
  return request<ModelConfigItem>(`/model-configs/${encodeURIComponent(id)}`)
}

/** 创建模型配置 */
export async function createModelConfig(payload: CreateModelConfigPayload): Promise<ModelConfigItem> {
  return request<ModelConfigItem>('/model-configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** 更新模型配置 */
export async function updateModelConfig(id: string, payload: UpdateModelConfigPayload): Promise<ModelConfigItem> {
  return request<ModelConfigItem>(`/model-configs/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** 删除模型配置 */
export async function deleteModelConfig(id: string): Promise<void> {
  await request<void>(`/model-configs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

/** 测试模型连接 */
export async function testModelConnection(id: string, message?: string): Promise<TestConnectionResult> {
  return request<TestConnectionResult>(`/model-configs/${encodeURIComponent(id)}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message ?? 'Hello, respond with OK' }),
  })
}

// ---- 导入 / 导出 / 批量测试 ----

export interface ExportModelConfigPayload {
  version: 1
  exportedAt: string
  configs: Omit<CreateModelConfigPayload, 'id' | 'createdAt' | 'updatedAt'>[]
}

/** 导出全部模型配置为 JSON 格式 */
export async function exportModelConfigs(): Promise<ExportModelConfigPayload> {
  const res = await getModelConfigs({ page: 1, pageSize: 1000 })
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    configs: res.items.map(({ id: _id, createdAt: _ca, updatedAt: _ua, apiKey: _ak, ...rest }) => rest),
  }
}

/** 从导出的 JSON 批量导入模型配置 */
export async function importModelConfigs(payload: ExportModelConfigPayload): Promise<{
  imported: number
  skipped: number
  errors: string[]
}> {
  if (!payload?.configs?.length || payload.version !== 1) {
    throw new Error('无效的导入文件格式')
  }
  let imported = 0
  let skipped = 0
  const errors: string[] = []
  for (const cfg of payload.configs) {
    try {
      await createModelConfig(cfg)
      imported++
    } catch (e) {
      const msg = (e as Error).message || '未知错误'
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        skipped++
      } else {
        errors.push(`${cfg.name}: ${msg}`)
      }
    }
  }
  return { imported, skipped, errors }
}

/** 批量测试多个模型连接，返回 id → 结果映射 */
export async function bulkTestConnections(
  ids: string[],
): Promise<Map<string, { success: boolean; result?: TestConnectionResult; error?: string }>> {
  const results = new Map<string, { success: boolean; result?: TestConnectionResult; error?: string }>()
  await Promise.allSettled(
    ids.map(async (id) => {
      try {
        const result = await testModelConnection(id)
        results.set(id, { success: true, result })
      } catch (e) {
        results.set(id, { success: false, error: (e as Error).message || '测试失败' })
      }
    }),
  )
  return results
}
