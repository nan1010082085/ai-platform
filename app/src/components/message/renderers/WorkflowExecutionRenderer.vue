<script setup lang="ts">
/**
 * WorkflowExecutionRenderer — 工作流执行步骤渲染器
 *
 * 预留渲染器，当步骤类型扩展为 workflow_execution 时启用。
 * 当前步骤类型中未包含此类型，由 AiMessageContent 单独处理。
 */

import type { StepData } from '@/types'
import WorkflowExecutionTimeline from '@/components/workflow/WorkflowExecutionTimeline.vue'

const props = defineProps<{
  step: StepData
}>()

const emit = defineEmits<{
  'workflow-retry': [executionId: string]
  'workflow-detail': [executionId: string]
}>()
</script>

<template>
  <WorkflowExecutionTimeline
    v-if="step.workflowExecution"
    :execution="step.workflowExecution"
  />
</template>
