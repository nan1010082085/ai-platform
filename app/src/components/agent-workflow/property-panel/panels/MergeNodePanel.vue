<script setup lang="ts">
/**
 * 合流节点属性面板
 */
import { computed } from 'vue'
import type { AgentWorkflowNodeData } from '@/types/agentWorkflow'

const props = defineProps<{
  modelValue: AgentWorkflowNodeData
}>()

const emit = defineEmits<{
  'update:modelValue': [AgentWorkflowNodeData]
}>()

const data = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
</script>

<template>
  <div class="merge-panel">
    <el-form label-position="top" size="small">
      <el-form-item label="显示名称">
        <el-input
          :model-value="data.label"
          @update:model-value="data = { ...data, label: $event }"
        />
      </el-form-item>
      <el-form-item label="等待策略">
        <el-select
          :model-value="data.mergeWait || 'all'"
          @update:model-value="data = { ...data, mergeWait: $event }"
        >
          <el-option label="全部前驱完成 (all)" value="all" />
          <el-option label="任一前驱完成 (any)" value="any" />
        </el-select>
      </el-form-item>
      <el-form-item label="文本模板（可选）">
        <el-input
          type="textarea"
          :rows="4"
          placeholder="留空则自动拼接各路上游；可用 {{$node.id}}"
          :model-value="data.mergeTextTemplate || ''"
          @update:model-value="data = { ...data, mergeTextTemplate: $event }"
        />
      </el-form-item>
    </el-form>
  </div>
</template>
