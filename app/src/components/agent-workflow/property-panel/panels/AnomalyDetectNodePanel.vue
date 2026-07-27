<script setup lang="ts">
/**
 * AnomalyDetectNodePanel - 异常检测节点配置面板
 */
import { computed } from 'vue'
import SectionToggle from '../SectionToggle.vue'
import FieldRow from '../FieldRow.vue'
import { useModelOptions } from '@/composables/useModelOptions'
import ModelOptionSelect from '@/components/ModelOptionSelect.vue'
import type { AgentNodePanelProps } from '../types'
import styles from './shared.module.scss'

const props = defineProps<AgentNodePanelProps>()
const emit = defineEmits<{ 'updateNodeData': [key: string, value: unknown] }>()
const { options: modelOptions } = useModelOptions()

const dimensions = computed(() => (props.node.data?.anomalyDimensions as string[]) ?? [])
const model = computed(() => props.node.data?.model ?? 'default')

const DIMENSION_OPTIONS = [
  { label: '金额', value: 'amount' },
  { label: '频次', value: 'frequency' },
  { label: '时间', value: 'time' },
  { label: '文本语义', value: 'semantic' },
  { label: '数值范围', value: 'range' },
]

function update(key: string, value: unknown) { emit('updateNodeData', key, value) }
</script>

<template>
  <SectionToggle title="异常检测配置" :count="3">
    <FieldRow label="检测维度" hint="选择要检测的异常维度">
      <el-select
        :model-value="dimensions"
        multiple
        placeholder="选择维度"
        style="width: 100%"
        @update:model-value="(v: string[]) => update('anomalyDimensions', v)"
      >
        <el-option v-for="opt in DIMENSION_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </FieldRow>
    <FieldRow label="模型" hint="异常分析使用的 LLM">
      <ModelOptionSelect
        :model-value="model"
        :options="modelOptions"
        @update:model-value="(v: string) => update('model', v)"
      />
    </FieldRow>
    <FieldRow label="系统提示" hint="可选，自定义异常检测规则">
      <el-input
        :model-value="String(props.node.data?.systemPrompt ?? '')"
        type="textarea"
        :rows="2"
        placeholder="自定义异常检测提示（可选）"
        @update:model-value="(v: string) => update('systemPrompt', v)"
      />
    </FieldRow>
  </SectionToggle>
</template>
