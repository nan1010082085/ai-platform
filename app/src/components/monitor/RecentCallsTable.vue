<script setup lang="ts">
import type { AgentMetric } from '@/types'
import {
  formatMonitorTime,
  formatMonitorDuration,
} from '@/utils/monitorFormat'
import { getAgentLabel, getOperationLabel } from '@/composables/useAiMonitor'

defineProps<{
  metrics: AgentMetric[]
}>()
</script>

<template>
  <div :class="$style.section">
    <div :class="$style.sectionHeader">
      <h3 :class="$style.sectionTitle">最近调用</h3>
      <span :class="$style.sectionHint">最近 {{ metrics.length }} 条</span>
    </div>
    <div :class="$style.tableBody">
      <el-table
        :data="metrics"
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
</template>

<style module>
.section {
  background: var(--el-bg-color, #fff);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 0;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  min-height: 0;
  display: flex;
  flex-direction: column;
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

.tableBody {
  flex: 1;
  min-height: 0;
}

.table {
  width: 100%;
}
</style>
