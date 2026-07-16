/**
 * 插件中心 API 客户端
 *
 * 使用 platform-shared apiClient（自动 401 refresh + retry）。
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

export interface PluginRegistrySnapshot {
  experts: PluginExpertSummary[]
  skills: PluginSkillSummary[]
  tools: PluginToolSummary[]
  mcpServers: PluginMcpServerSummary[]
}

export async function fetchPluginRegistry(): Promise<PluginRegistrySnapshot> {
  return apiClient.get<PluginRegistrySnapshot>('/ai/plugins')
}

export type PluginLocalLayer = 'mcp' | 'tools' | 'experts' | 'skills'

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
