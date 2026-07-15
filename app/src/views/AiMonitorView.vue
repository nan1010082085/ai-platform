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
import CallPulse from '@/components/monitor/CallPulse.vue'
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
const autoRefreshOn = ref(true)
const lastRefreshedAt = ref<Date | null>(null)

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

const topTokenOps = computed(() => {
  return [...filteredStats.value]
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 5)
})

const refreshedLabel = computed(() => {
  if (!lastRefreshedAt.value) return '尚未刷新'
  return `上次刷新 ${lastRefreshedAt.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
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

watch(autoRefreshOn, () => {
  startAutoRefresh()
})

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
      <div>
        <h2 :class="$style.title">Agent 性能监控</h2>
        <p :class="$style.subtitle">观察成功率、时延与 Token，快速定位慢调用与失败链路</p>
      </div>
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
        <el-switch
          v-model="autoRefreshOn"
          inline-prompt
          active-text="自动"
          inactive-text="手动"
          size="small"
        />
        <span :class="$style.refreshHint">{{ refreshedLabel }}</span>
        <el-button type="primary" size="small" :loading="loading" @click="handleRefresh">
          刷新
        </el-button>
      </div>
    </div>

    <MonitorSummaryCard
      :summary="summary"
      :alert-count="alertsTotal"
      :class="$style.summaryRow"
    />

    <div :class="$style.panelRow">
      <CallPulse :metrics="filteredRecent" />
      <AgentDistribution :distribution="agentDistribution" />
      <AlertList
        :alerts="alerts"
        :total="alertsTotal"
        :current-page="alertsPage"
        :page-size="alertsPageSize"
        @page-change="handleAlertPageChange"
      />
    </div>

    <div :class="$style.tokenRow" v-if="topTokenOps.length">
      <div
        v-for="item in topTokenOps"
        :key="`${item.agentName}-${item.operation}`"
        :class="$style.tokenCard"
      >
        <div :class="$style.tokenHead">
          <span>{{ getAgentLabel(item.agentName) }} / {{ getOperationLabel(item.operation) }}</span>
          <strong>{{ formatMonitorTokens(item.totalTokens) }}</strong>
        </div>
        <div :class="$style.tokenMeta">
          调用 {{ item.totalCalls }} · 成功率 {{ item.successRate }}% · P95 {{ formatMonitorDuration(item.p95Duration) }}
        </div>
        <div :class="$style.tokenBar">
          <div
            :class="$style.tokenFill"
            :style="{ width: `${Math.min(100, Math.round((item.totalTokens / (topTokenOps[0].totalTokens || 1)) * 100))}%` }"
          />
        </div>
      </div>
    </div>

    <div :class="$style.tableRow">
      <div :class="$style.section">
        <div :class="$style.sectionHeader">
          <h3 :class="$style.sectionTitle">Agent 统计</h3>
          <span :class="$style.sectionHint">{{ filteredStats.length }} 组指标</span>
        </div>
        <div :class="$style.tableBody">
          <el-table
            :data="filteredStats"
            stripe
            size="small"
            height="100%"
            :class="$style.table"
          >
            <el-table-column label="Agent" min-width="72">
              <template #default="{ row }">
                <el-tag
                  size="small"
                  :type="row.agentName === 'editor' ? 'primary' : row.agentName === 'flow' ? 'success' : 'info'"
                >
                  {{ getAgentLabel(row.agentName) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="64">
              <template #default="{ row }">
                {{ getOperationLabel(row.operation) }}
              </template>
            </el-table-column>
            <el-table-column label="调用" prop="totalCalls" min-width="64" sortable />
            <el-table-column label="成功率" min-width="72" sortable>
              <template #default="{ row }">
                <span :class="row.successRate >= 95 ? 'text-success' : 'text-warning'">
                  {{ row.successRate }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column label="平均" min-width="72" sortable>
              <template #default="{ row }">
                {{ formatMonitorDuration(row.avgDuration) }}
              </template>
            </el-table-column>
            <el-table-column label="P95" min-width="72" sortable>
              <template #default="{ row }">
                {{ formatMonitorDuration(row.p95Duration) }}
              </template>
            </el-table-column>
            <el-table-column label="Token" min-width="72" sortable>
              <template #default="{ row }">
                {{ formatMonitorTokens(row.totalTokens) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div :class="$style.section">
        <div :class="$style.sectionHeader">
          <h3 :class="$style.sectionTitle">最近调用</h3>
          <span :class="$style.sectionHint">最近 {{ filteredRecent.length }} 条</span>
        </div>
        <div :class="$style.tableBody">
          <el-table
            :data="filteredRecent"
            stripe
            size="small"
            height="100%"
            :class="$style.table"
          >
            <el-table-column label="时间" min-width="88">
              <template #default="{ row }">
                {{ formatMonitorTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="Agent" min-width="64">
              <template #default="{ row }">
                {{ getAgentLabel(row.agentName) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="56">
              <template #default="{ row }">
                {{ getOperationLabel(row.operation) }}
              </template>
            </el-table-column>
            <el-table-column label="耗时" min-width="68" sortable>
              <template #default="{ row }">
                <span :class="row.duration > 3000 ? 'text-warning' : ''">
                  {{ formatMonitorDuration(row.duration) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="状态" min-width="64">
              <template #default="{ row }">
                <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                  {{ row.success ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="错误" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.error" class="text-danger">{{ row.error }}</span>
                <span v-else class="text-secondary">-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
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
  font-weight: 650;
  color: var(--el-text-color-primary, #303133);
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.headerActions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.refreshHint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
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
  grid-template-columns: 1.1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
  height: 320px;
}

.panelRow > * {
  min-height: 0;
}

.tokenRow {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.tokenCard {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 12px;
}

.tokenHead {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.tokenHead strong {
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.tokenMeta {
  margin-top: 6px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.tokenBar {
  margin-top: 8px;
  height: 4px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  overflow: hidden;
}

.tokenFill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #3b82f6);
}

.tableRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
  height: 440px;
}

.tableRow > .section {
  min-height: 0;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
}

.tableBody {
  flex: 1;
  min-height: 0;
}

.section {
  background: var(--el-bg-color, #fff);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.sectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.sectionTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  margin: 0;
}

.sectionHint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.table {
  width: 100%;
}

@media (max-width: 1100px) {
  .panelRow {
    grid-template-columns: 1fr;
    height: auto;
  }

  .panelRow > * {
    height: 280px;
  }

  .tableRow {
    grid-template-columns: 1fr;
    height: auto;
  }

  .tableRow > .section {
    height: 360px;
  }

  .tokenRow {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .tokenRow {
    grid-template-columns: 1fr;
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
