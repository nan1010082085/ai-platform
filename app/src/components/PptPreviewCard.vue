<script setup lang="ts">
/**
 * PptPreviewCard — PPT 生成预览卡片
 *
 * 显示 AI 生成的 PPT 概览，支持下载 .pptx 文件。
 */

import { ref, computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

export interface PptSlide {
  index: number
  type: 'title' | 'content' | 'chart' | 'comparison' | 'summary'
  heading: string
  content?: string[]
  speakerNotes?: string
}

export interface PptMetadata {
  title: string
  template: string
  totalSlides: number
  style: string
}

const props = defineProps<{
  slides?: PptSlide[]
  metadata?: PptMetadata
  loading?: boolean
  error?: string
  blob?: Blob
}>()

const emit = defineEmits<{
  download: []
}>()

const previewSlides = computed(() => (props.slides ?? []).slice(0, 4))

const templateLabels: Record<string, string> = {
  business: '商务',
  tech: '科技',
  education: '教育',
  creative: '创意',
}

const styleLabels: Record<string, string> = {
  professional: '专业',
  casual: '休闲',
  academic: '学术',
}

const typeIcons: Record<string, string> = {
  title: 'document',
  content: 'notebook',
  chart: 'data-line',
  comparison: 'scale-to-original',
  summary: 'document-checked',
}

function handleDownload() {
  if (props.blob) {
    const url = URL.createObjectURL(props.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.metadata?.title ?? 'presentation'}.pptx`
    a.click()
    URL.revokeObjectURL(url)
  } else {
    emit('download')
  }
}
</script>

<template>
  <div :class="$styles.card">
    <div :class="$styles.header">
      <div :class="$styles.titleRow">
        <AppIcon name="data-board" :size="16" :style="{ color: '#67C23A' }" />
        <span :class="$styles.title">{{ metadata?.title ?? 'AI PPT 生成' }}</span>
      </div>
      <div v-if="metadata" :class="$styles.metaBadges">
        <span :class="$styles.badge">{{ templateLabels[metadata.template] ?? metadata.template }}</span>
        <span :class="$styles.badge">{{ metadata.totalSlides }} 页</span>
      </div>
    </div>

    <div v-if="loading" :class="$styles.loadingState">
      <div :class="$styles.spinner" />
      <span>正在生成 PPT...</span>
    </div>

    <div v-else-if="error" :class="$styles.errorState">
      <AppIcon name="warning" :size="24" />
      <span>{{ error }}</span>
    </div>

    <div v-else-if="previewSlides.length" :class="$styles.previewGrid">
      <div
        v-for="slide in previewSlides"
        :key="slide.index"
        :class="$styles.slideThumb"
      >
        <div :class="$styles.slideHeader">
          <AppIcon :name="typeIcons[slide.type] ?? 'document'" :size="12" />
          <span>{{ slide.heading }}</span>
        </div>
        <div :class="$styles.slideBody">
          <div v-if="slide.content?.length" :class="$styles.slideContent">
            <div v-for="(point, i) in slide.content.slice(0, 3)" :key="i" :class="$styles.slidePoint">
              {{ point }}
            </div>
            <div v-if="slide.content.length > 3" :class="$styles.slideMore">
              +{{ slide.content.length - 3 }} 更多
            </div>
          </div>
          <div v-else :class="$styles.slideEmpty">暂无内容</div>
        </div>
        <div :class="$styles.slideIndex">{{ slide.index }}</div>
      </div>

      <div v-if="(slides?.length ?? 0) > 4" :class="$styles.moreSlides">
        <span>+{{ (slides?.length ?? 0) - 4 }} 页</span>
      </div>
    </div>

    <div v-if="metadata" :class="$styles.meta">
      <span v-if="metadata.style">
        <AppIcon name="brush" :size="12" />
        {{ styleLabels[metadata.style] ?? metadata.style }}
      </span>
      <span>
        <AppIcon name="document" :size="12" />
        {{ metadata.totalSlides }} 页
      </span>
    </div>

    <div v-if="!loading && slides?.length" :class="$styles.actions">
      <button :class="$styles.downloadBtn" @click="handleDownload">
        <AppIcon name="download" :size="14" />
        下载 PPT
      </button>
    </div>
  </div>
</template>

<style module>
.card {
  border: 1px solid var(--border-color-lighter, #e4e7ed);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-color, #fff);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.titleRow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color-primary, #303133);
}

.metaBadges {
  display: flex;
  gap: 6px;
}

.badge {
  font-size: 11px;
  color: var(--text-color-secondary, #909399);
  padding: 2px 8px;
  background: var(--bg-color-page, #f5f7fa);
  border-radius: 4px;
}

.loadingState,
.errorState {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 16px;
  color: var(--text-color-secondary, #909399);
  font-size: 13px;
}

.errorState {
  color: var(--color-danger, #f56c6c);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-color-lighter, #e4e7ed);
  border-top-color: var(--color-success, #67c23a);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.previewGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 0 16px 12px;
}

.slideThumb {
  position: relative;
  border: 1px solid var(--border-color-lighter, #e4e7ed);
  border-radius: 6px;
  overflow: hidden;
  background: #fafafa;
  aspect-ratio: 16 / 10;
}

.slideHeader {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-color-primary, #303133);
  background: var(--bg-color, #fff);
  border-bottom: 1px solid var(--border-color-lighter, #e4e7ed);
}

.slideBody {
  padding: 6px 8px;
}

.slideContent {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.slidePoint {
  font-size: 9px;
  color: var(--text-color-regular, #606266);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slideMore {
  font-size: 9px;
  color: var(--text-color-secondary, #909399);
  font-style: italic;
}

.slideEmpty {
  font-size: 9px;
  color: var(--text-color-placeholder, #c0c4cc);
}

.slideIndex {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-size: 10px;
  color: var(--text-color-placeholder, #c0c4cc);
  font-weight: 500;
}

.moreSlides {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--border-color, #dcdfe6);
  border-radius: 6px;
  aspect-ratio: 16 / 10;
  font-size: 12px;
  color: var(--text-color-secondary, #909399);
}

.meta {
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--text-color-secondary, #909399);
}

.meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.actions {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color-lighter, #ebeef5);
}

.downloadBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--color-success, #67c23a);
  background: var(--color-success, #67c23a);
  color: #fff;
  transition: all 0.2s;
}

.downloadBtn:hover {
  background: var(--color-success-light-3, #95d475);
}
</style>
