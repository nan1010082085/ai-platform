/**
 * 插件中心 API 客户端
 *
 * 使用 platform-shared apiClient（自动 401 refresh + retry）。
 * 租户过滤：通过 X-Tenant-Id header 传递 tenantId，服务端 registry 自动按租户合并 overlay。
 * 始终走 apiClient（不做裸 axios 绕路），保证 token refresh 和错误处理统一。
 */

import { apiClient } from '@schema-platform/platform-shared/utils/apiClient'

export interface PluginExpertSummary {
  id: string
  label: string
  description?: string
  legacyAgentKey?: string
  tools: string[]
  skills: string[]
  routing?: {
    keywords?: string[]
    contextSources?: string[]
    priority?: number
  }
  runtime?: string[]
}

export interface PluginSkillSummary {
  id: string
  label: string
  tools: string[]
}

export interface PluginToolSummary {
  name: string
  kind: string
  label?: string
  category?: string
  description?: string
  source?: string
  argsHint?: string
}

export interface PluginMcpServerSummary {
  id: string
  transport: string
  namespace?: string
  builtin?: string
}

export interface PluginWorkflowTemplateSummary {
  id: string
  name: string
  description: string
  category: string
  icon?: string
  defaultName?: string
  author?: string
  version?: string
  tags?: string[]
  graph?: Record<string, unknown>
}

export interface PluginRegistrySnapshot {
  experts: PluginExpertSummary[]
  skills: PluginSkillSummary[]
  tools: PluginToolSummary[]
  mcpServers: PluginMcpServerSummary[]
  workflows?: PluginWorkflowTemplateSummary[]
}

export async function fetchPluginRegistry(tenantId?: string): Promise<PluginRegistrySnapshot> {
  if (!tenantId) {
    return apiClient.get<PluginRegistrySnapshot>('/ai/plugins')
  }
  // 带租户过滤：通过 X-Tenant-Id header 让服务端 registry 加载对应租户 overlay
  return apiClient.get<PluginRegistrySnapshot>('/ai/plugins', {
    headers: { 'X-Tenant-Id': tenantId },
  })
}

export type PluginLocalLayer = 'mcp' | 'tools' | 'experts' | 'skills' | 'workflows'

export interface PluginLocalWriteResult {
  path: string
  reloaded: boolean
}

export async function updatePluginLocalConfig(
  layer: PluginLocalLayer,
  file: string,
  payload: unknown,
): Promise<PluginLocalWriteResult> {
  return apiClient.put<PluginLocalWriteResult>(`/ai/plugins/local/${layer}/${file}`, payload)
}
