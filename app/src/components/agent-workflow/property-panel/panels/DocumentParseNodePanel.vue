<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import DocumentSourceFields from './DocumentSourceFields.vue'
import ModelOptionSelect from '@/components/ModelOptionSelect.vue'
import { useModelOptions } from '@/composables/useModelOptions'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()
const { modelOptions, providerGroups, defaultModel, loading: modelsLoading } = useModelOptions()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}
</script>

<template>
  <SectionToggle title="文档解析" :count="4">
    <DocumentSourceFields :node="props.node" @update-node-data="update" />
    <FieldRow label="解析模型" hint="按供应商分组；可筛选或直接输入 model id">
      <ModelOptionSelect
        :model-value="String(props.node.data?.model ?? 'default')"
        :options="modelOptions"
        :groups="providerGroups"
        :loading="modelsLoading"
        show-default-option
        :default-label="`默认模型 (${defaultModel || '未配置'})`"
        @update:model-value="update('model', $event)"
      />
    </FieldRow>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" @update-node-data="(key, value) => update(key, value)" />
</template>
