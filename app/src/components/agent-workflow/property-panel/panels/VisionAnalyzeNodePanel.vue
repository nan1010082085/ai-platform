<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
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
  <SectionToggle title="图片视觉分析" :count="4">
    <DocumentSourceFields :node="props.node" @update-node-data="update" />
    <FieldRow label="视觉 Prompt" textarea hint="留空使用默认：场景/UI/布局语义描述">
      <el-input
        type="textarea"
        :rows="3"
        :model-value="String(props.node.data?.visionPrompt ?? '')"
        placeholder="描述图片中的场景、布局、UI 结构..."
        @update:model-value="update('visionPrompt', $event)"
      />
    </FieldRow>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" @update-node-data="(key, value) => update(key, value)" />
</template>
