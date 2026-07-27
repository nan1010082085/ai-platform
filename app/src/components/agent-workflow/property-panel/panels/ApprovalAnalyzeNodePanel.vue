<script setup lang="ts">
/**
 * ApprovalAnalyzeNodePanel - 审批建议节点属性面板
 *
 * 配置审批提交来源（input/stream/custom）、提交 ID、模型选择。
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

const submissionSource = computed({
  get: () => props.node.data?.approvalSubmissionSource ?? 'input',
  set: (v) => update('approvalSubmissionSource', v),
})

const SOURCE_OPTIONS = [
  { label: '工作流输入', value: 'input', hint: '从 $input 读取提交 ID' },
  { label: '上游节点', value: 'stream', hint: '从上游节点输出读取提交 ID' },
  { label: '自定义', value: 'custom', hint: '手动指定提交 ID' },
]
</script>

<template>
  <SectionToggle title="审批建议配置" :count="3">
    <FieldRow label="提交来源" hint="审批提交 ID 的获取方式">
      <el-select v-model="submissionSource" style="width: 100%">
        <el-option
          v-for="opt in SOURCE_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </FieldRow>

    <FieldRow
      v-if="submissionSource === 'custom'"
      label="提交 ID"
      hint="表单审批提交记录的 ID"
    >
      <el-input
        :model-value="String(props.node.data?.approvalSubmissionId ?? '')"
        placeholder="输入提交 ID"
        @update:model-value="update('approvalSubmissionId', $event)"
      />
    </FieldRow>

    <FieldRow label="模型" hint="审批分析使用的 LLM 模型">
      <ModelOptionSelect
        :model-value="String(props.node.data?.approvalModel ?? 'default')"
        :options="modelOptions"
        :groups="providerGroups"
        :loading="modelsLoading"
        show-default-option
        :default-label="`默认模型 (${defaultModel || '未配置'})`"
        @update:model-value="update('approvalModel', $event)"
      />
    </FieldRow>
  </SectionToggle>

  <VariableReferencePanel :node="props.node" @update-node-data="(key: string, value: unknown) => update(key, value)" />
</template>
