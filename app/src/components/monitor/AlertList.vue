<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">
        告警
        <el-badge v-if="alerts.length > 0" :value="alerts.length" :class="$style.badge" />
      </h3>
    </div>

    <div v-if="alerts.length === 0" :class="$style.empty">
      <el-icon :size="24"><CircleCheck /></el-icon>
      <span>暂无告警</span>
    </div>

    <div v-else :class="$style.list">
      <div
        v-for="alert in alerts"
        :key="alert.id"
        :class="[$style.item, $style[alert.alertType]]"
      >
        <div :class="$style.icon">
          <el-icon v-if="alert.alertType === 'failure'" :size="16"><CircleClose /></el-icon>
          <el-icon v-else-if="alert.alertType === 'slow'" :size="16"><Warning /></el-icon>
          <el-icon v-else :size="16"><InfoFilled /></el-icon>
        </div>
        <div :class="$style.content">
          <div :class="$style.messageHead">
            <span :class="$style.agent">{{ alert.agentName }}</span>
            <span :class="$style.operation">{{ alert.operation }}</span>
          </div>
          <div :class="$style.detail">
            <template v-if="alert.alertType === 'failure'">
              失败：{{ alert.error ?? '未知错误' }}
            </template>
            <template v-else-if="alert.alertType === 'slow'">
              耗时 {{ formatMonitorDuration(alert.duration) }}，超过慢调用阈值
            </template>
            <template v-else-if="alert.alertType === 'high_token'">
              Token 用量 {{ alert.tokenUsage?.total ?? 0 }}，超过用量阈值
            </template>
            <template v-else>性能异常</template>
          </div>
          <div :class="$style.time">{{ formatMonitorTime(alert.createdAt) }}</div>
        </div>
      </div>
    </div>

    <div v-if="total > pageSize" :class="$style.pagination">
      <el-pagination
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        small
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleCheck, CircleClose, Warning, InfoFilled } from '@element-plus/icons-vue'
import type { AgentAlert } from '@/types'
import { formatMonitorTime, formatMonitorDuration } from '@/utils/monitorFormat'

defineProps<{
  alerts: AgentAlert[]
  total: number
  currentPage: number
  pageSize: number
}>()

const emit = defineEmits<{
  pageChange: [page: number]
}>()

function handlePageChange(page: number): void {
  emit('pageChange', page)
}

</script>

<style module>
.container {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge {
  margin-left: 4px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  color: var(--el-text-color-secondary);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  overflow-y: auto;
}

.item {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  border-left: 3px solid;
  width: 100%;
  box-sizing: border-box;
}

.failure {
  background: var(--el-color-danger-light-9);
  border-left-color: var(--el-color-danger);
}

.slow {
  background: var(--el-color-warning-light-9);
  border-left-color: var(--el-color-warning);
}

.high_token {
  background: var(--el-color-info-light-9);
  border-left-color: var(--el-color-info);
}

.icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.failure .icon {
  color: var(--el-color-danger);
}

.slow .icon {
  color: var(--el-color-warning);
}

.high_token .icon {
  color: var(--el-color-info);
}

.content {
  flex: 1;
  min-width: 0;
}

.messageHead {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.agent {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.operation {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.detail {
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.4;
  word-break: break-word;
}

.time {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  flex-shrink: 0;
}
</style>
