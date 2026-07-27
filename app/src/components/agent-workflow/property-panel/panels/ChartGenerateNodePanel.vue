<script setup lang="ts">
/**
 * ChartGenerateNodePanel - 图表生成节点配置面板
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

const chartType = computed(() => props.node.data?.chartType ?? 'auto')
const dataField = computed(() => props.node.data?.chartDataField ?? '')
const model = computed(() => props.node.data?.model ?? 'default')

const CHART_TYPES = [
  { label: '自动推断', value: 'auto' },
  { label: '柱状图', value: 'bar' },
  { label: '折线图', value: 'line' },
  { label: '饼图', value: 'pie' },
  { label: '表格', value: 'table' },
]

function update(key: string, value: unknown) { emit('updateNodeData', key, value) }
</script>

<template>
  <SectionToggle title="图表生成配置" :count="3">
    <FieldRow label="图表类型" hint="auto 时 LLM 根据数据推断">
      <el-select :model-value="chartType" style="width: 100%" @update:model-value="(v: string) => update('chartType', v)">
        <el-option v-for="opt in CHART_TYPES" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </FieldRow>
    <FieldRow label="数据字段" hint="从上游输出中取数据的字段名">
      <el-input
        :model-value="dataField"
        placeholder="如：data / result / submissions"
        @update:model-value="(v: string) => update('chartDataField', v)"
      />
    </FieldRow>
    <FieldRow label="模型" hint="图表类型推断使用的 LLM">
      <ModelOptionSelect
        :model-value="model"
        :options="modelOptions"
        @update:model-value="(v: string) => update('model', v)"
      />
    </FieldRow>
  </SectionToggle>
</template>
