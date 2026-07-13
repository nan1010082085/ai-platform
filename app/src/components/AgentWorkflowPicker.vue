<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { usePublishedAgentWorkflows } from '@/composables/usePublishedAgentWorkflows'
import {
  DEFAULT_CHAT_WORKFLOW_HINT,
  DEFAULT_CHAT_WORKFLOW_LABEL,
} from '@/constants/chatWorkflow'

const DEFAULT_WORKFLOW_VALUE = ''

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

const {
  workflowOptions,
  loading,
  loaded,
  loadPublishedWorkflows,
  isPublishedWorkflow,
} = usePublishedAgentWorkflows()

const selectedValue = computed({
  get: () => {
    if (!props.modelValue) return DEFAULT_WORKFLOW_VALUE
    if (loaded.value && !isPublishedWorkflow(props.modelValue)) return DEFAULT_WORKFLOW_VALUE
    return props.modelValue
  },
  set: (value: string | null | undefined) => {
    const normalized = value ?? DEFAULT_WORKFLOW_VALUE
    emit('update:modelValue', normalized === DEFAULT_WORKFLOW_VALUE ? null : normalized)
  },
})

onMounted(() => {
  loadPublishedWorkflows().catch(() => {})
})

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      loadPublishedWorkflows().catch(() => {})
    }
  },
  { immediate: true },
)

watch(loaded, (isLoaded) => {
  if (!isLoaded || !props.modelValue) return
  if (!isPublishedWorkflow(props.modelValue)) {
    emit('update:modelValue', null)
  }
})

function handleVisibleChange(visible: boolean) {
  if (visible) {
    loadPublishedWorkflows(true).catch(() => {})
  }
}
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
      :placeholder="DEFAULT_CHAT_WORKFLOW_LABEL"
      style="width: 100%"
      @visible-change="handleVisibleChange"
    >
      <el-option :value="DEFAULT_WORKFLOW_VALUE" :label="DEFAULT_CHAT_WORKFLOW_LABEL" />
      <el-option
        v-for="option in workflowOptions"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </el-select>
    <p v-if="showLabel" class="hint">{{ DEFAULT_CHAT_WORKFLOW_HINT }}</p>
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
