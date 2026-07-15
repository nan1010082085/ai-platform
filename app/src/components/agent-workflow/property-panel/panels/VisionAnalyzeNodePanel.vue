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
  <SectionToggle title="图片视觉分析" :count="7">
    <DocumentSourceFields :node="props.node" @update-node-data="update" />
    <FieldRow label="视觉模型" hint="按供应商分组；可筛选或直接输入 model id">
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
    <FieldRow label="视觉 Prompt" textarea hint="留空使用默认：场景/UI/布局语义描述">
      <el-input
        type="textarea"
        :rows="3"
        :model-value="String(props.node.data?.visionPrompt ?? '')"
        placeholder="描述图片中的场景、布局、UI 结构..."
        @update:model-value="update('visionPrompt', $event)"
      />
    </FieldRow>
    <FieldRow label="压缩宽度" hint="图片发送给视觉模型前的宽度（px），不填不压缩">
      <el-input-number
        :model-value="props.node.data?.visionImageWidth as number | undefined"
        :min="100"
        :max="4096"
        :step="100"
        placeholder="不压缩"
        clearable
        @update:model-value="update('visionImageWidth', $event)"
      />
    </FieldRow>
    <FieldRow label="JPEG 质量" hint="压缩质量 1-100，不填不压缩">
      <el-input-number
        :model-value="props.node.data?.visionImageQuality as number | undefined"
        :min="1"
        :max="100"
        :step="5"
        placeholder="不压缩"
        clearable
        @update:model-value="update('visionImageQuality', $event)"
      />
    </FieldRow>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" @update-node-data="(key, value) => update(key, value)" />
</template>
