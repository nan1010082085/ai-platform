<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">
        告警
        <el-badge v-if="total > 0" :value="total" :class="$style.badge" />
      </h3>
      <div :class="$style.filters">
        <button
          v-for="opt in filterOptions"
          :key="opt.value"
          type="button"
          :class="[$style.filterBtn, activeFilter === opt.value ? $style.filterActive : '']"
          @click="activeFilter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div v-if="visibleAlerts.length === 0" :class="$style.empty">
      <AppIcon name="circle-check" :size="24" />
      <span>{{ total === 0 ? '暂无告警' : '当前筛选下无告警' }}</span>
    </div>

    <div v-else :class="$style.list">
      <div
        v-for="alert in visibleAlerts"
        :key="alert.id"
        :class="[$style.item, $style[alert.alertType]]"
      >
        <div :class="$style.icon">
          <AppIcon
            :name="alert.alertType === 'failure' ? 'circle-close-filled' : alert.alertType === 'slow' ? 'warning' : 'info-filled'"
            :size="16"
          />
        </div>
        <div :class="$style.content">
          <div :class="$style.messageHead">
            <el-tag size="small" effect="plain">{{ alert.agentName }}</el-tag>
            <span :class="$style.operation">{{ alert.operation }}</span>
            <el-tag size="small" :type="typeTag(alert.alertType)">{{ typeLabel(alert.alertType) }}</el-tag>
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
import { computed, ref } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { AgentAlert } from '@/types'
import { formatMonitorTime, formatMonitorDuration } from '@/utils/monitorFormat'

const props = defineProps<{
  alerts: AgentAlert[]
  total: number
  currentPage: number
  pageSize: number
}>()

const emit = defineEmits<{
  pageChange: [page: number]
}>()

type Filter = 'all' | 'failure' | 'slow' | 'high_token'
const activeFilter = ref<Filter>('all')

const filterOptions: Array<{ label: string; value: Filter }> = [
  { label: '全部', value: 'all' },
  { label: '失败', value: 'failure' },
  { label: '慢调用', value: 'slow' },
  { label: '高 Token', value: 'high_token' },
]

const visibleAlerts = computed(() => {
  if (activeFilter.value === 'all') return props.alerts
  return props.alerts.filter((a) => a.alertType === activeFilter.value)
})

function handlePageChange(page: number): void {
  emit('pageChange', page)
}

function typeLabel(type: AgentAlert['alertType']): string {
  if (type === 'failure') return '失败'
  if (type === 'slow') return '慢调用'
  return '高 Token'
}

function typeTag(type: AgentAlert['alertType']): 'danger' | 'warning' | 'info' {
  if (type === 'failure') return 'danger'
  if (type === 'slow') return 'warning'
  return 'info'
}
</script>

<style module>
.container {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
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
  gap: 8px;
  margin-bottom: 12px;
  flex-shrink: 0;
  flex-wrap: wrap;
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

.badge { margin-left: 4px; }

.filters {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.filterBtn {
  border: 1px solid var(--el-border-color-lighter);
  background: transparent;
  color: var(--el-text-color-secondary);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
}

.filterActive {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px 12px;
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
  border-radius: 8px;
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
  align-items: flex-start;
  padding-top: 2px;
}

.failure .icon { color: var(--el-color-danger); }
.slow .icon { color: var(--el-color-warning); }
.high_token .icon { color: var(--el-color-info); }

.content {
  flex: 1;
  min-width: 0;
}

.messageHead {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
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
