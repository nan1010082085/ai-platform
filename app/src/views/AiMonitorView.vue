<script setup lang="ts">
/**
 * Agent 性能监控面板
 *
 * 布局参考 FlowMonitorDashboard：FilterTabs 时间筛选 + 统计卡片 + 双列面板 + 全宽表格
 */

import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import FilterTabs from '@schema-platform/platform-shared/components/common/FilterTabs.vue'
import {
  getMonitorSummary,
  getMonitorStats,
  getMonitorRecent,
  getMonitorAlerts,
} from '@/api/aiApi'
import type {
  MonitorSummary,
  AgentMetricStats,
  AgentMetric,
  AgentAlert,
} from '@/types'
import MonitorSummaryCard from '@/components/monitor/MonitorSummary.vue'
import AgentDistribution from '@/components/monitor/AgentDistribution.vue'
import AlertList from '@/components/monitor/AlertList.vue'
import {
  formatMonitorTime,
  formatMonitorDuration,
  formatMonitorTokens,
  normalizeDateValue,
} from '@/utils/monitorFormat'

const loading = ref(false)
const summary = ref<MonitorSummary | null>(null)
const stats = ref<AgentMetricStats[]>([])
const recentMetrics = ref<AgentMetric[]>([])
const alerts = ref<AgentAlert[]>([])
const alertsTotal = ref(0)
const alertsPage = ref(1)
const alertsPageSize = 20

const selectedAgent = ref<string>('')
const selectedOperation = ref<string>('')

const timeRangeOptions = [
  { label: '1 小时', value: '1' },
  { label: '6 小时', value: '6' },
  { label: '24 小时', value: '24' },
  { label: '3 天', value: '72' },
  { label: '7 天', value: '168' },
]
const timeRangeValue = ref('24')
const selectedHours = computed(() => Number(timeRangeValue.value))

watch(timeRangeValue, () => loadData())

let refreshTimer: ReturnType<typeof setInterval> | null = null
const AUTO_REFRESH_INTERVAL = 30000

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

function getAgentLabel(agentName: string): string {
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

function getOperationLabel(operation: string): string {
  const labels: Record<string, string> = {
    invoke: '调用',
    tool_call: '工具',
    think: '思考',
    stream: '流式',
  }
  return labels[operation] ?? operation
}

async function loadAlerts(page = alertsPage.value): Promise<void> {
  const data = await getMonitorAlerts({ page, pageSize: alertsPageSize })
  alerts.value = data.items.map(normalizeAlert)
  alertsTotal.value = data.total
  alertsPage.value = data.page
}

async function loadData(): Promise<void> {
  loading.value = true
  try {
    const [summaryData, statsData, recentData, alertsData] = await Promise.all([
      getMonitorSummary(selectedHours.value),
      getMonitorStats(),
      getMonitorRecent({ limit: 100 }),
      getMonitorAlerts({ page: 1, pageSize: alertsPageSize }),
    ])

    summary.value = summaryData
    stats.value = statsData
    recentMetrics.value = recentData.items.map(normalizeMetric)
    alerts.value = alertsData.items.map(normalizeAlert)
    alertsTotal.value = alertsData.total
    alertsPage.value = alertsData.page
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
  refreshTimer = setInterval(loadData, AUTO_REFRESH_INTERVAL)
}

function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  loadData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div :class="$style.dashboard" v-loading="loading">
    <div :class="$style.header">
      <h2 :class="$style.title">Agent 性能监控</h2>
      <div :class="$style.headerActions">
        <div :class="$style.timeRangeGroup">
          <FilterTabs v-model="timeRangeValue" :options="timeRangeOptions" />
        </div>
        <el-select
          v-model="selectedAgent"
          placeholder="所有 Agent"
          clearable
          size="small"
          :class="$style.filterSelect"
        >
          <el-option
            v-for="name in agentNames"
            :key="name"
            :label="getAgentLabel(name)"
            :value="name"
          />
        </el-select>
        <el-select
          v-model="selectedOperation"
          placeholder="所有操作"
          clearable
          size="small"
          :class="$style.filterSelect"
        >
          <el-option
            v-for="op in operations"
            :key="op"
            :label="getOperationLabel(op)"
            :value="op"
          />
        </el-select>
        <el-button type="primary" size="small" :loading="loading" @click="handleRefresh">
          刷新
        </el-button>
      </div>
    </div>

    <MonitorSummaryCard :summary="summary" :class="$style.summaryRow" />

    <div :class="$style.panelRow">
      <AgentDistribution :distribution="agentDistribution" />
      <AlertList
        :alerts="alerts"
        :total="alertsTotal"
        :current-page="alertsPage"
        :page-size="alertsPageSize"
        @page-change="handleAlertPageChange"
      />
    </div>

    <div :class="$style.section">
      <h3 :class="$style.sectionTitle">Agent 统计</h3>
      <el-table :data="filteredStats" stripe size="small" :class="$style.table">
        <el-table-column label="Agent" min-width="88">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.agentName === 'editor' ? 'primary' : row.agentName === 'flow' ? 'success' : 'info'"
            >
              {{ getAgentLabel(row.agentName) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="72">
          <template #default="{ row }">
            {{ getOperationLabel(row.operation) }}
          </template>
        </el-table-column>
        <el-table-column label="调用次数" prop="totalCalls" min-width="88" sortable />
        <el-table-column label="成功率" min-width="80" sortable>
          <template #default="{ row }">
            <span :class="row.successRate >= 95 ? 'text-success' : 'text-warning'">
              {{ row.successRate }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column label="平均耗时" min-width="88" sortable>
          <template #default="{ row }">
            {{ formatMonitorDuration(row.avgDuration) }}
          </template>
        </el-table-column>
        <el-table-column label="P95 耗时" min-width="88" sortable>
          <template #default="{ row }">
            {{ formatMonitorDuration(row.p95Duration) }}
          </template>
        </el-table-column>
        <el-table-column label="最大耗时" min-width="88" sortable>
          <template #default="{ row }">
            {{ formatMonitorDuration(row.maxDuration) }}
          </template>
        </el-table-column>
        <el-table-column label="Token 消耗" min-width="96" sortable>
          <template #default="{ row }">
            {{ formatMonitorTokens(row.totalTokens) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div :class="$style.section">
      <h3 :class="$style.sectionTitle">最近调用</h3>
      <el-table :data="filteredRecent" stripe size="small" :class="$style.table">
        <el-table-column label="时间" min-width="140">
          <template #default="{ row }">
            {{ formatMonitorTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="Agent" min-width="72">
          <template #default="{ row }">
            {{ getAgentLabel(row.agentName) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="72">
          <template #default="{ row }">
            {{ getOperationLabel(row.operation) }}
          </template>
        </el-table-column>
        <el-table-column label="耗时" min-width="80" sortable>
          <template #default="{ row }">
            {{ formatMonitorDuration(row.duration) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" min-width="72">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'" size="small">
              {{ row.success ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="错误" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.error" class="text-danger">{{ row.error }}</span>
            <span v-else class="text-secondary">-</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style module>
.dashboard {
  padding: 24px;
  min-height: 100%;
  background: var(--el-bg-color-page, #f5f7fa);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.headerActions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.timeRangeGroup {
  display: flex;
  align-items: center;
}

.filterSelect {
  width: 132px;
}

.summaryRow {
  margin-bottom: 16px;
}

.panelRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
  height: 300px;
}

.panelRow > * {
  min-height: 0;
}

.section {
  background: var(--el-bg-color, #fff);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.sectionTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  margin: 0 0 12px 0;
}

.table {
  width: 100%;
}

@media (max-width: 900px) {
  .panelRow {
    grid-template-columns: 1fr;
    height: auto;
  }

  .panelRow > * {
    height: 280px;
  }
}

:global(.text-success) {
  color: var(--el-color-success, #67c23a);
}

:global(.text-warning) {
  color: var(--el-color-warning, #e6a23c);
}

:global(.text-danger) {
  color: var(--el-color-danger, #f56c6c);
}

:global(.text-secondary) {
  color: var(--el-text-color-secondary, #909399);
}
</style>
