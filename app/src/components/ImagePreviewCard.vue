<script setup lang="ts">
/**
 * ImagePreviewCard — 图片生成预览卡片
 *
 * 显示 AI 生成的图片，支持下载、重新生成、点击放大预览。
 * 使用 CSS Modules。
 */

import { ref } from 'vue'
import { ElImageViewer } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

const props = defineProps<{
  imageUrl?: string
  prompt?: string
  model?: string
  size?: string
  style?: string
  quality?: string
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{
  download: []
  regenerate: []
}>()

const showViewer = ref(false)

function handleDownload() {
  if (!props.imageUrl) return
  const a = document.createElement('a')
  a.href = props.imageUrl
  a.download = `ai-image-${Date.now()}.png`
  a.click()
  emit('download')
}

function openViewer() {
  if (!props.imageUrl) return
  showViewer.value = true
}

function closeViewer() {
  showViewer.value = false
}

/** 将 style 值映射为中文 */
const styleLabel: Record<string, string> = {
  vivid: '鲜艳',
  natural: '自然',
}

/** 将 quality 值映射为中文 */
const qualityLabel: Record<string, string> = {
  standard: '标准',
  hd: '高清',
}
</script>

<template>
  <div :class="$styles.card">
    <div :class="$styles.header">
      <div :class="$styles.titleRow">
        <AppIcon name="picture" :size="16" :style="{ color: '#E6A23C' }" />
        <span :class="$styles.title">AI 图片生成</span>
      </div>
      <div v-if="model" :class="$styles.modelBadge">{{ model }}</div>
    </div>

    <div v-if="prompt" :class="$styles.prompt">
      <span :class="$styles.promptLabel">Prompt：</span>{{ prompt }}
    </div>

    <div :class="$styles.imageContainer">
      <div v-if="loading" :class="$styles.loadingOverlay">
        <div :class="$styles.spinner" />
        <span>正在生成图片...</span>
      </div>

      <div v-else-if="error" :class="$styles.errorOverlay">
        <AppIcon name="warning" :size="24" />
        <span>{{ error }}</span>
      </div>

      <div v-else-if="imageUrl" :class="$styles.imageWrapper" @click="openViewer">
        <img
          :src="imageUrl"
          :class="$styles.image"
          alt="AI generated image"
        />
        <div :class="$styles.zoomHint">
          <AppIcon name="full-screen" :size="16" />
          <span>点击放大</span>
        </div>
      </div>

      <div v-else :class="$styles.placeholder">
        <AppIcon name="picture" :size="32" />
        <span>等待生成</span>
      </div>
    </div>

    <div v-if="size || style || quality" :class="$styles.meta">
      <span v-if="size">
        <AppIcon name="full-screen" :size="12" />
        {{ size }}
      </span>
      <span v-if="style">
        <AppIcon name="brush" :size="12" />
        {{ styleLabel[style] ?? style }}
      </span>
      <span v-if="quality">
        <AppIcon name="picture" :size="12" />
        {{ qualityLabel[quality] ?? quality }}
      </span>
    </div>

    <div v-if="!loading && imageUrl" :class="$styles.actions">
      <button :class="$styles.downloadBtn" @click="handleDownload">
        <AppIcon name="download" :size="14" />
        下载图片
      </button>
      <button :class="$styles.regenerateBtn" @click="emit('regenerate')">
        <AppIcon name="refresh" :size="14" />
        重新生成
      </button>
    </div>
  </div>

  <!-- 全屏图片预览 -->
  <ElImageViewer
    v-if="showViewer && imageUrl"
    :url-list="[imageUrl]"
    :initial-index="0"
    :close-on-press-escape="true"
    teleported
    @close="closeViewer"
  />
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

.modelBadge {
  font-size: 11px;
  color: var(--text-color-secondary, #909399);
  padding: 2px 8px;
  background: var(--bg-color-page, #f5f7fa);
  border-radius: 4px;
}

.prompt {
  padding: 0 16px 12px;
  font-size: 12px;
  color: var(--text-color-regular, #606266);
  line-height: 1.5;
  word-break: break-word;
}

.promptLabel {
  font-weight: 500;
  color: var(--text-color-secondary, #909399);
}

.imageContainer {
  position: relative;
  width: 100%;
  min-height: 200px;
  background: var(--bg-color-page, #f5f7fa);
  display: flex;
  align-items: center;
  justify-content: center;
}

.imageWrapper {
  position: relative;
  width: 100%;
  cursor: pointer;
  line-height: 0;
}

.image {
  width: 100%;
  height: auto;
  display: block;
  transition: filter 0.2s;
}

.imageWrapper:hover .image {
  filter: brightness(0.85);
}

.zoomHint {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.imageWrapper:hover .zoomHint {
  opacity: 1;
}

.loadingOverlay,
.errorOverlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--text-color-secondary, #909399);
  font-size: 13px;
}

.errorOverlay {
  color: var(--color-danger, #f56c6c);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border-color-lighter, #e4e7ed);
  border-top-color: var(--color-primary, #409eff);
  border-radius: 50%;
  animation: imgPreviewSpin 0.8s linear infinite;
}

@keyframes imgPreviewSpin {
  to { transform: rotate(360deg); }
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--text-color-placeholder, #c0c4cc);
  font-size: 13px;
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
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color-lighter, #ebeef5);
}

.downloadBtn,
.regenerateBtn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s;
}

.downloadBtn {
  background: var(--color-primary, #409eff);
  border-color: var(--color-primary, #409eff);
  color: #fff;
}

.downloadBtn:hover {
  background: var(--color-primary-light-3, #79bbff);
}

.regenerateBtn {
  background: transparent;
  border-color: var(--border-color, #dcdfe6);
  color: var(--text-color-regular, #606266);
}

.regenerateBtn:hover {
  border-color: var(--color-primary, #409eff);
  color: var(--color-primary, #409eff);
}
</style>
