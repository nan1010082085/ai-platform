<script setup lang="ts">
/**
 * SummarizerNodePanel — 多步总结节点属性面板
 *
 * 配置摘要来源、自定义 Prompt、流式输出、模型选择。
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
const { modelOptions, providerGroups, defaultModel, loading: modelsLoading } = useModelOptions()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const summarySource = computed({
  get: () => props.node.data?.summarySource ?? 'taskChain',
  set: (v) => update('summarySource', v),
})

const stream = computed({
  get: () => props.node.data?.stream ?? false,
  set: (v) => update('stream', v),
})
</script>

<template>
  <SectionToggle title="多步总结配置" :count="4">
    <FieldRow label="摘要来源" hint="taskChain 汇总任务链输出，custom 使用自定义 Prompt">
      <el-radio-group v-model="summarySource">
        <el-radio value="taskChain">任务链</el-radio>
        <el-radio value="custom">自定义</el-radio>
      </el-radio-group>
    </FieldRow>

    <FieldRow label="自定义 Prompt" textarea hint="仅当摘要来源为 custom 时生效">
      <el-input
        type="textarea"
        :rows="4"
        :model-value="String(props.node.data?.customPrompt ?? '')"
        placeholder="请根据以下内容生成摘要..."
        @update:model-value="update('customPrompt', $event)"
      />
    </FieldRow>

    <FieldRow label="流式输出" hint="开启后逐块返回摘要内容">
      <el-switch v-model="stream" />
    </FieldRow>

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
  </SectionToggle>

  <VariableReferencePanel :node="props.node" @update-node-data="(key: string, value: unknown) => update(key, value)" />
</template>
