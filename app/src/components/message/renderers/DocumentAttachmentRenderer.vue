<script setup lang="ts">
/**
 * DocumentAttachmentRenderer — 文档附件步骤渲染器
 *
 * 预留渲染器，当步骤类型扩展为 document_attachment 时启用。
 * 当前步骤类型中未包含此类型，由 DocumentRenderer 单独处理附件。
 */

import type { StepData } from '@/types'
import DocumentAttachmentCard from '@/components/document/DocumentAttachmentCard.vue'

const props = defineProps<{
  step: StepData
}>()

const emit = defineEmits<{
  'document-download': [documentId: string]
}>()
</script>

<template>
  <DocumentAttachmentCard
    v-if="step.attachment"
    :attachment="step.attachment"
    @preview="emit('document-download', $event)"
  />
</template>
