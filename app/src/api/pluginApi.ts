/**
 * 插件中心 API 客户端
 */

import type { AiApiError } from './aiApi'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'
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
  description?: string
  source?: string
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

function resolveToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export async function fetchPluginRegistry(): Promise<PluginRegistrySnapshot> {
  const headers: Record<string, string> = {}
  const token = resolveToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${BASE_URL}/ai/plugins`, { headers })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const msg = body?.error?.message ?? `${response.status} ${response.statusText}`
    throw new Error(msg)
  }
  const body = await response.json() as { success: boolean; data: PluginRegistrySnapshot }
  if (!body.success) {
    throw new Error('Failed to load plugin registry')
  }
  return body.data
}

export type { AiApiError }
