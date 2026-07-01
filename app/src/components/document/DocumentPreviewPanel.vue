<script setup lang="ts">
import type { Attachment } from '@/types'
import styles from './DocumentPreviewPanel.module.scss'

defineProps<{
  attachment: Attachment
}>()

const emit = defineEmits<{
  preview: []
  remove: []
}>()

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div :class="styles.panel">
    <div :class="styles.header">
      <span :class="styles.title">{{ attachment.filename }}</span>
      <span :class="styles.meta">{{ formatSize(attachment.size) }}</span>
    </div>
    <div v-if="attachment.previewText || attachment.text" :class="styles.body">
      {{ attachment.previewText || attachment.text.slice(0, 800) }}
    </div>
    <div :class="styles.footer">
      <el-button size="small" text type="danger" @click="emit('remove')">移除</el-button>
      <el-button size="small" type="primary" plain @click="emit('preview')">查看全文</el-button>
    </div>
  </div>
</template>
