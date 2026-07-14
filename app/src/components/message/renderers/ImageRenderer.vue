<script setup lang="ts">
/**
 * ImageRenderer — image_generate 步骤渲染器
 *
 * 封装 ImagePreviewCard，提供与其它 renderer 一致的 step 驱动接口。
 * 支持点击放大（ElImageViewer）、下载、重新生成。
 */

import { computed } from 'vue'
import type { StepData } from '@/types'
import ImagePreviewCard from '@/components/ImagePreviewCard.vue'

const props = defineProps<{
  /** image_generate 类型的步骤数据 */
  step: StepData
}>()

const emit = defineEmits<{
  /** 请求重新生成图片 */
  'image-regenerate': []
  /** 请求下载图片 */
  'image-download': []
}>()

const imageData = computed(() => props.step.imageGenerateData)

const isLoading = computed(() =>
  imageData.value?.loading ?? props.step.status === 'running',
)

const errorMsg = computed(() =>
  imageData.value?.error ?? props.step.error,
)
</script>

<template>
  <div :class="$style.root">
    <ImagePreviewCard
      :image-url="imageData?.imageUrl"
      :prompt="imageData?.prompt"
      :model="imageData?.model"
      :size="imageData?.size"
      :style="imageData?.style"
      :quality="imageData?.quality"
      :loading="isLoading"
      :error="errorMsg"
      @download="emit('image-download')"
      @regenerate="emit('image-regenerate')"
    />
  </div>
</template>

<style module>
.root {
  width: 100%;
}
</style>
