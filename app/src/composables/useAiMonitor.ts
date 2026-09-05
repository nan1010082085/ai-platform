/**
 * 用量与成本页数据：仅加载平台异常列表（成本趋势由 CostTrendCard 自取）。
 * 标签辅助函数供其他监控相关组件复用。
 */
import { ref, onMounted } from 'vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import { getMonitorAlerts } from '@/api/aiApi'
import type { AgentAlert } from '@/types'
import { normalizeDateValue } from '@/utils/monitorFormat'
import { DEFAULT_PAGE_SIZE } from '@schema-platform/platform-shared/utils/pagination'

/**
 * @param agentName - 专家内部名
 * @returns 中文展示名
 */
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

/**
 * @param operation - 操作码
 * @returns 中文展示名
 */
export function getOperationLabel(operation: string): string {
  const labels: Record<string, string> = {
    invoke: '调用',
    tool_call: '工具',
    think: '思考',
    stream: '流式',
  }
  return labels[operation] ?? operation
}

/**
 * @param pluginType - 插件类型
 * @returns 中文展示名
 */
export function getPluginTypeLabel(pluginType: string): string {
  const labels: Record<string, string> = {
    expert: '专家',
    tool: '工具',
    mcp: 'MCP',
    skill: '技能',
  }
  return labels[pluginType] ?? pluginType
}

/**
 * @param pluginType - 插件类型
 * @returns Element Plus Tag type
 */
export function getPluginTypeTagType(pluginType: string): '' | 'success' | 'warning' | 'danger' {
  const map: Record<string, '' | 'success' | 'warning' | 'danger'> = {
    expert: '',
    tool: 'success',
    mcp: 'warning',
    skill: 'danger',
  }
  return map[pluginType] ?? ''
}

/**
 * @param alert - 原始告警
 * @returns 规范化后的告警
 */
function normalizeAlert(alert: AgentAlert): AgentAlert {
  return {
    ...alert,
    id: String(alert.id),
    createdAt: normalizeDateValue(alert.createdAt),
  }
}

/**
 * 用量与成本页：平台异常分页加载
 */
export function useAiMonitor() {
  const loading = ref(false)
  const alerts = ref<AgentAlert[]>([])
  const alertsTotal = ref(0)
  const alertsPage = ref(1)
  const alertsPageSize = ref(DEFAULT_PAGE_SIZE)

  /**
   * @param page - 页码
   */
  async function loadAlerts(page = alertsPage.value): Promise<void> {
    const data = await getMonitorAlerts({ page, pageSize: alertsPageSize.value })
    alerts.value = data.items.map(normalizeAlert)
    alertsTotal.value = data.total
    alertsPage.value = data.page
  }

  async function loadData(): Promise<void> {
    loading.value = true
    try {
      await loadAlerts(1)
    } catch (err) {
      message.error('加载平台异常失败')
      console.error('Failed to load monitor alerts:', err)
    } finally {
      loading.value = false
    }
  }

  async function handleRefresh(): Promise<void> {
    await loadData()
    message.success('数据已刷新')
  }

  /**
   * @param page - 页码
   */
  async function handleAlertPageChange(page: number): Promise<void> {
    loading.value = true
    try {
      await loadAlerts(page)
    } catch (err) {
      message.error('加载平台异常失败')
      console.error('Failed to load alerts:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * @param size - 每页条数
   */
  async function handleAlertPageSizeChange(size: number): Promise<void> {
    alertsPageSize.value = size
    alertsPage.value = 1
    await handleAlertPageChange(1)
  }

  onMounted(() => {
    loadData()
  })

  return {
    loading,
    alerts,
    alertsTotal,
    alertsPage,
    alertsPageSize,
    handleRefresh,
    handleAlertPageChange,
    handleAlertPageSizeChange,
    getAgentLabel,
    getOperationLabel,
    getPluginTypeLabel,
    getPluginTypeTagType,
  }
}
