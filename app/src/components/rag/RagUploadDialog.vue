<script setup lang="ts">
/**
 * RagUploadDialog - RAG 知识库文档上传弹窗
 *
 * 从 RagKnowledgeBase 抽出。上传文档并自动索引，完成后 emit uploaded 刷新状态。
 */
import { ref } from 'vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { uploadRagDocument } from '@/api/aiApi'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  uploaded: []
}>()

const fileList = ref<File[]>([])
const loading = ref(false)

function handleChange(file: { raw: File }): void {
  fileList.value = [file.raw]
}

async function handleSubmit(): Promise<void> {
  if (fileList.value.length === 0) return
  loading.value = true
  try {
    const result = await uploadRagDocument(fileList.value[0])
    message.success(`文档 "${result.filename}" 上传并索引成功`)
    emit('update:visible', false)
    fileList.value = []
    emit('uploaded')
  } catch (err) {
    message.error(err instanceof Error ? err.message : '上传失败')
  } finally {
    loading.value = false
  }
}

function onVisibleChange(v: boolean): void {
  if (!v) fileList.value = []
  emit('update:visible', v)
}
</script>

<template>
  <el-dialog
    :model-value="props.visible"
    title="上传文档到知识库"
    width="600px"
    :close-on-click-modal="false"
    @update:model-value="onVisibleChange"
  >
    <div :class="$style.content">
      <p :class="$style.hint">
        支持 PDF、Word、Excel、TXT、CSV 格式，最大 10MB
      </p>
      <el-upload
        :auto-upload="false"
        :limit="1"
        :on-change="handleChange"
        :file-list="fileList.map((f) => ({ name: f.name, raw: f }))"
        accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
        drag
      >
        <AppIcon name="upload" :size="40" />
        <div :class="$style.text">拖拽文件到此处，或<em>点击上传</em></div>
      </el-upload>
    </div>
    <template #footer>
      <el-button @click="onVisibleChange(false)">取消</el-button>
      <el-button
        type="primary"
        :loading="loading"
        :disabled="fileList.length === 0"
        @click="handleSubmit"
      >
        上传并索引
      </el-button>
    </template>
  </el-dialog>
</template>

<style module>
.content {
  padding: 8px 0;
}

.hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}

.text {
  margin-top: 8px;
  font-size: 14px;
  color: var(--el-text-color-regular, #606266);
}

.text em {
  color: var(--el-color-primary, #0060a2);
  font-style: normal;
}
</style>
