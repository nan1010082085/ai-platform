<script setup lang="ts">
/**
 * DocumentSummaryRenderer — 文档摘要步骤渲染器
 *
 * 预留渲染器，当步骤类型扩展为 document_summary 时启用。
 * 当前步骤类型中未包含此类型，由 DocumentRenderer 单独处理摘要。
 */

import type { StepData } from '@/types'
import DocumentSummaryCard from '@/components/document/DocumentSummaryCard.vue'

const props = defineProps<{
  step: StepData
}>()

const emit = defineEmits<{
  'document-expand': [documentId: string]
}>()
</script>

<template>
  <DocumentSummaryCard
    v-if="step.documentSummary"
    :item="step.documentSummary"
  />
</template>
