<script setup lang="ts">
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { MessageDocumentAttachment } from '@/types'
import styles from './DocumentAttachmentCard.module.scss'

const props = defineProps<{
  attachment: MessageDocumentAttachment
}>()

const emit = defineEmits<{
  preview: [documentId: string]
}>()

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(mimetype: string): boolean {
  return mimetype.startsWith('image/')
}
</script>

<template>
  <div :class="styles.card" @click="emit('preview', props.attachment.documentId)">
    <div :class="styles.icon">
      <AppIcon :name="isImage(attachment.mimetype) ? 'picture' : 'document'" :size="16" />
    </div>
    <div :class="styles.info">
      <span :class="styles.name">{{ attachment.filename }}</span>
      <span :class="styles.meta">{{ formatSize(attachment.size) }}</span>
      <span v-if="attachment.excerpt" :class="styles.excerpt">{{ attachment.excerpt }}</span>
    </div>
  </div>
</template>
