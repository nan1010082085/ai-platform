<script setup lang="ts">
/**
 * PptGenerateRenderer — PPT 生成步骤渲染器
 *
 * 封装 PptPreviewCard，提供与 RendererRegistry 一致的 step 驱动接口。
 */

import type { StepData } from '@/types'
import PptPreviewCard from '@/components/PptPreviewCard.vue'

const props = defineProps<{
  step: StepData
}>()

const emit = defineEmits<{
  'ppt-download': []
  'ppt-retry': []
}>()
</script>

<template>
  <PptPreviewCard
    :slides="step.pptGenerateData?.slides"
    :metadata="step.pptGenerateData?.metadata"
    :loading="step.pptGenerateData?.loading ?? step.status === 'running'"
    :error="step.pptGenerateData?.error ?? step.error"
    :blob="step.pptGenerateData?.blob"
    @download="emit('ppt-download')"
  />
</template>
