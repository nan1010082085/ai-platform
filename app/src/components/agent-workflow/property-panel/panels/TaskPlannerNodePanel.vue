<script setup lang="ts">
/**
 * TaskPlannerNodePanel — 任务规划节点属性面板
 *
 * 配置输入来源、最大步骤数、规划策略、模型选择。
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

const inputSource = computed({
  get: () => props.node.data?.inputSource ?? 'message',
  set: (v) => update('inputSource', v),
})

const strategy = computed({
  get: () => props.node.data?.strategy ?? 'sequential',
  set: (v) => update('strategy', v),
})
</script>

<template>
  <SectionToggle title="任务规划配置" :count="4">
    <FieldRow label="输入来源" hint="message 直接用用户消息，requirementAnalysis 用需求分析结果">
      <el-radio-group v-model="inputSource">
        <el-radio value="message">用户消息</el-radio>
        <el-radio value="requirementAnalysis">需求分析</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow label="最大步骤数" hint="任务规划的最大步骤上限">
      <el-input-number
        :model-value="Number(props.node.data?.maxSteps ?? 8)"
        :min="1"
        :max="20"
        :step="1"
        @update:model-value="update('maxSteps', $event)"
      />
    </FieldRow>

    <FieldRow label="规划策略" hint="sequential 线性执行，mixed 允许并行">
      <el-radio-group v-model="strategy">
        <el-radio value="sequential">顺序执行</el-radio>
        <el-radio value="mixed">混合策略</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow label="模型" hint="选择用于任务规划的大模型">
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
