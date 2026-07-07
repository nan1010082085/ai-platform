<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { WorkflowMessageExecution } from '@/types'
import type { AgentNodeRecordStatus } from '@/types/agentWorkflow'
import { AGENT_NODE_TYPE_LABELS } from '@/composables/useAgentNodePropertyPanel'
import { getWorkflowNodeDisplayName } from '@/utils/workflowMessageExecution'
import styles from './WorkflowExecutionTimeline.module.scss'

const props = defineProps<{
  execution: WorkflowMessageExecution
}>()

const collapsed = ref(props.execution.status !== 'running')

watch(
  () => props.execution.status,
  (status) => {
    if (status === 'running') {
      collapsed.value = false
    }
  },
)

const STATUS_ICON: Record<string, string> = {
  running: 'loading',
  success: 'circle-check',
  error: 'circle-close-filled',
  waiting: 'clock',
  skipped: 'minus',
  pending: 'more-filled',
}

const STATUS_HINT: Record<string, string> = {
  running: '执行中',
  success: '',
  error: '失败',
  waiting: '待确认',
  skipped: '已跳过',
  pending: '等待',
}

const headerTitle = computed(() => {
  const name = props.execution.workflowName?.trim()
  switch (props.execution.status) {
    case 'running':
      return name ? `${name} · 执行中` : '工作流执行中'
    case 'success':
      return name ? `${name} · 已完成` : '工作流已完成'
    case 'error':
      return name ? `${name} · 执行失败` : '工作流执行失败'
    case 'waiting':
      return name ? `${name} · 等待确认` : '工作流等待确认'
    case 'cancelled':
      return name ? `${name} · 已停止` : '工作流已停止'
    default:
      return name ?? '工作流执行'
  }
})

const progressText = computed(() => {
  const records = props.execution.nodeRecords
  if (!records.length) return ''
  const done = records.filter((r) => r.status === 'success' || r.status === 'skipped').length
  if (props.execution.status === 'running') {
    return `${done}/${records.length}`
  }
  return `${records.length} 个节点`
})

function resolveNodeLabel(record: { nodeId: string; nodeType: string; nodeName: string }): string {
  const display = getWorkflowNodeDisplayName(record)
  if (display !== record.nodeType) return display
  return AGENT_NODE_TYPE_LABELS[record.nodeType] ?? display
}

function nodeHint(record: {
  nodeId: string
  nodeType: string
  status: AgentNodeRecordStatus
  error?: string
}): string {
  if (record.status === 'running' && props.execution.streamingNodeId === record.nodeId) {
    return record.nodeType === 'llm' ? '生成回复中…' : STATUS_HINT.running
  }
  if (record.status === 'error' && record.error?.trim()) {
    return record.error.trim()
  }
  return STATUS_HINT[record.status] ?? ''
}

function toggleCollapsed(): void {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <div
    :class="[
      styles.block,
      styles[`status${execution.status.charAt(0).toUpperCase()}${execution.status.slice(1)}`],
    ]"
  >
    <button type="button" :class="styles.header" @click="toggleCollapsed">
      <span :class="styles.headerLeft">
        <AppIcon
          :name="collapsed ? 'arrow-right' : 'arrow-down'"
          :size="12"
          :class="styles.chevron"
        />
        <span :class="styles.title">{{ headerTitle }}</span>
      </span>
      <span v-if="progressText" :class="styles.progress">{{ progressText }}</span>
    </button>

    <div v-if="!collapsed" :class="styles.timeline">
      <div
        v-for="(record, index) in execution.nodeRecords"
        :key="record.nodeId"
        :class="[
          styles.item,
          record.status === 'running' && styles.itemRunning,
          execution.streamingNodeId === record.nodeId && styles.itemStreaming,
        ]"
      >
        <div :class="styles.rail">
          <span
            :class="[
              styles.iconWrap,
              styles[`icon${record.status.charAt(0).toUpperCase()}${record.status.slice(1)}`],
            ]"
          >
            <AppIcon
              :name="STATUS_ICON[record.status] ?? 'more-filled'"
              :size="14"
              :class="record.status === 'running' ? styles.spin : undefined"
            />
          </span>
          <span v-if="index < execution.nodeRecords.length - 1" :class="styles.connector" />
        </div>
        <div :class="styles.body">
          <span :class="styles.nodeName">{{ resolveNodeLabel(record) }}</span>
          <span v-if="nodeHint(record)" :class="styles.nodeHint">{{ nodeHint(record) }}</span>
        </div>
      </div>

      <div v-if="!execution.nodeRecords.length" :class="styles.empty">
        等待首个节点开始…
      </div>
    </div>
  </div>
</template>

<style module src="./WorkflowExecutionTimeline.module.scss" />
