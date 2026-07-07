<script setup lang="ts">
import { computed } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import styles from './shared.module.scss'
import { getExpertNodeDescription } from '@/constants/expertNodeTypes'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

const expertHint = computed(() =>
  getExpertNodeDescription('agent-intent')
  ?? '运行时分析上游输入，根据插件专家路由规则自动选择专家并执行',
)

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}
</script>

<template>
  <SectionToggle title="专家配置" :count="1">
    <div :class="styles.hint">
      专家类型：意图识别（自动路由）
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
