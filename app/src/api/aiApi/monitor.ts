/**
 * 监控 API：Agent 指标、插件指标、告警
 */
import { request } from './base'

export interface MonitorSummary {
  totalCalls: number
  successRate: number
  avgDuration: number
  maxDuration: number
  totalTokens: number
  slowCalls: number
}

export interface AgentMetricStats {
  agentName: string
  operation: string
  totalCalls: number
  successRate: number
  avgDuration: number
  p95Duration: number
  maxDuration: number
  totalTokens: number
}

export interface AgentMetric {
  id: string
  agentName: string
  operation: string
  duration: number
  success: boolean
  error?: string
  tokenUsage?: { total?: number }
  createdAt: string
}

export interface AgentAlert {
  id: string
  agentName: string
  alertType: 'failure' | 'slow' | 'high_token'
  operation: string
  duration: number
  tokenUsage?: { total?: number }
  error?: string
  createdAt: string
}

export interface MonitorPaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getMonitorSummary(hours?: number): Promise<MonitorSummary> {
  const query = hours ? `?hours=${hours}` : ''
  return request<MonitorSummary>(`/ai/monitor/summary${query}`)
}

export async function getMonitorStats(): Promise<AgentMetricStats[]> {
  return request<AgentMetricStats[]>('/ai/monitor/stats')
}

export async function getMonitorRecent(params?: {
  limit?: number
  page?: number
  pageSize?: number
}): Promise<MonitorPaginatedResult<AgentMetric>> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  else if (params?.limit) search.set('limit', String(params.limit))
  const query = search.toString()
  return request<MonitorPaginatedResult<AgentMetric>>(`/ai/monitor/recent${query ? `?${query}` : ''}`)
}

export async function getMonitorAlerts(params?: {
  limit?: number
  page?: number
  pageSize?: number
}): Promise<MonitorPaginatedResult<AgentAlert>> {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  else if (params?.limit) search.set('limit', String(params.limit))
  const query = search.toString()
  return request<MonitorPaginatedResult<AgentAlert>>(`/ai/monitor/alerts${query ? `?${query}` : ''}`)
}

// ---- 插件监控 ----

export interface PluginMetricStats {
  pluginId: string
  pluginName: string
  pluginType: 'expert' | 'tool' | 'mcp' | 'skill'
  totalCalls: number
  successRate: number
  avgDuration: number
  p95Duration: number
  maxDuration: number
  failureRate: number
  recentErrors: Array<{ error: string; at: string }>
}

export interface PluginMetric {
  id: string
  pluginId: string
  pluginName: string
  pluginType: 'expert' | 'tool' | 'mcp' | 'skill'
  duration: number
  success: boolean
  error?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface PluginMetricSummary {
  totalCalls: number
  successRate: number
  avgDuration: number
  maxDuration: number
  slowCalls: number
  activePlugins: number
  periodHours: number
}

export async function getPluginMetricStats(params?: {
  pluginType?: string
  sortBy?: string
  sortOrder?: string
}): Promise<PluginMetricStats[]> {
  const search = new URLSearchParams()
  if (params?.pluginType) search.set('pluginType', params.pluginType)
  if (params?.sortBy) search.set('sortBy', params.sortBy)
  if (params?.sortOrder) search.set('sortOrder', params.sortOrder)
  const query = search.toString()
  return request<PluginMetricStats[]>(`/ai/monitor/plugin-stats${query ? `?${query}` : ''}`)
}

export async function getPluginMetricRecent(params?: {
  pluginId?: string
  pluginType?: string
  success?: string
  page?: number
  pageSize?: number
}): Promise<MonitorPaginatedResult<PluginMetric>> {
  const search = new URLSearchParams()
  if (params?.pluginId) search.set('pluginId', params.pluginId)
  if (params?.pluginType) search.set('pluginType', params.pluginType)
  if (params?.success) search.set('success', params.success)
  if (params?.page) search.set('page', String(params.page))
  if (params?.pageSize) search.set('pageSize', String(params.pageSize))
  const query = search.toString()
  return request<MonitorPaginatedResult<PluginMetric>>(`/ai/monitor/plugin-recent${query ? `?${query}` : ''}`)
}

export async function getPluginMetricSummary(hours?: number): Promise<PluginMetricSummary> {
  const query = hours ? `?hours=${hours}` : ''
  return request<PluginMetricSummary>(`/ai/monitor/plugin-summary${query}`)
}
