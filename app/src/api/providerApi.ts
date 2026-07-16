/**
 * Provider API Client
 *
 * 对接 server /api/providers 端点：CRUD + 测试连接。
 * 聚合 /api/models 实现 listProvidersWithModels。
 * 使用共享 request 模块，无重复基础设施代码。
 */

import { request } from '@/api/shared/request'

// ---- 类型 ----

/** 服务端支持的 Provider 类型（与 server/src/models/Provider.ts 一致） */
export type ProviderType = 'deepseek' | 'openai' | 'ollama' | 'mimo' | 'azure' | 'custom'

export interface Provider {
  id: string
  name: string
  type: ProviderType
  baseUrl: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** API 返回时 apiKey 已脱敏，不暴露原始密钥 */
export interface ProviderWithMaskedKey extends Provider {
  apiKey: string | null
}

export interface CreateProviderPayload {
  name: string
  type: ProviderType
  baseUrl: string
  website?: string
  apiKey?: string
  isActive?: boolean
}

export interface UpdateProviderPayload {
  name?: string
  type?: ProviderType
  baseUrl?: string
  apiKey?: string
  isActive?: boolean
}

export interface TestConnectionResult {
  reply: string
  tokens: number
  provider: string
  baseUrl: string
  model?: string
}

export interface RemoteModelItem {
  id: string
  name: string
}

export interface SyncModelsResult {
  remote: number
  created: number
  skipped: number
}

export interface ModelParameters {
  temperature?: number
  maxTokens?: number
  topP?: number
  [key: string]: unknown
}

export interface Model {
  id: string
  name: string
  providerId: string
  model: string
  parameters: ModelParameters
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ProviderWithModels = Provider & { models: Model[] }

// ---- API 方法 ----

/** 获取 Provider 列表 */
export async function listProviders(): Promise<Provider[]> {
  return request<Provider[]>('/providers')
}

/** 获取单个 Provider（含脱敏 apiKey） */
export async function getProvider(id: string): Promise<ProviderWithMaskedKey> {
  return request<ProviderWithMaskedKey>(`/providers/${encodeURIComponent(id)}`)
}

/** 创建 Provider */
export async function createProvider(payload: CreateProviderPayload): Promise<Provider> {
  return request<Provider>('/providers', {
    method: 'POST',
    body: payload,
  })
}

/** 更新 Provider */
export async function updateProvider(id: string, payload: UpdateProviderPayload): Promise<Provider> {
  return request<Provider>(`/providers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  })
}

/** 删除 Provider（级联删除关联 Model） */
export async function deleteProvider(id: string): Promise<void> {
  await request<void>(`/providers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

/** 测试 Provider 连接 */
export async function testProvider(id: string, message?: string): Promise<TestConnectionResult> {
  return request<TestConnectionResult>(`/providers/${encodeURIComponent(id)}/test`, {
    method: 'POST',
    body: { message: message ?? 'Hello, respond with OK' },
  })
}

/** 拉取上游模型列表 */
export async function listRemoteModels(id: string): Promise<RemoteModelItem[]> {
  return request<RemoteModelItem[]>(`/providers/${encodeURIComponent(id)}/remote-models`)
}

/** 同步上游模型到本地（可选指定 modelIds，默认全量） */
export async function syncProviderModels(id: string, modelIds?: string[]): Promise<SyncModelsResult> {
  return request<SyncModelsResult>(`/providers/${encodeURIComponent(id)}/sync-models`, {
    method: 'POST',
    body: { modelIds },
  })
}

/** 获取 Provider 列表并聚合关联的 Model 列表 */
export async function listProvidersWithModels(): Promise<ProviderWithModels[]> {
  const [providers, models] = await Promise.all([
    listProviders(),
    request<Model[]>('/models'),
  ])

  const modelsByProvider = new Map<string, Model[]>()
  for (const model of models) {
    const list = modelsByProvider.get(model.providerId) ?? []
    list.push(model)
    modelsByProvider.set(model.providerId, list)
  }

  return providers.map((p) => ({
    ...p,
    models: modelsByProvider.get(p.id) ?? [],
  }))
}

// ---- Embedding Config ----

export type EmbeddingProvider = 'siliconflow' | 'openai' | 'custom'

export interface EmbeddingConfig {
  provider: EmbeddingProvider
  model: string
  baseUrl: string
  apiKey: string
  dimensions: number
}

export interface UpdateEmbeddingConfigPayload {
  provider?: EmbeddingProvider
  model?: string
  baseUrl?: string
  apiKey?: string
  dimensions?: number
}

/** 获取嵌入模型配置 */
export async function getEmbeddingConfig(): Promise<EmbeddingConfig> {
  return request<EmbeddingConfig>('/providers/embedding-config')
}

/** 更新嵌入模型配置 */
export async function updateEmbeddingConfig(payload: UpdateEmbeddingConfigPayload): Promise<EmbeddingConfig> {
  return request<EmbeddingConfig>('/providers/embedding-config', {
    method: 'PUT',
    body: payload,
  })
}
