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

function iconName(mimetype: string): string {
  return mimetype.startsWith('image/') ? 'picture' : 'document'
}
</script>

<template>
  <button
    type="button"
    :class="styles.chip"
    :title="attachment.filename"
    @click="emit('preview', props.attachment.documentId)"
  >
    <AppIcon :name="iconName(attachment.mimetype)" :size="14" :class="styles.icon" />
    <span :class="styles.name">{{ attachment.filename }}</span>
  </button>
</template>
