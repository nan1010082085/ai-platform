/**
 * 用户自有 LLM 凭证（BYOK）API — 对接 /api/ai/user-llm-credentials
 */
import { request } from '@/api/shared/request'

export interface UserLlmCredential {
  id: string
  name: string
  provider: string
  baseUrl: string
  model: string
  isDefault: boolean
  status: string
  apiKey: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateUserLlmCredentialPayload {
  name: string
  provider?: string
  baseUrl?: string
  apiKey: string
  model: string
  isDefault?: boolean
}

export interface UpdateUserLlmCredentialPayload {
  name?: string
  provider?: string
  baseUrl?: string
  apiKey?: string
  model?: string
  isDefault?: boolean
  status?: 'active' | 'disabled'
}

/**
 * 列出当前用户的自有模型凭证
 */
export async function listUserLlmCredentials(): Promise<UserLlmCredential[]> {
  const res = await request<{ items: UserLlmCredential[] }>('/ai/user-llm-credentials', { raw: true })
  return res.items ?? []
}

/**
 * 创建自有模型凭证
 */
export async function createUserLlmCredential(
  payload: CreateUserLlmCredentialPayload,
): Promise<{ item: UserLlmCredential; notice?: string }> {
  return request('/ai/user-llm-credentials', {
    method: 'POST',
    body: payload,
    raw: true,
  })
}

/**
 * 更新自有模型凭证
 */
export async function updateUserLlmCredential(
  id: string,
  payload: UpdateUserLlmCredentialPayload,
): Promise<{ item: UserLlmCredential }> {
  return request(`/ai/user-llm-credentials/${id}`, {
    method: 'PUT',
    body: payload,
    raw: true,
  })
}

/**
 * 删除自有模型凭证
 */
export async function deleteUserLlmCredential(id: string): Promise<void> {
  await request(`/ai/user-llm-credentials/${id}`, {
    method: 'DELETE',
    raw: true,
  })
}
