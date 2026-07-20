import { ref, nextTick, type Ref } from 'vue'
import { useI18n } from '@schema-platform/platform-shared'
import { message } from '@schema-platform/platform-shared/utils/message'
import { uploadFile } from '@/api/aiApi'
import {
  DOCUMENT_FORMAT_LABEL,
  isAllowedDocumentUpload,
} from '@schema-platform/platform-shared/ai'
import type { Attachment } from '@/types'

/**
 * Pending document attachments for the chat input area.
 */
export function useChatAttachments(focusInput?: () => void) {
  const { t } = useI18n()
  const fileInputRef = ref<HTMLInputElement>()
  const fileUploading = ref(0)
  const pendingAttachments = ref<Attachment[]>([])
  const previewDrawerVisible = ref(false)
  const previewDocumentId = ref<string | null>(null)

  function triggerFileUpload(): void {
    fileInputRef.value?.click()
  }

  function handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement
    const files = input.files
    if (files?.length) {
      for (const file of Array.from(files)) {
        void processFile(file)
      }
    }
    input.value = ''
  }

  async function processFile(file: File): Promise<void> {
    if (!isAllowedDocumentUpload(file.name, file.type)) {
      message.error(t('chat.formatSupport', { formats: DOCUMENT_FORMAT_LABEL }))
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      message.error(t('chat.fileTooLarge'))
      return
    }

    const attachment: Attachment = {
      filename: file.name,
      mimetype: file.type,
      size: file.size,
      text: '',
      status: 'uploading',
    }
    pendingAttachments.value.push(attachment)
    const index = pendingAttachments.value.length - 1
    fileUploading.value += 1

    try {
      const result = await uploadFile(file)
      pendingAttachments.value[index] = {
        documentId: result.id,
        filename: result.filename,
        mimetype: result.mimetype,
        size: result.size,
        text: result.text,
        excerpt: result.text.slice(0, 120),
        status: 'done',
      }
      message.success(t('chat.uploadSuccess', { name: file.name }))
    } catch (err) {
      pendingAttachments.value[index] = {
        ...attachment,
        status: 'error',
        error: err instanceof Error ? err.message : t('chat.uploadFailed'),
      }
      message.error(t('chat.uploadFailedWithReason', {
        reason: err instanceof Error ? err.message : t('common.unknownError'),
      }))
    } finally {
      fileUploading.value -= 1
      nextTick(() => focusInput?.())
    }
  }

  function removeAttachment(index: number): void {
    pendingAttachments.value.splice(index, 1)
  }

  function openAttachmentPreview(att: Attachment): void {
    if (!att.documentId) return
    previewDocumentId.value = att.documentId
    previewDrawerVisible.value = true
  }

  function openMessageDocumentPreview(documentId: string): void {
    previewDocumentId.value = documentId
    previewDrawerVisible.value = true
  }

  function takeDoneAttachments() {
    const attachmentMeta = pendingAttachments.value
      .filter((a) => a.status === 'done' && a.documentId)
      .map((a) => ({
        documentId: a.documentId!,
        filename: a.filename,
        mimetype: a.mimetype,
        size: a.size,
        excerpt: a.excerpt ?? a.text.slice(0, 120),
      }))
    pendingAttachments.value = []
    return attachmentMeta
  }

  return {
    fileInputRef,
    fileUploading,
    pendingAttachments: pendingAttachments as Ref<Attachment[]>,
    previewDrawerVisible,
    previewDocumentId,
    triggerFileUpload,
    handleFileChange,
    removeAttachment,
    openAttachmentPreview,
    openMessageDocumentPreview,
    takeDoneAttachments,
  }
}
