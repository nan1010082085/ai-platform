<script setup lang="ts">
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
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
  <SectionToggle title="LLM 配置" :count="6">
    <FieldRow label="模型" hint="按供应商分组，可筛选或直接输入 model id">
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
    <FieldRow label="对话记忆">
      <el-switch
        :model-value="props.node.data?.useConversationHistory === true"
        @update:model-value="update('useConversationHistory', $event)"
      />
      <span style="margin-left: 8px; font-size: 12px; color: var(--text-color-secondary)">
        注入历史到 LLM
      </span>
    </FieldRow>
    <FieldRow v-if="props.node.data?.useConversationHistory" label="自动写入回复">
      <el-switch
        :model-value="props.node.data?.appendAssistantReply === true"
        @update:model-value="update('appendAssistantReply', $event)"
      />
    </FieldRow>
    <FieldRow v-if="props.node.data?.useConversationHistory" label="历史轮数">
      <el-input-number
        :model-value="Number(props.node.data?.maxHistoryTurns ?? 20)"
        :min="1"
        :max="100"
        @update:model-value="update('maxHistoryTurns', $event)"
      />
    </FieldRow>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" />
</template>
