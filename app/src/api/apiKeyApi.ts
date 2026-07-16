/**
 * API Key 管理客户端
 *
 * 对接 server /api/keys 端点：创建、列表、禁用/启用、删除。
 * 创建时返回完整 sk-...，列表仅返回脱敏前缀。
 * 使用共享 request 模块，无重复基础设施代码。
 */

import { request } from '@/api/shared/request'

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
    body: payload,
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
    body: { status },
  })
}

/** 删除 API Key */
export async function deleteApiKey(id: string): Promise<void> {
  await request<void>(`/keys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
