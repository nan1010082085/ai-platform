/**
 * useMcpHealth - MCP 工具健康监控
 *
 * 聚合 MCP 工具调用结果，跟踪：
 * - 各 server 的在线状态（online / offline / error）
 * - 各工具的成功率、平均耗时
 * - 最近错误记录
 *
 * 供 McpManagerView 展示健康指标。
 */
import { ref, computed } from 'vue'
import {
  fetchMcpTools,
  testMcpTool,
  type McpServerInfo,
  type McpTestResult,
} from '@/api/aiApi/mcp'

export interface ToolMetric {
  name: string
  server: string
  totalCalls: number
  successCount: number
  errorCount: number
  avgDurationMs: number
  lastDurationMs: number
  lastError: string | null
  lastTestedAt: Date | null
}

export interface ServerHealth {
  id: string
  status: 'online' | 'offline' | 'error' | 'unknown'
  toolCount: number
  tools: ToolMetric[]
  lastCheckedAt: Date | null
}

export function useMcpHealth() {
  const servers = ref<McpServerInfo[]>([])
  const metrics = ref<Map<string, ToolMetric>>(new Map())
  const loading = ref(false)
  const checking = ref(false)

  const serverHealths = computed<ServerHealth[]>(() =>
    servers.value.map((s) => {
      const tools = s.tools.map((t) =>
        metrics.value.get(`${s.id}:${t.name}`) ?? {
          name: t.name,
          server: s.id,
          totalCalls: 0,
          successCount: 0,
          errorCount: 0,
          avgDurationMs: 0,
          lastDurationMs: 0,
          lastError: null,
          lastTestedAt: null,
        },
      )
      return {
        id: s.id,
        status: s.error ? 'error' : 'online' as const,
        toolCount: s.tools.length,
        tools,
        lastCheckedAt: null,
      }
    }),
  )

  const totalTools = computed(() =>
    servers.value.reduce((sum, s) => sum + s.tools.length, 0),
  )

  const unhealthyCount = computed(() =>
    serverHealths.value.filter((s) => s.status !== 'online').length,
  )

  async function loadServers() {
    loading.value = true
    try {
      servers.value = await fetchMcpTools()
    } finally {
      loading.value = false
    }
  }

  function recordResult(result: McpTestResult) {
    const key = `${result.server}:${result.tool}`
    const existing = metrics.value.get(key)
    const duration = result.duration

    if (existing) {
      const newTotal = existing.totalCalls + 1
      const newSuccess = existing.successCount + (result.isError ? 0 : 1)
      const newError = existing.errorCount + (result.isError ? 1 : 0)
      const newAvg = Math.round((existing.avgDurationMs * existing.totalCalls + duration) / newTotal)
      metrics.value.set(key, {
        ...existing,
        totalCalls: newTotal,
        successCount: newSuccess,
        errorCount: newError,
        avgDurationMs: newAvg,
        lastDurationMs: duration,
        lastError: result.isError ? String(result.result).slice(0, 200) : null,
        lastTestedAt: new Date(),
      })
    } else {
      metrics.value.set(key, {
        name: result.tool,
        server: result.server,
        totalCalls: 1,
        successCount: result.isError ? 0 : 1,
        errorCount: result.isError ? 1 : 0,
        avgDurationMs: duration,
        lastDurationMs: duration,
        lastError: result.isError ? String(result.result).slice(0, 200) : null,
        lastTestedAt: new Date(),
      })
    }
    // trigger reactivity
    metrics.value = new Map(metrics.value)
  }

  async function checkTool(server: string, tool: string, args: Record<string, unknown> = {}) {
    checking.value = true
    try {
      const result = await testMcpTool(server, tool, args)
      recordResult(result)
      return result
    } finally {
      checking.value = false
    }
  }

  /** 批量 ping 所有工具（空参数调用，仅检查可达性） */
  async function pingAll() {
    checking.value = true
    try {
      for (const server of servers.value) {
        for (const tool of server.tools) {
          try {
            const result = await testMcpTool(server.id, tool.name, {})
            recordResult(result)
          } catch {
            // 记录不可达
            const key = `${server.id}:${tool.name}`
            metrics.value.set(key, {
              name: tool.name,
              server: server.id,
              totalCalls: 1,
              successCount: 0,
              errorCount: 1,
              avgDurationMs: 0,
              lastDurationMs: 0,
              lastError: 'Server unreachable',
              lastTestedAt: new Date(),
            })
          }
        }
      }
      metrics.value = new Map(metrics.value)
    } finally {
      checking.value = false
    }
  }

  function getToolMetric(server: string, tool: string): ToolMetric | undefined {
    return metrics.value.get(`${server}:${tool}`)
  }

  function getSuccessRate(server: string, tool: string): number {
    const m = getToolMetric(server, tool)
    if (!m || m.totalCalls === 0) return 0
    return Math.round((m.successCount / m.totalCalls) * 100)
  }

  return {
    servers,
    serverHealths,
    totalTools,
    unhealthyCount,
    loading,
    checking,
    loadServers,
    checkTool,
    pingAll,
    getToolMetric,
    getSuccessRate,
  }
}
