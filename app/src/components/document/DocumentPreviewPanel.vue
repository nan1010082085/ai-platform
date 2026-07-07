<script setup lang="ts">
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { Attachment } from '@/types'
import styles from './DocumentPreviewPanel.module.scss'

const props = defineProps<{
  attachment: Attachment
}>()

const emit = defineEmits<{
  preview: []
  remove: []
}>()

function iconName(mimetype: string): string {
  return mimetype.startsWith('image/') ? 'picture' : 'document'
}

function onOpen(): void {
  if (props.attachment.status === 'done' && props.attachment.documentId) {
    emit('preview')
  }
}
</script>

<template>
  <div
    :class="[
      styles.chip,
      attachment.status === 'error' && styles.error,
      attachment.status === 'done' && attachment.documentId && styles.clickable,
    ]"
    :title="attachment.status === 'error' ? attachment.error : attachment.filename"
  >
    <span v-if="attachment.status === 'uploading'" :class="styles.spinner" />
    <AppIcon
      v-else
      :name="iconName(attachment.mimetype)"
      :size="14"
      :class="styles.icon"
    />
    <button
      type="button"
      :class="styles.name"
      :disabled="attachment.status !== 'done' || !attachment.documentId"
      @click="onOpen"
    >
      {{ attachment.filename }}
    </button>
    <button
      type="button"
      :class="styles.remove"
      aria-label="移除"
      @click="emit('remove')"
    >
      <AppIcon name="close" :size="12" />
    </button>
  </div>
</template>
