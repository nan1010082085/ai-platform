<script setup lang="ts">
import { ref, watch } from 'vue'
import { getDocumentPreview, downloadDocumentFile } from '@/api/aiApi'
import type { DocumentPreviewResult } from '@/api/aiApi'
import styles from './DocumentPreviewDrawer.module.scss'

const props = defineProps<{
  visible: boolean
  documentId: string | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const loading = ref(false)
const preview = ref<DocumentPreviewResult | null>(null)
const error = ref<string | null>(null)
const downloading = ref(false)

async function handleDownloadOriginal(): Promise<void> {
  if (!props.documentId || !preview.value?.hasOriginalFile) return
  downloading.value = true
  try {
    await downloadDocumentFile(props.documentId, preview.value.filename)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '下载失败'
  } finally {
    downloading.value = false
  }
}

watch(
  () => [props.visible, props.documentId] as const,
  async ([visible, documentId]) => {
    if (!visible || !documentId) {
      preview.value = null
      error.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      preview.value = await getDocumentPreview(documentId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载失败'
      preview.value = null
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

function close() {
  emit('update:visible', false)
}
</script>

<template>
  <el-drawer
    :model-value="visible"
    :title="preview?.filename ?? '文档预览'"
    size="50%"
    @update:model-value="emit('update:visible', $event)"
    @close="close"
  >
    <div v-if="loading" :class="styles.loading">加载中...</div>
    <div v-else-if="error" :class="styles.error">{{ error }}</div>
    <div v-else-if="preview" :class="styles.content">
      <div :class="styles.meta">
        {{ preview.mimetype }} · {{ preview.size }} bytes · {{ preview.chunks.length }} 块
        <span v-if="preview.extractionMethod"> · {{ preview.extractionMethod }}</span>
      </div>
      <div v-if="preview.hasOriginalFile" :class="styles.actions">
        <el-button
          size="small"
          type="primary"
          plain
          :loading="downloading"
          @click="handleDownloadOriginal"
        >
          下载原文件
        </el-button>
      </div>
      <el-scrollbar :class="styles.scroll">
        <pre :class="styles.text">{{ preview.text }}</pre>
      </el-scrollbar>
    </div>
  </el-drawer>
</template>
