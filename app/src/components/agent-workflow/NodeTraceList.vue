<script lang="ts">
/**
 * NodeTraceList - 工作流执行节点轨迹列表
 *
 * 从 AgentExecutionDetailView 抽出，WorkflowDebugView 复用。
 * 展示每个节点的状态图标、名称、类型、耗时，点击选中查看详情。
 */

type TagType = 'success' | 'info' | 'warning' | 'danger' | 'primary'

/** 节点状态 -> AppIcon 名称 */
export const NODE_STATUS_ICON: Record<string, string> = {
  running: 'loading',
  success: 'circle-check',
  error: 'circle-close',
  waiting: 'clock',
  skipped: 'minus',
  pending: 'more',
}

/** 节点状态 -> el-tag type */
export const NODE_STATUS_TAG_TYPE: Record<string, TagType> = {
  running: 'primary',
  success: 'success',
  error: 'danger',
  waiting: 'warning',
  cancelled: 'info',
}

/** 节点状态 -> 中文标签 */
export const NODE_STATUS_LABELS: Record<string, string> = {
  pending: '等待',
  running: '执行中',
  success: '成功',
  error: '失败',
  skipped: '跳过',
  waiting: '待确认',
  cancelled: '已取消',
}
</script>

<script setup lang="ts">
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { AgentNodeRecord } from '@/types/agentWorkflow'

const props = defineProps<{
  records: AgentNodeRecord[]
  selectedNodeId?: string | null
}>()

const emit = defineEmits<{
  select: [record: AgentNodeRecord]
}>()

function formatDuration(ms?: number): string {
  if (ms == null) return ''
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}
</script>

<template>
  <div v-if="!records.length" :class="$style.empty">暂无节点记录</div>
  <div v-else :class="$style.list">
    <div
      v-for="record in records"
      :key="`${record.nodeId}-${record.startedAt}`"
      :class="[$style.item, props.selectedNodeId === record.nodeId && $style.itemActive]"
      @click="emit('select', record)"
    >
      <AppIcon
        :name="NODE_STATUS_ICON[record.status] ?? 'connection'"
        :size="14"
        :class="record.status === 'running' && $style.iconSpin"
      />
      <div :class="$style.text">
        <span :class="$style.name">{{ record.nodeName }}</span>
        <span :class="$style.meta">{{ record.nodeType }} · {{ NODE_STATUS_LABELS[record.status] ?? record.status }}</span>
      </div>
      <span v-if="record.durationMs != null" :class="$style.duration">
        {{ formatDuration(record.durationMs) }}
      </span>
    </div>
  </div>
</template>

<style module>
.list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.item:hover {
  background: var(--el-fill-color-light, #f5f7fa);
}

.itemActive {
  background: var(--el-color-primary-light-9, #ecf5ff);
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
}

.duration {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.iconSpin {
  animation: node-trace-spin 1s linear infinite;
}

@keyframes node-trace-spin {
  to { transform: rotate(360deg); }
}
</style>
