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
  <SectionToggle title="视频分析" :count="6">
    <DocumentSourceFields :node="props.node" @update-node-data="update" />
    <FieldRow label="视觉模型" hint="用于分析视频帧的视觉模型">
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
    <FieldRow label="分析 Prompt" textarea hint="留空使用默认：场景、人物、动作描述">
      <el-input
        type="textarea"
        :rows="3"
        :model-value="String(props.node.data?.visionPrompt ?? '')"
        placeholder="描述视频帧中的场景、人物、动作..."
        @update:model-value="update('visionPrompt', $event)"
      />
    </FieldRow>
    <FieldRow label="最大帧数" hint="提取的关键帧数量（1-30）">
      <el-input-number
        :model-value="props.node.data?.maxFrames ?? 10"
        :min="1"
        :max="30"
        :step="1"
        @update:model-value="update('maxFrames', $event)"
      />
    </FieldRow>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" @update-node-data="(key, value) => update(key, value)" />
</template>
