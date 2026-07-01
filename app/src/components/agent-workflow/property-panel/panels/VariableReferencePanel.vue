<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import styles from './shared.module.scss'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}
</script>

<template>
  <SectionToggle title="变量引用">
    <ul :class="styles.varList">
      <li><code>{{ '$input.field' }}</code> — 工作流输入</li>
      <li><code>{{ '$json' }}</code> — 上一节点输出</li>
      <li><code>{{ '$node.node-id' }}</code> — 指定节点输出</li>
    </ul>
  </SectionToggle>
</template>
