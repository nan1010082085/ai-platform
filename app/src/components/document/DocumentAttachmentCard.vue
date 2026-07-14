<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElImageViewer } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { getDocumentFileUrl } from '@/api/aiApi'
import type { MessageDocumentAttachment } from '@/types'
import styles from './DocumentAttachmentCard.module.scss'

const props = defineProps<{
  attachment: MessageDocumentAttachment
}>()

const emit = defineEmits<{
  preview: [documentId: string]
}>()

const isImage = computed(() => props.attachment.mimetype.startsWith('image/'))
const imageUrl = computed(() => isImage.value ? getDocumentFileUrl(props.attachment.documentId) : '')

const showViewer = ref(false)

function handleClick() {
  if (isImage.value) {
    showViewer.value = true
  } else {
    emit('preview', props.attachment.documentId)
  }
}
</script>

<template>
  <!-- Image thumbnail mode -->
  <div v-if="isImage" :class="styles.imageCard" @click="handleClick">
    <img
      :src="imageUrl"
      :alt="attachment.filename"
      :class="styles.thumbnail"
    />
    <div :class="styles.imageOverlay">
      <AppIcon name="full-screen" :size="14" />
    </div>

    <ElImageViewer
      v-if="showViewer"
      :url-list="[imageUrl]"
      :initial-index="0"
      :close-on-press-escape="true"
      teleported
      @close="showViewer = false"
    />
  </div>

  <!-- Non-image: file chip -->
  <button
    v-else
    type="button"
    :class="styles.chip"
    :title="attachment.filename"
    @click="handleClick"
  >
    <AppIcon name="document" :size="14" :class="styles.icon" />
    <span :class="styles.name">{{ attachment.filename }}</span>
  </button>
</template>
