<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { AGENT_NODE_COLORS, getPaletteItem } from '@/constants/agentNodes'
import type { AgentNodeRecord, AgentNodeType, AgentWorkflowNodeData } from '@/types/agentWorkflow'
import {
  getAgentNodePreviewSections,
  getAgentNodeStatusLabel,
  type PreviewTone,
} from '@/utils/agentNodePreview'
import styles from './AgentFlowNode.module.scss'

type NodeData = AgentWorkflowNodeData & { runtimeRecord?: AgentNodeRecord | null }

const TONE_CLASS: Partial<Record<PreviewTone, string>> = {
  muted: styles.toneMuted,
  primary: styles.tonePrimary,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
}

const props = defineProps<{
  id: string
  type?: string
  data?: NodeData
  selected?: boolean
}>()

const nodeType = computed(() => (props.type ?? 'llm') as AgentNodeType)
const nodeData = computed(() => props.data ?? { label: props.id })
const record = computed(() => nodeData.value.runtimeRecord ?? null)
const palette = computed(() => getPaletteItem(nodeType.value))
const color = computed(() => AGENT_NODE_COLORS[nodeType.value] ?? '#909399')
const isTrigger = computed(() => nodeType.value === 'manual-trigger' || nodeType.value === 'webhook-trigger')
const isEnd = computed(() => nodeType.value === 'end')
const statusLabel = computed(() => getAgentNodeStatusLabel(record.value))

const preview = computed(() =>
  getAgentNodePreviewSections(nodeType.value, nodeData.value, record.value),
)

const statusClass = computed(() => {
  if (!record.value) return ''
  const map: Record<string, string | undefined> = {
    success: styles.statusSuccess,
    error: styles.statusError,
    waiting: styles.statusWaiting,
    running: styles.statusRunning,
  }
  return map[record.value.status] ?? ''
})

function toneClass(tone?: PreviewTone): string {
  if (!tone || tone === 'default') return ''
  return TONE_CLASS[tone] ?? ''
}
</script>

<template>
  <div
    :class="[
      styles.node,
      { [styles.selected]: props.selected },
      statusClass,
      record?.status === 'running' && styles.nodeRunning,
    ]"
    :style="{ '--node-accent': color }"
  >
    <Handle v-if="!isTrigger" type="target" :position="Position.Left" :class="styles.handle" />

    <div :class="styles.header">
      <div :class="styles.iconWrap">
        <AppIcon :name="palette?.icon ?? 'connection'" :size="16" />
      </div>
      <div :class="styles.headerBody">
        <div :class="styles.headerTop">
          <span :class="styles.type">{{ palette?.label ?? nodeType }}</span>
          <span v-if="statusLabel" :class="styles.statusBadge">{{ statusLabel }}</span>
        </div>
        <span :class="styles.label">{{ nodeData.label ?? props.id }}</span>
      </div>
    </div>

    <div v-if="preview.config.length" :class="styles.section">
      <div :class="styles.sectionTitle">配置</div>
      <div
        v-for="row in preview.config"
        :key="row.key"
        :class="styles.row"
      >
        <span :class="styles.rowLabel">{{ row.label }}</span>
        <span :class="[styles.rowValue, toneClass(row.tone)]">
          {{ row.value }}
        </span>
      </div>
    </div>

    <div v-if="preview.runtime.length" :class="[styles.section, styles.sectionRuntime]">
      <div :class="styles.sectionTitle">执行</div>
      <div
        v-for="row in preview.runtime.filter((r) => r.key !== 'status' && r.key !== 'duration')"
        :key="row.key"
        :class="styles.row"
      >
        <span :class="styles.rowLabel">{{ row.label }}</span>
        <span :class="[styles.rowValue, toneClass(row.tone)]">
          {{ row.value }}
        </span>
      </div>
      <div v-if="record?.durationMs != null" :class="styles.meta">
        {{ record.durationMs < 1000 ? `${record.durationMs}ms` : `${(record.durationMs / 1000).toFixed(2)}s` }}
      </div>
    </div>

    <Handle v-if="!isEnd" type="source" :position="Position.Right" :class="styles.handle" />
    <Handle
      v-if="nodeType === 'if'"
      id="false"
      type="source"
      :position="Position.Bottom"
      :class="styles.handleFalse"
    />
  </div>
</template>
