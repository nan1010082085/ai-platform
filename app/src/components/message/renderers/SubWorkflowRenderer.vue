<script setup lang="ts">
/**
 * SubWorkflowRenderer - 子 workflow 调用渲染器
 *
 * 展示子 workflow 的执行状态、名称、耗时，可展开查看详情。
 */
import { ref, computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { StepData } from '@/types'

const props = defineProps<{
  step: StepData
}>()

const emit = defineEmits<{
  'workflow-retry': [executionId: string]
  'workflow-detail': [executionId: string]
}>()

const expanded = ref(false)

const subWorkflowData = computed(() => {
  const data = props.step.subWorkflowData
  if (!data) return null
  return {
    workflowName: data.workflowName ?? '子工作流',
    executionId: data.executionId ?? '',
    status: data.status ?? 'running',
    durationMs: data.durationMs,
    error: data.error,
    nodeCount: data.nodeCount ?? 0,
    completedNodes: data.completedNodes ?? 0,
  }
})

const statusIcon = computed(() => {
  const status = subWorkflowData.value?.status
  switch (status) {
    case 'running': return 'loading'
    case 'success': return 'circle-check'
    case 'error': return 'circle-close'
    case 'waiting': return 'clock'
    case 'cancelled': return 'minus'
    default: return 'more'
  }
})

const statusLabel = computed(() => {
  const status = subWorkflowData.value?.status
  switch (status) {
    case 'running': return '执行中'
    case 'success': return '成功'
    case 'error': return '失败'
    case 'waiting': return '待确认'
    case 'cancelled': return '已取消'
    default: return '等待'
  }
})

const statusType = computed(() => {
  const status = subWorkflowData.value?.status
  switch (status) {
    case 'running': return 'primary'
    case 'success': return 'success'
    case 'error': return 'danger'
    case 'waiting': return 'warning'
    default: return 'info'
  }
})

const durationLabel = computed(() => {
  const ms = subWorkflowData.value?.durationMs
  if (ms == null) return ''
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
})

const progressPercent = computed(() => {
  const data = subWorkflowData.value
  if (!data || data.nodeCount === 0) return 0
  return Math.round((data.completedNodes / data.nodeCount) * 100)
})

function handleRetry() {
  if (subWorkflowData.value?.executionId) {
    emit('workflow-retry', subWorkflowData.value.executionId)
  }
}

function handleDetail() {
  if (subWorkflowData.value?.executionId) {
    emit('workflow-detail', subWorkflowData.value.executionId)
  }
}
</script>

<template>
  <div v-if="subWorkflowData" :class="$style.card">
    <div :class="$style.header" @click="expanded = !expanded">
      <div :class="$style.iconWrap">
        <AppIcon
          :name="statusIcon"
          :size="16"
          :class="subWorkflowData.status === 'running' && $style.iconSpin"
        />
      </div>
      <div :class="$style.info">
        <span :class="$style.name">子工作流：{{ subWorkflowData.workflowName }}</span>
        <span :class="$style.meta">
          <el-tag size="small" :type="statusType">{{ statusLabel }}</el-tag>
          <span v-if="durationLabel" :class="$style.duration">{{ durationLabel }}</span>
        </span>
      </div>
      <AppIcon :name="expanded ? 'arrow-up' : 'arrow-down'" :size="14" :class="$style.expandIcon" />
    </div>

    <div v-if="expanded" :class="$style.detail">
      <div v-if="subWorkflowData.nodeCount > 0" :class="$style.progress">
        <div :class="$style.progressLabel">
          节点进度：{{ subWorkflowData.completedNodes }} / {{ subWorkflowData.nodeCount }}
        </div>
        <el-progress
          :percentage="progressPercent"
          :status="subWorkflowData.status === 'error' ? 'exception' : undefined"
          :stroke-width="6"
        />
      </div>

      <div v-if="subWorkflowData.error" :class="$style.error">
        <AppIcon name="warning-filled" :size="14" />
        <span>{{ subWorkflowData.error }}</span>
      </div>

      <div :class="$style.actions">
        <el-button size="small" @click="handleDetail">
          <AppIcon name="view" :size="14" style="margin-right: 4px" />
          查看详情
        </el-button>
        <el-button v-if="subWorkflowData.status === 'error'" size="small" type="primary" plain @click="handleRetry">
          <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
          重试
        </el-button>
      </div>
    </div>
  </div>
</template>

<style module>
.card {
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  border-radius: 8px;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.header:hover {
  background: var(--el-fill-color-light, #f5f7fa);
}

.iconWrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.duration {
  font-size: 11px;
  color: var(--el-text-color-secondary, #909399);
  font-variant-numeric: tabular-nums;
}

.expandIcon {
  flex-shrink: 0;
  color: var(--el-text-color-secondary, #909399);
}

.detail {
  padding: 12px;
  border-top: 1px solid var(--el-border-color-lighter, #e4e7ed);
  background: var(--el-fill-color-blank, #fff);
}

.progress {
  margin-bottom: 12px;
}

.progressLabel {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  margin-bottom: 8px;
}

.error {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--el-color-error-light-9, #fef0f0);
  color: var(--el-color-danger, #f56c6c);
  font-size: 12px;
  margin-bottom: 12px;
}

.actions {
  display: flex;
  gap: 8px;
}

.iconSpin {
  animation: sub-workflow-spin 1s linear infinite;
}

@keyframes sub-workflow-spin {
  to { transform: rotate(360deg); }
}
</style>
