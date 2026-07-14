<script setup lang="ts">
/**
 * ImageGenerateRenderer — 图片生成步骤渲染器
 *
 * 封装 ImagePreviewCard，提供与 RendererRegistry 一致的 step 驱动接口。
 */

import type { StepData } from '@/types'
import ImagePreviewCard from '@/components/ImagePreviewCard.vue'

const props = defineProps<{
  step: StepData
}>()

const emit = defineEmits<{
  'image-retry': []
  'image-download': []
}>()
</script>

<template>
  <ImagePreviewCard
    :image-url="step.imageGenerateData?.imageUrl"
    :prompt="step.imageGenerateData?.prompt"
    :model="step.imageGenerateData?.model"
    :size="step.imageGenerateData?.size"
    :style="step.imageGenerateData?.style"
    :quality="step.imageGenerateData?.quality"
    :loading="step.imageGenerateData?.loading ?? step.status === 'running'"
    :error="step.imageGenerateData?.error ?? step.error"
    @download="emit('image-download')"
    @regenerate="emit('image-retry')"
  />
</template>
