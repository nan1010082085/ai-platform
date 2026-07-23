/**
 * LLM 配置 API：供应商管理、用量统计、模型配置、引导词、健康检查
 */
import { request } from './base'

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
  defaultProvider: string
  defaultStrategy: string | null
  availableStrategies: string[]
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

// ---- Prompt 模板库 ----

export interface PromptTemplate {
  id: string
  title: string
  content: string
  category: string
  createdAt: string
}

export async function getPromptTemplates(): Promise<PromptTemplate[]> {
  const res = await request<{ templates: PromptTemplate[] }>('/ai/prompt-templates')
  return res.templates ?? []
}

export async function createPromptTemplate(data: {
  title: string
  content: string
  category?: string
}): Promise<PromptTemplate> {
  const res = await request<{ success: boolean; data: PromptTemplate }>('/ai/prompt-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.data
}

export async function updatePromptTemplate(id: string, data: {
  title?: string
  content?: string
  category?: string
}): Promise<PromptTemplate> {
  const res = await request<{ success: boolean; data: PromptTemplate }>(`/ai/prompt-templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.data
}

export async function deletePromptTemplate(id: string): Promise<void> {
  await request(`/ai/prompt-templates/${id}`, { method: 'DELETE' })
}
