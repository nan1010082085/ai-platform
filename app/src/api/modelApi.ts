/**
 * Model API Client
 *
 * 对接 server /api/models 端点：CRUD + 测试调用。
 */

import { redirectToLogin } from '@schema-platform/platform-shared/utils/authPaths'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'
const ACCESS_TOKEN_KEY = 'sfp_access_token'

// ---- 基础请求模式（复用 providerApi / modelConfigApi 同一模式）----

let tokenProvider: (() => string | null) | null = null
let onUnauthorized: (() => void) | null = null

export function setModelTokenProvider(provider: () => string | null): void {
  tokenProvider = provider
}

export function setModelUnauthorizedHandler(handler: () => void): void {
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

export class ModelApiError extends Error {
  public readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ModelApiError'
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
      throw new ModelApiError('登录已过期，请重新登录', 401)
    }
    const body = await response.json().catch(() => null)
    const msg = body?.error?.message ?? `${response.status} ${response.statusText}`
    throw new ModelApiError(msg, response.status)
  }

  const body = (await response.json()) as ApiResponse<T>
  if (!body.success) {
    throw new ModelApiError(body.error?.message ?? '请求失败', response.status)
  }
  return body.data
}

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
  isDefault?: boolean
  isActive?: boolean
}

export interface UpdateModelPayload {
  name?: string
  providerId?: string
  model?: string
  parameters?: ModelParameters
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
  if (!found) throw new ModelApiError('Model not found', 404)
  return found
}

/** 创建模型 */
export async function createModel(payload: CreateModelPayload): Promise<Model> {
  return request<Model>('/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** 更新模型 */
export async function updateModel(id: string, payload: UpdateModelPayload): Promise<Model> {
  return request<Model>(`/models/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: message ?? 'Hello, respond with OK' }),
  })
}

/** 获取默认模型（isDefault=true 的第一个），无默认则返回 null */
export async function getDefaultModel(): Promise<Model | null> {
  const models = await listModels()
  return models.find((m) => m.isDefault) ?? null
}
