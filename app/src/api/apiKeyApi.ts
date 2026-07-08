/**
 * API Key 管理客户端
 *
 * 对接 server /api/keys 端点：创建、列表、禁用/启用、删除。
 * 创建时返回完整 sk-...，列表仅返回脱敏前缀。
 */

import { redirectToLogin } from '@schema-platform/platform-shared/utils/authPaths'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'
const ACCESS_TOKEN_KEY = 'sfp_access_token'

// ---- 复用 aiApi 的基础请求模式 ----

let tokenProvider: (() => string | null) | null = null
let onUnauthorized: (() => void) | null = null

export function setApiKeyTokenProvider(provider: () => string | null): void {
  tokenProvider = provider
}

export function setApiKeyUnauthorizedHandler(handler: () => void): void {
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

export class ApiKeyApiError extends Error {
  public readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiKeyApiError'
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
      throw new ApiKeyApiError('Authentication required', 401)
    }
    const body = await response.json().catch(() => null)
    const msg = body?.error?.message ?? `${response.status} ${response.statusText}`
    throw new ApiKeyApiError(msg, response.status)
  }

  const body = (await response.json()) as ApiResponse<T>
  if (!body.success) {
    throw new ApiKeyApiError(body.error?.message ?? 'Request failed', response.status)
  }
  return body.data
}

// ---- 类型 ----

export type ApiKeyStatus = 'active' | 'disabled'

export interface ApiKeyItem {
  id: string
  name: string
  key: string
  tenantId: string
  createdBy: string
  permissions: string[]
  status: ApiKeyStatus
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiKeyListResponse {
  items: ApiKeyItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateApiKeyPayload {
  name: string
  permissions?: string[]
  expiresAt?: string | null
}

// ---- API 方法 ----

/** 创建 API Key — 返回完整 key（仅此一次） */
export async function createApiKey(payload: CreateApiKeyPayload): Promise<ApiKeyItem> {
  return request<ApiKeyItem>('/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

/** 获取 API Key 列表（key 已脱敏） */
export async function getApiKeys(params?: {
  page?: number
  pageSize?: number
  status?: ApiKeyStatus
}): Promise<ApiKeyListResponse> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  if (params?.status) search.set('status', params.status)
  const qs = search.toString()
  return request<ApiKeyListResponse>(`/keys${qs ? `?${qs}` : ''}`)
}

/** 切换 API Key 状态（启用/禁用） */
export async function updateApiKeyStatus(
  id: string,
  status: ApiKeyStatus,
): Promise<ApiKeyItem> {
  return request<ApiKeyItem>(`/keys/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

/** 删除 API Key */
export async function deleteApiKey(id: string): Promise<void> {
  await request<void>(`/keys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
