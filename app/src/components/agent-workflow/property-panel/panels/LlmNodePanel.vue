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
  <SectionToggle title="LLM 配置" :count="3">
    <FieldRow label="模型" hint="选择调用的大模型">
      <el-select
        :model-value="String(props.node.data?.model ?? 'default')"
        @update:model-value="update('model', $event)"
      >
        <el-option label="默认模型 (deepseek-v4-flash)" value="default" />
        <el-option label="DeepSeek V4 Flash" value="deepseek-v4-flash" />
        <el-option label="DeepSeek V4 Pro" value="deepseek-v4-pro" />
        <el-option label="OpenAI GPT-4o" value="gpt-4o" />
        <el-option label="OpenAI GPT-4o mini" value="gpt-4o-mini" />
      </el-select>
    </FieldRow>
    <FieldRow label="输入" textarea hint="User Prompt，支持变量模板">
      <el-input
        type="textarea"
        :rows="4"
        :model-value="String(props.node.data?.prompt ?? '')"
        placeholder="{{$input.message}}"
        @update:model-value="update('prompt', $event)"
      />
    </FieldRow>
    <FieldRow label="系统" textarea hint="System Prompt，可选">
      <el-input
        type="textarea"
        :rows="3"
        :model-value="String(props.node.data?.systemPrompt ?? '')"
        placeholder="你是工作流中的 LLM 节点..."
        @update:model-value="update('systemPrompt', $event)"
      />
    </FieldRow>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" />
</template>
