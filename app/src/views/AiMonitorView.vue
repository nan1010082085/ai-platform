<script setup lang="ts">
/**
 * Agent 性能监控面板
 */
import FilterTabs from '@schema-platform/platform-shared/components/common/FilterTabs.vue'
import MonitorSummaryCard from '@/components/monitor/MonitorSummary.vue'
import AgentDistribution from '@/components/monitor/AgentDistribution.vue'
import AlertList from '@/components/monitor/AlertList.vue'
import CallPulse from '@/components/monitor/CallPulse.vue'
import RecentCallsTable from '@/components/monitor/RecentCallsTable.vue'
import {
  useAiMonitor,
  getAgentLabel,
  getOperationLabel,
  getPluginTypeLabel,
  getPluginTypeTagType,
} from '@/composables/useAiMonitor'
import {
  formatMonitorDuration,
  formatMonitorTokens,
  formatMonitorTime,
} from '@/utils/monitorFormat'

const {
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
} = useAiMonitor()
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
          <h3 :class="$style.sectionTitle">插件统计</h3>
          <div :class="$style.sectionActions">
            <el-select
              v-model="selectedPluginType"
              placeholder="所有类型"
              clearable
              size="small"
              :class="$style.filterSelect"
            >
              <el-option
                v-for="t in pluginTypes"
                :key="t"
                :label="getPluginTypeLabel(t)"
                :value="t"
              />
            </el-select>
            <span :class="$style.sectionHint">{{ filteredPluginStats.length }} 个插件</span>
          </div>
        </div>
        <div :class="$style.tableBody">
          <el-table :data="filteredPluginStats" stripe size="small" height="100%" :class="$style.table">
            <el-table-column label="插件" min-width="120">
              <template #default="{ row }">
                <div :class="$style.pluginNameCell">
                  <el-tag size="small" :type="getPluginTypeTagType(row.pluginType)">
                    {{ getPluginTypeLabel(row.pluginType) }}
                  </el-tag>
                  <span :class="$style.pluginName">{{ row.pluginName || row.pluginId }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="调用" prop="totalCalls" min-width="64" sortable />
            <el-table-column label="成功率" min-width="72" sortable>
              <template #default="{ row }">
                <span :class="row.successRate >= 95 ? 'text-success' : 'text-warning'">{{ row.successRate }}%</span>
              </template>
            </el-table-column>
            <el-table-column label="平均" min-width="72" sortable>
              <template #default="{ row }">{{ formatMonitorDuration(row.avgDuration) }}</template>
            </el-table-column>
            <el-table-column label="P95" min-width="72" sortable>
              <template #default="{ row }">{{ formatMonitorDuration(row.p95Duration) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div :class="$style.section">
        <div :class="$style.sectionHeader">
          <h3 :class="$style.sectionTitle">最近插件调用</h3>
          <span :class="$style.sectionHint">最近 {{ filteredPluginRecent.length }} 条</span>
        </div>
        <div :class="$style.tableBody">
          <el-table :data="filteredPluginRecent" stripe size="small" height="100%" :class="$style.table">
            <el-table-column label="时间" min-width="88">
              <template #default="{ row }">{{ formatMonitorTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="插件" min-width="120">
              <template #default="{ row }">
                <el-tag size="small" :type="getPluginTypeTagType(row.pluginType)">
                  {{ getPluginTypeLabel(row.pluginType) }}
                </el-tag>
                {{ row.pluginName || row.pluginId }}
              </template>
            </el-table-column>
            <el-table-column label="耗时" min-width="68" sortable>
              <template #default="{ row }">
                <span :class="row.duration > 3000 ? 'text-warning' : ''">{{ formatMonitorDuration(row.duration) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" min-width="64">
              <template #default="{ row }">
                <el-tag :type="row.success ? 'success' : 'danger'" size="small">{{ row.success ? '成功' : '失败' }}</el-tag>
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

    <div :class="$style.tableRow">
      <div :class="$style.section">
        <div :class="$style.sectionHeader">
          <h3 :class="$style.sectionTitle">Agent 统计</h3>
          <span :class="$style.sectionHint">{{ filteredStats.length }} 组指标</span>
        </div>
        <div :class="$style.tableBody">
          <el-table :data="filteredStats" stripe size="small" height="100%" :class="$style.table">
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
              <template #default="{ row }">{{ getOperationLabel(row.operation) }}</template>
            </el-table-column>
            <el-table-column label="调用" prop="totalCalls" min-width="64" sortable />
            <el-table-column label="成功率" min-width="72" sortable>
              <template #default="{ row }">
                <span :class="row.successRate >= 95 ? 'text-success' : 'text-warning'">{{ row.successRate }}%</span>
              </template>
            </el-table-column>
            <el-table-column label="平均" min-width="72" sortable>
              <template #default="{ row }">{{ formatMonitorDuration(row.avgDuration) }}</template>
            </el-table-column>
            <el-table-column label="P95" min-width="72" sortable>
              <template #default="{ row }">{{ formatMonitorDuration(row.p95Duration) }}</template>
            </el-table-column>
            <el-table-column label="Token" min-width="72" sortable>
              <template #default="{ row }">{{ formatMonitorTokens(row.totalTokens) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <RecentCallsTable :metrics="filteredRecent" />
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
.sectionActions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pluginNameCell {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pluginName {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
