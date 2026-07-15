<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import TruncatedTooltipText from '@/components/agent-workflow/property-panel/TruncatedTooltipText.vue'
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
    error: styles.statusError,
    waiting: styles.statusWaiting,
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
      </div>
    </div>

    <div v-if="preview.config.length" :class="styles.section">
      <div :class="styles.sectionTitle">配置</div>
      <div
        v-for="row in preview.config"
        :key="row.key"
        :class="styles.row"
      >
        <TruncatedTooltipText :content="row.label" :class="styles.rowLabel" />
        <el-tooltip
          :content="row.value"
          placement="top"
          :show-after="200"
          :popper-style="{ maxWidth: '360px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }"
        >
          <span :class="[styles.rowValue, toneClass(row.tone)]">
            {{ row.value }}
          </span>
        </el-tooltip>
      </div>
    </div>

    <div v-if="preview.runtime.length" :class="[styles.section, styles.sectionRuntime]">
      <div :class="styles.sectionTitle">执行</div>
      <div
        v-for="row in preview.runtime.filter((r) => r.key !== 'status' && r.key !== 'duration')"
        :key="row.key"
        :class="styles.row"
      >
        <TruncatedTooltipText :content="row.label" :class="styles.rowLabel" />
        <el-tooltip
          :content="row.value"
          placement="top"
          :show-after="200"
          :popper-style="{ maxWidth: '360px', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }"
        >
          <span :class="[styles.rowValue, toneClass(row.tone)]">
            {{ row.value }}
          </span>
        </el-tooltip>
      </div>
      <div v-if="record?.durationMs != null" :class="styles.meta">
        {{ record.durationMs < 1000 ? `${record.durationMs}ms` : `${(record.durationMs / 1000).toFixed(2)}s` }}
      </div>
    </div>

    <Handle v-if="!isEnd && nodeType !== 'intent-router' && nodeType !== 'collaboration-router'" type="source" :position="Position.Right" :class="styles.handle" />
    <Handle
      v-if="nodeType === 'if'"
      id="false"
      type="source"
      :position="Position.Bottom"
      :class="styles.handleFalse"
    />
    <!-- intent-router: 三路出边 (needsAnalysis / matched / general) -->
    <template v-if="nodeType === 'intent-router'">
      <Handle id="needsAnalysis" type="source" :position="Position.Top" :class="styles.handleTop" />
      <Handle id="matched" type="source" :position="Position.Right" :class="styles.handleRight" />
      <Handle id="general" type="source" :position="Position.Bottom" :class="styles.handleBottom" />
    </template>
    <!-- collaboration-router: 三路出边 (continue / nextStep / summarize) -->
    <template v-if="nodeType === 'collaboration-router'">
      <Handle id="continue" type="source" :position="Position.Top" :class="styles.handleTop" />
      <Handle id="nextStep" type="source" :position="Position.Right" :class="styles.handleRight" />
      <Handle id="summarize" type="source" :position="Position.Bottom" :class="styles.handleBottom" />
    </template>
  </div>
</template>
