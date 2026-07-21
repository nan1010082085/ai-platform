/**
 * Model API Client
 *
 * 对接 server /api/models 端点：CRUD + 测试调用。
 * 使用共享 request 模块，无重复基础设施代码。
 */

import { request, ApiError } from '@/api/shared/request'
import type { ModelCapability } from '@schema-platform/platform-shared/ai'

// ---- 类型 ----

export interface ModelParameters {
  temperature?: number
  maxTokens?: number
  topP?: number
  [key: string]: unknown
}

export interface Model {
  id: string
  name: string
  providerId: string | { _id: string; name: string; type: string; baseUrl: string; isActive: boolean }
  model: string
  parameters: ModelParameters
  capabilities: ModelCapability[]
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateModelPayload {
  name: string
  providerId: string
  model: string
  parameters?: ModelParameters
  capabilities?: ModelCapability[]
  isDefault?: boolean
  isActive?: boolean
}

export interface UpdateModelPayload {
  name?: string
  providerId?: string
  model?: string
  parameters?: ModelParameters
  capabilities?: ModelCapability[]
  isDefault?: boolean
  isActive?: boolean
}

export interface TestConnectionResult {
  reply: string
  tokens: number
  model: string
  provider: string
}

// ---- API 方法 ----

/** 获取模型列表（可按 providerId 过滤） */
export async function listModels(providerId?: string): Promise<Model[]> {
  const params = new URLSearchParams()
  if (providerId) params.set('providerId', providerId)
  const qs = params.toString()
  return request<Model[]>(`/models${qs ? `?${qs}` : ''}`)
}

/** 获取单个模型 */
export async function getModel(id: string): Promise<Model> {
  const models = await listModels()
  const found = models.find((m) => m.id === id)
  if (!found) throw new ApiError('Model not found', 404)
  return found
}

/** 创建模型 */
export async function createModel(payload: CreateModelPayload): Promise<Model> {
  return request<Model>('/models', {
    method: 'POST',
    body: payload,
  })
}

/** 更新模型 */
export async function updateModel(id: string, payload: UpdateModelPayload): Promise<Model> {
  return request<Model>(`/models/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  })
}

/** 删除模型 */
export async function deleteModel(id: string): Promise<void> {
  await request<void>(`/models/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

/** 测试模型调用 */
export async function testModel(id: string, message?: string): Promise<TestConnectionResult> {
  return request<TestConnectionResult>(`/models/${encodeURIComponent(id)}/test`, {
    method: 'POST',
    body: { message: message ?? 'Hello, respond with OK' },
  })
}

/** 获取默认模型（isDefault=true 的第一个），无默认则返回 null */
export async function getDefaultModel(): Promise<Model | null> {
  const models = await listModels()
  return models.find((m) => m.isDefault) ?? null
}
