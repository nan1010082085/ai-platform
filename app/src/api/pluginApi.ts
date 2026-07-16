/**
 * 插件中心 API 客户端
 *
 * 使用 platform-shared apiClient（自动 401 refresh + retry）。
 * 租户过滤：通过 X-Tenant-Id header 传递 tenantId，服务端 registry 自动按租户合并 overlay。
 */

import axios from 'axios'
import { apiClient } from '@schema-platform/platform-shared/utils/apiClient'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/schema-platform/api'
const ACCESS_TOKEN_KEY = 'sfp_access_token'

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

export async function fetchPluginRegistry(tenantId?: string): Promise<PluginRegistrySnapshot> {
  if (!tenantId) {
    return apiClient.get<PluginRegistrySnapshot>('/ai/plugins')
  }
  // 带租户过滤：通过 X-Tenant-Id header 让服务端 registry 加载对应租户 overlay
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  const resp = await axios.get<{ success: boolean; data: PluginRegistrySnapshot }>(
    `${BASE_URL}/ai/plugins`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-Tenant-Id': tenantId,
      },
    },
  )
  return resp.data.data
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
