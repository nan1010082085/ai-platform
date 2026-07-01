<script setup lang="ts">
import { computed } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import styles from './shared.module.scss'
import {
  EXPERT_AGENT_LABELS,
  getExpertAgentTypeForNode,
  getExpertNodeDescription,
  getExpertNodeTypeLabel,
  isIntentExpertNode,
} from '@/constants/expertNodeTypes'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'
import type { AgentNodeType } from '@/types/agentWorkflow'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

const nodeType = computed(() => (props.node.type ?? 'agent') as AgentNodeType)

const isIntent = computed(() => isIntentExpertNode(nodeType.value))

const expertLabel = computed(() => {
  if (isIntent.value) return '意图识别（自动路由）'
  const kind = getExpertAgentTypeForNode(nodeType.value, props.node.data)
  if (kind && kind !== 'auto') return EXPERT_AGENT_LABELS[kind]
  const legacy = props.node.data?.agentType
  if (legacy && legacy !== 'auto') return EXPERT_AGENT_LABELS[legacy as keyof typeof EXPERT_AGENT_LABELS] ?? legacy
  return getExpertNodeTypeLabel(nodeType.value) ?? '专家 Agent'
})

const expertHint = computed(() =>
  getExpertNodeDescription(nodeType.value)
  ?? (isIntent.value
    ? '运行时分析上游输入，自动选择 Editor / Flow / Page / General 专家并执行'
    : '专家类型由左侧拖拽节点决定，不可更改'),
)

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}
</script>

<template>
  <SectionToggle title="专家配置" :count="isIntent ? 1 : 2">
    <div :class="styles.hint">
      专家类型：{{ expertLabel }}（由节点类型决定）
    </div>
    <FieldRow label="任务指令" textarea hint="可选，覆盖上游输出作为 Agent 输入">
      <el-input
        type="textarea"
        :rows="3"
        :model-value="String(props.node.data?.prompt ?? '')"
        placeholder="留空则使用上游节点输出"
        @update:model-value="update('prompt', $event)"
      />
    </FieldRow>
    <div :class="styles.hint">{{ expertHint }}</div>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" />
</template>
