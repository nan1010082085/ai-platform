<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import styles from './shared.module.scss'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}
</script>

<template>
  <SectionToggle title="分支条件" :count="1">
    <FieldRow label="表达式" textarea hint="返回 true/false，可用 input、lastOutput、nodeOutputs">
      <el-input
        type="textarea"
        :rows="3"
        :model-value="String(props.node.data?.expression ?? '')"
        placeholder="lastOutput"
        @update:model-value="update('expression', $event)"
      />
    </FieldRow>
    <div :class="styles.hint">出口：右侧为 true，底部为 false</div>
  </SectionToggle>
</template>
