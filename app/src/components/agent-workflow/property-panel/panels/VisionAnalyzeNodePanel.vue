<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}
</script>

<template>
  <SectionToggle title="图片视觉分析" :count="4">
    <FieldRow label="来源">
      <el-select
        :model-value="String(props.node.data?.documentSource ?? 'inputField')"
        @update:model-value="update('documentSource', $event)"
      >
        <el-option label="从输入字段" value="inputField" />
        <el-option label="固定文档 ID" value="documentId" />
      </el-select>
    </FieldRow>
    <FieldRow
      v-if="(props.node.data?.documentSource ?? 'inputField') === 'documentId'"
      label="文档 ID"
      hint="支持 {{$input.documentId}} 等模板"
    >
      <el-input
        :model-value="String(props.node.data?.documentId ?? '')"
        placeholder="{{$input.documentId}}"
        @update:model-value="update('documentId', $event)"
      />
    </FieldRow>
    <FieldRow v-else label="输入字段" hint="从 $input 读取图片 documentId">
      <el-input
        :model-value="String(props.node.data?.inputField ?? 'documentId')"
        placeholder="documentId"
        @update:model-value="update('inputField', $event)"
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
  </SectionToggle>
  <VariableReferencePanel :node="props.node" @update-node-data="(key, value) => update(key, value)" />
</template>
