<script setup lang="ts">
/**
 * DocumentRenderer — attachments + documentSummaries 渲染器
 *
 * 从 AiMessage.vue 提取的文档相关渲染逻辑，统一处理：
 * - 图片附件内联显示（缩略图 + 点击放大 ElImageViewer）
 * - 非图片附件显示为文件 chip（DocumentAttachmentCard）
 * - 文档摘要卡片（DocumentSummaryCard）
 * - 点击非图片附件打开预览抽屉（DocumentPreviewDrawer）
 */

import { ref, computed } from 'vue'
import { ElImageViewer } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { getDocumentFileUrl } from '@/api/aiApi'
import type { MessageDocumentAttachment, MessageDocumentSummary } from '@/types'
import DocumentAttachmentCard from '@/components/document/DocumentAttachmentCard.vue'
import DocumentSummaryCard from '@/components/document/DocumentSummaryCard.vue'
import DocumentPreviewDrawer from '@/components/document/DocumentPreviewDrawer.vue'

const props = defineProps<{
  /** 文件附件列表 */
  attachments?: MessageDocumentAttachment[]
  /** 文档摘要列表（assistant 消息） */
  documentSummaries?: MessageDocumentSummary[]
}>()

const emit = defineEmits<{
  'preview-document': [documentId: string]
}>()

// ---- 附件分类 ----

const imageAttachments = computed(() =>
  (props.attachments ?? []).filter(a => a.mimetype.startsWith('image/')),
)

const nonImageAttachments = computed(() =>
  (props.attachments ?? []).filter(a => !a.mimetype.startsWith('image/')),
)

const imageUrls = computed(() =>
  imageAttachments.value.map(a => getDocumentFileUrl(a.documentId)),
)

// ---- 图片查看器 ----

const imageViewerVisible = ref(false)
const imageViewerIndex = ref(0)

function openImageViewer(index: number): void {
  imageViewerIndex.value = index
  imageViewerVisible.value = true
}

// ---- 文档预览抽屉 ----

const previewDrawerVisible = ref(false)
const previewDocumentId = ref<string | null>(null)

function handlePreviewDocument(documentId: string): void {
  previewDocumentId.value = documentId
  previewDrawerVisible.value = true
  emit('preview-document', documentId)
}
</script>

<template>
  <div :class="$style.root">
    <!-- 图片附件：内联缩略图网格 -->
    <div v-if="imageAttachments.length" :class="$style.imageGrid">
      <div
        v-for="(att, imgIdx) in imageAttachments"
        :key="att.documentId"
        :class="$style.imageItem"
        @click="openImageViewer(imgIdx)"
      >
        <img
          :src="imageUrls[imgIdx]"
          :alt="att.filename"
          :class="$style.inlineImage"
        />
        <div :class="$style.imageZoomHint">
          <AppIcon name="full-screen" :size="14" />
        </div>
      </div>
    </div>

    <!-- 非图片附件：文件 chip 列表 -->
    <div v-if="nonImageAttachments.length" :class="$style.attachmentCards">
      <DocumentAttachmentCard
        v-for="att in nonImageAttachments"
        :key="att.documentId"
        :attachment="att"
        @preview="handlePreviewDocument"
      />
    </div>

    <!-- 文档摘要卡片（assistant 消息） -->
    <div v-if="documentSummaries?.length" :class="$style.summaryCards">
      <DocumentSummaryCard
        v-for="item in documentSummaries"
        :key="item.documentId"
        :item="item"
      />
    </div>

    <!-- 全屏图片查看器 -->
    <ElImageViewer
      v-if="imageViewerVisible && imageUrls.length"
      :url-list="imageUrls"
      :initial-index="imageViewerIndex"
      :close-on-press-escape="true"
      teleported
      @close="imageViewerVisible = false"
    />

    <!-- 文档预览抽屉 -->
    <DocumentPreviewDrawer
      v-model:visible="previewDrawerVisible"
      :document-id="previewDocumentId"
    />
  </div>
</template>

<style module>
.root {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.imageGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.imageItem {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--el-border-color-lighter);
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--el-color-primary);

    .imageZoomHint {
      opacity: 1;
    }
  }
}

.inlineImage {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.imageZoomHint {
  position: absolute;
  bottom: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
}

.attachmentCards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summaryCards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
