import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import {
  getMonitorSummary,
  getMonitorStats,
  getMonitorRecent,
  getMonitorAlerts,
  getPluginMetricStats,
  getPluginMetricRecent,
  getPluginMetricSummary,
} from '@/api/aiApi'
import type {
  MonitorSummary,
  AgentMetricStats,
  AgentMetric,
  AgentAlert,
  PluginMetricStats,
  PluginMetric,
  PluginMetricSummary,
} from '@/types'
import { normalizeDateValue } from '@/utils/monitorFormat'

const AUTO_REFRESH_INTERVAL = 30000

export function getAgentLabel(agentName: string): string {
  const labels: Record<string, string> = {
    thinker: '思考',
    editor: '表单',
    flow: '流程',
    general: '通用',
    summarizer: '总结',
    router: '路由',
    page: '页面',
  }
  return labels[agentName] ?? agentName
}

export function getOperationLabel(operation: string): string {
  const labels: Record<string, string> = {
    invoke: '调用',
    tool_call: '工具',
    think: '思考',
    stream: '流式',
  }
  return labels[operation] ?? operation
}

export function getPluginTypeLabel(pluginType: string): string {
  const labels: Record<string, string> = {
    expert: '专家',
    tool: '工具',
    mcp: 'MCP',
    skill: '技能',
  }
  return labels[pluginType] ?? pluginType
}

export function getPluginTypeTagType(pluginType: string): '' | 'success' | 'warning' | 'danger' {
  const map: Record<string, '' | 'success' | 'warning' | 'danger'> = {
    expert: '',
    tool: 'success',
    mcp: 'warning',
    skill: 'danger',
  }
  return map[pluginType] ?? ''
}

function normalizeAlert(alert: AgentAlert): AgentAlert {
  return {
    ...alert,
    id: String(alert.id),
    createdAt: normalizeDateValue(alert.createdAt),
  }
}

function normalizeMetric(metric: AgentMetric): AgentMetric {
  return {
    ...metric,
    id: String(metric.id),
    createdAt: normalizeDateValue(metric.createdAt),
  }
}

export function useAiMonitor() {
  const loading = ref(false)
  const summary = ref<MonitorSummary | null>(null)
  const stats = ref<AgentMetricStats[]>([])
  const recentMetrics = ref<AgentMetric[]>([])
  const alerts = ref<AgentAlert[]>([])
  const alertsTotal = ref(0)
  const alertsPage = ref(1)
  const alertsPageSize = 20
  const autoRefreshOn = ref(true)
  const lastRefreshedAt = ref<Date | null>(null)

  const pluginSummary = ref<PluginMetricSummary | null>(null)
  const pluginStats = ref<PluginMetricStats[]>([])
  const pluginRecentMetrics = ref<PluginMetric[]>([])
  const pluginRecentTotal = ref(0)
  const pluginRecentPage = ref(1)
  const pluginRecentPageSize = 20

  const selectedAgent = ref('')
  const selectedOperation = ref('')
  const selectedPluginType = ref('')

  const timeRangeOptions = [
    { label: '1 小时', value: '1' },
    { label: '6 小时', value: '6' },
    { label: '24 小时', value: '24' },
    { label: '3 天', value: '72' },
    { label: '7 天', value: '168' },
  ]
  const timeRangeValue = ref('24')
  const selectedHours = computed(() => Number(timeRangeValue.value))

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  const agentNames = computed(() => {
    const names = new Set(stats.value.map((s) => s.agentName))
    return Array.from(names).sort()
  })

  const operations = computed(() => {
    const ops = new Set(stats.value.map((s) => s.operation))
    return Array.from(ops).sort()
  })

  const agentDistribution = computed(() => {
    const agentStats = stats.value.reduce(
      (acc, s) => {
        if (!acc[s.agentName]) {
          acc[s.agentName] = { totalCalls: 0, successRate: 0, avgDuration: 0, count: 0 }
        }
        acc[s.agentName].totalCalls += s.totalCalls
        acc[s.agentName].successRate += s.successRate
        acc[s.agentName].avgDuration += s.avgDuration
        acc[s.agentName].count++
        return acc
      },
      {} as Record<string, { totalCalls: number; successRate: number; avgDuration: number; count: number }>,
    )

    const total = Object.values(agentStats).reduce((sum, s) => sum + s.totalCalls, 0)

    return Object.entries(agentStats).map(([agent, data]) => ({
      agent,
      count: data.totalCalls,
      percentage: total > 0 ? Math.round((data.totalCalls / total) * 100) : 0,
      successRate: data.count > 0 ? data.successRate / data.count : 0,
      avgDuration: data.count > 0 ? data.avgDuration / data.count : 0,
    }))
  })

  const filteredStats = computed(() => {
    return stats.value.filter((s) => {
      if (selectedAgent.value && s.agentName !== selectedAgent.value) return false
      if (selectedOperation.value && s.operation !== selectedOperation.value) return false
      return true
    })
  })

  const filteredRecent = computed(() => {
    return recentMetrics.value.filter((m) => {
      if (selectedAgent.value && m.agentName !== selectedAgent.value) return false
      if (selectedOperation.value && m.operation !== selectedOperation.value) return false
      return true
    })
  })

  const topTokenOps = computed(() => {
    return [...filteredStats.value]
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, 5)
  })

  const pluginTypes = computed(() => {
    const types = new Set(pluginStats.value.map((s) => s.pluginType))
    return Array.from(types).sort()
  })

  const filteredPluginStats = computed(() => {
    return pluginStats.value.filter((s) => {
      if (selectedPluginType.value && s.pluginType !== selectedPluginType.value) return false
      return true
    })
  })

  const filteredPluginRecent = computed(() => {
    return pluginRecentMetrics.value.filter((m) => {
      if (selectedPluginType.value && m.pluginType !== selectedPluginType.value) return false
      return true
    })
  })

  const refreshedLabel = computed(() => {
    if (!lastRefreshedAt.value) return '尚未刷新'
    return `上次刷新 ${lastRefreshedAt.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
  })

  async function loadAlerts(page = alertsPage.value): Promise<void> {
    const data = await getMonitorAlerts({ page, pageSize: alertsPageSize })
    alerts.value = data.items.map(normalizeAlert)
    alertsTotal.value = data.total
    alertsPage.value = data.page
  }

  async function loadData(): Promise<void> {
    loading.value = true
    try {
      const [summaryData, statsData, recentData, alertsData, pluginSummaryData, pluginStatsData, pluginRecentData] = await Promise.all([
        getMonitorSummary(selectedHours.value),
        getMonitorStats(),
        getMonitorRecent({ limit: 100 }),
        getMonitorAlerts({ page: 1, pageSize: alertsPageSize }),
        getPluginMetricSummary(selectedHours.value),
        getPluginMetricStats(),
        getPluginMetricRecent({ page: 1, pageSize: pluginRecentPageSize }),
      ])

      summary.value = summaryData
      stats.value = statsData
      recentMetrics.value = recentData.items.map(normalizeMetric)
      alerts.value = alertsData.items.map(normalizeAlert)
      alertsTotal.value = alertsData.total
      alertsPage.value = alertsData.page

      pluginSummary.value = pluginSummaryData
      pluginStats.value = pluginStatsData
      pluginRecentMetrics.value = pluginRecentData.items
      pluginRecentTotal.value = pluginRecentData.total
      pluginRecentPage.value = pluginRecentData.page

      lastRefreshedAt.value = new Date()
    } catch (err) {
      message.error('加载监控数据失败')
      console.error('Failed to load monitor data:', err)
    } finally {
      loading.value = false
    }
  }

  async function handleRefresh(): Promise<void> {
    await loadData()
    message.success('数据已刷新')
  }

  async function handleAlertPageChange(page: number): Promise<void> {
    loading.value = true
    try {
      await loadAlerts(page)
    } catch (err) {
      message.error('加载告警失败')
      console.error('Failed to load alerts:', err)
    } finally {
      loading.value = false
    }
  }

  function startAutoRefresh(): void {
    stopAutoRefresh()
    if (!autoRefreshOn.value) return
    refreshTimer = setInterval(loadData, AUTO_REFRESH_INTERVAL)
  }

  function stopAutoRefresh(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  watch(timeRangeValue, () => loadData())
  watch(autoRefreshOn, () => startAutoRefresh())

  onMounted(() => {
    loadData()
    startAutoRefresh()
  })

  onUnmounted(() => {
    stopAutoRefresh()
  })

  return {
    loading,
    summary,
    alerts,
    alertsTotal,
    alertsPage,
    alertsPageSize,
    autoRefreshOn,
    selectedAgent,
    selectedOperation,
    selectedPluginType,
    timeRangeOptions,
    timeRangeValue,
    agentNames,
    operations,
    agentDistribution,
    filteredStats,
    filteredRecent,
    topTokenOps,
    pluginTypes,
    filteredPluginStats,
    filteredPluginRecent,
    refreshedLabel,
    handleRefresh,
    handleAlertPageChange,
    getAgentLabel,
    getOperationLabel,
    getPluginTypeLabel,
    getPluginTypeTagType,
  }
}
