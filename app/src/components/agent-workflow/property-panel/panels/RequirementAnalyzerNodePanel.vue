<script setup lang="ts">
/**
 * RequirementAnalyzerNodePanel — 需求分析节点属性面板
 *
 * 配置 RAG、工具调用、完整性阈值、模型选择。
 */

import { computed } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import VariableReferencePanel from './VariableReferencePanel.vue'
import ModelOptionSelect from '@/components/ModelOptionSelect.vue'
import { useModelOptions } from '@/composables/useModelOptions'
import type { AgentNodePanelProps, AgentNodePanelEmits } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()
const { modelOptions, defaultModel, loading: modelsLoading } = useModelOptions()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const enableRag = computed({
  get: () => props.node.data?.enableRag ?? true,
  set: (v) => update('enableRag', v),
})

const enableTools = computed({
  get: () => props.node.data?.enableTools ?? true,
  set: (v) => update('enableTools', v),
})
</script>

<template>
  <SectionToggle title="需求分析配置" :count="4">
    <FieldRow label="启用 RAG" hint="分析时检索知识库补充上下文">
      <el-switch v-model="enableRag" />
    </FieldRow>

    <FieldRow label="启用工具" hint="分析时允许调用外部工具获取信息">
      <el-switch v-model="enableTools" />
    </FieldRow>

    <FieldRow label="完整性阈值" hint="需求完整性评分达到此百分比视为合格 (0-100)">
      <el-slider
        :model-value="Number(props.node.data?.completenessThreshold ?? 80)"
        :min="0"
        :max="100"
        :step="5"
        show-input
        @update:model-value="update('completenessThreshold', $event)"
      />
    </FieldRow>

    <FieldRow label="模型" hint="选择用于需求分析的大模型">
      <ModelOptionSelect
        :model-value="String(props.node.data?.model ?? 'default')"
        :options="modelOptions"
        :loading="modelsLoading"
        show-default-option
        :default-label="`默认模型 (${defaultModel || '未配置'})`"
        @update:model-value="update('model', $event)"
      />
    </FieldRow>
  </SectionToggle>

  <VariableReferencePanel :node="props.node" @update-node-data="(key: string, value: unknown) => update(key, value)" />
</template>
