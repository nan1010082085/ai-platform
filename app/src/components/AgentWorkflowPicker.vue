<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { usePublishedAgentWorkflows } from '@/composables/usePublishedAgentWorkflows'

const props = withDefaults(defineProps<{
  modelValue: string | null
  size?: 'small' | 'default'
  showLabel?: boolean
}>(), {
  size: 'small',
  showLabel: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const { workflowOptions, loading, loadPublishedWorkflows } = usePublishedAgentWorkflows()

const selectedValue = computed({
  get: () => props.modelValue,
  set: (value: string | null) => emit('update:modelValue', value || null),
})

onMounted(() => {
  loadPublishedWorkflows().catch(() => {})
})

watch(() => props.modelValue, () => {
  if (props.modelValue && workflowOptions.value.length === 0) {
    loadPublishedWorkflows().catch(() => {})
  }
})
</script>

<template>
  <div class="workflow-picker">
    <label v-if="showLabel">Agent 编排</label>
    <el-select
      v-model="selectedValue"
      :size="size"
      clearable
      filterable
      :loading="loading"
      placeholder="默认（LangGraph 对话）"
      style="width: 100%"
      @visible-change="(visible: boolean) => visible && loadPublishedWorkflows(true)"
    >
      <el-option :value="null" label="默认（LangGraph 对话）" />
      <el-option
        v-for="option in workflowOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </el-select>
    <p v-if="showLabel" class="hint">选择已发布的工作流后，发送消息将触发该编排而非默认对话。</p>
  </div>
</template>

<style scoped>
.workflow-picker label {
  display: block;
  font-size: 11px;
  color: #909399;
  margin-bottom: 4px;
}

.hint {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: #909399;
}
</style>
