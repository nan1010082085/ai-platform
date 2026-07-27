<script setup lang="ts">
/**
 * MemoryExtractNodePanel - 长程记忆提取节点配置面板
 *
 * LLM 从对话/节点输出中提取值得记忆的事实/偏好/事件，输出结构化记忆条目。
 * 典型用法：接在 llm 节点之后，提取结果再接 memory-write 持久化。
 */
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import ModelOptionSelect from '@/components/ModelOptionSelect.vue'
import { useModelOptions } from '@/composables/useModelOptions'
import VariableReferencePanel from './VariableReferencePanel.vue'
import type { AgentNodePanelEmits, AgentNodePanelProps } from '../types'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<AgentNodePanelEmits>()
const { options: modelOptions, defaultModel, loading: modelsLoading } = useModelOptions()

function update(key: string, value: unknown) {
  emit('updateNodeData', key, value)
}

const sourceOptions = [
  { label: '工作流输入', value: 'input' },
  { label: '上游节点输出', value: 'lastOutput' },
  { label: '自定义模板', value: 'custom' },
]

const namespaceOptions = [
  { label: '偏好', value: 'preference' },
  { label: '事实', value: 'fact' },
  { label: '事件', value: 'event' },
  { label: '技能', value: 'skill' },
]
</script>

<template>
  <SectionToggle title="长程记忆提取" :count="4">
    <FieldRow label="文本来源" hint="从哪里取待提取的文本">
      <el-select
        :model-value="String(props.node.data?.memoryExtractSource ?? 'lastOutput')"
        @update:model-value="update('memoryExtractSource', $event)"
      >
        <el-option v-for="opt in sourceOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </FieldRow>

    <FieldRow
      v-if="(props.node.data?.memoryExtractSource ?? 'lastOutput') === 'custom'"
      label="自定义模板"
      hint="支持 {{$input.xxx}} / {{$node.xxx}}"
    >
      <el-input
        :model-value="String(props.node.data?.memoryExtractTemplate ?? '')"
        type="textarea"
        :rows="3"
        placeholder="待提取的文本模板"
        @update:model-value="update('memoryExtractTemplate', $event)"
      />
    </FieldRow>

    <FieldRow label="提取模型" hint="提取用 LLM">
      <ModelOptionSelect
        :model-value="String(props.node.data?.memoryExtractModel ?? 'default')"
        :options="modelOptions"
        :default-model="defaultModel"
        :loading="modelsLoading"
        capability="chat"
        @update:model-value="update('memoryExtractModel', $event)"
      />
    </FieldRow>

    <FieldRow label="默认归类" hint="LLM 提取出的记忆默认 namespace">
      <el-select
        :model-value="String(props.node.data?.memoryExtractNamespace ?? 'fact')"
        @update:model-value="update('memoryExtractNamespace', $event)"
      >
        <el-option v-for="opt in namespaceOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </FieldRow>
  </SectionToggle>
  <VariableReferencePanel :node="props.node" @update-node-data="(key, value) => update(key, value)" />
</template>
