<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElImageViewer } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import ThreePreviewCard from '@/components/ThreePreviewCard.vue'
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
const isAudio = computed(() => props.attachment.mimetype.startsWith('audio/'))
const isVideo = computed(() => props.attachment.mimetype.startsWith('video/'))
const is3D = computed(() => {
  const ext = props.attachment.filename?.split('.').pop()?.toLowerCase() ?? ''
  return ['gltf', 'glb', 'obj', 'stl', 'fbx'].includes(ext)
    || props.attachment.mimetype.startsWith('model/')
})
const fileUrl = computed(() => getDocumentFileUrl(props.attachment.documentId))

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
      :src="fileUrl"
      :alt="attachment.filename"
      :class="styles.thumbnail"
    />
    <div :class="styles.imageOverlay">
      <AppIcon name="full-screen" :size="14" />
    </div>

    <ElImageViewer
      v-if="showViewer"
      :url-list="[fileUrl]"
      :initial-index="0"
      :close-on-press-escape="true"
      teleported
      @close="showViewer = false"
    />
  </div>

  <!-- Audio: inline player -->
  <div v-else-if="isAudio" :class="styles.mediaCard">
    <div :class="styles.mediaHeader">
      <AppIcon name="microphone" :size="14" :class="styles.icon" />
      <span :class="styles.name">{{ attachment.filename }}</span>
    </div>
    <audio controls preload="metadata" :class="styles.audioPlayer">
      <source :src="fileUrl" :type="attachment.mimetype" />
    </audio>
  </div>

  <!-- Video: inline player -->
  <div v-else-if="isVideo" :class="styles.mediaCard">
    <div :class="styles.mediaHeader">
      <AppIcon name="video-camera" :size="14" :class="styles.icon" />
      <span :class="styles.name">{{ attachment.filename }}</span>
    </div>
    <video controls preload="metadata" :class="styles.videoPlayer">
      <source :src="fileUrl" :type="attachment.mimetype" />
    </video>
  </div>

  <!-- 3D model: model-viewer -->
  <ThreePreviewCard
    v-else-if="is3D"
    :url="fileUrl"
    :filename="attachment.filename"
  />

  <!-- Non-media: file chip -->
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
