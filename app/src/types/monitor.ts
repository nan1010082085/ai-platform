/**
 * 监控类型定义
 */

// ---- 监控 ----

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
