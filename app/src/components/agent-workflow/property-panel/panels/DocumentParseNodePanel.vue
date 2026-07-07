<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import DocumentSourceFields from './DocumentSourceFields.vue'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}
</script>

<template>
  <SectionToggle title="文档解析" :count="3">
    <DocumentSourceFields :node="props.node" @update-node-data="update" />
  </SectionToggle>
  <VariableReferencePanel :node="props.node" @update-node-data="(key, value) => update(key, value)" />
</template>
