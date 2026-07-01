<script setup lang="ts">
/**
 * JSON 详情弹框组件
 *
 * 展示 JSON 数据的完整内容，支持语法高亮和复制。
 */

import { computed } from 'vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'

export interface JsonDetailDialogProps {
  /** 是否显示 */
  visible: boolean
  /** 弹框标题 */
  title: string
  /** JSON 内容 */
  content: string
}

const props = defineProps<JsonDetailDialogProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// 格式化 JSON
const formattedJson = computed(() => {
  try {
    const parsed = JSON.parse(props.content)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return props.content
  }
})

// 语法高亮
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function highlightJsonSyntax(json: string): string {
  const escaped = escapeHtml(json)
  return escaped
    .replace(/"([^"\\]*(\\.[^"\\]*)*)"\s*:/g, '<span class="jsonKey">"$1"</span>:')
    .replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, '<span class="jsonString">"$1"</span>')
    .replace(/\b(-?\d+\.?\d*([eE][+-]?\d+)?)\b/g, '<span class="jsonNumber">$1</span>')
    .replace(/\b(true|false)\b/g, '<span class="jsonBool">$1</span>')
    .replace(/\bnull\b/g, '<span class="jsonNull">null</span>')
}

const highlightedJson = computed(() => {
  return highlightJsonSyntax(formattedJson.value)
})

// 复制功能
function handleCopy(): void {
  navigator.clipboard.writeText(formattedJson.value)
  message.success('已复制到剪贴板')
}

// 关闭弹框
function handleClose(): void {
  emit('update:visible', false)
}
</script>

<template>
  <AppDialog
    :model-value="visible"
    :title="title"
    width="700px"
    :close-on-click-modal="true"
    @update:model-value="handleClose"
  >
    <div :class="$style.header">
      <el-button :class="$style.copyBtn" text size="small" @click="handleCopy">
        <AppIcon name="copy-document" :size="12" />
        复制
      </el-button>
    </div>
    <div :class="$style.content">
      <pre :class="$style.code"><code v-html="highlightedJson" /></pre>
    </div>
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </AppDialog>
</template>

<style module>
.header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.copyBtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid var(--ai-border-light, #EBEDF3);
  background: transparent;
  color: var(--ai-text-secondary, #666666);
  font-family: inherit;
}

.copyBtn:hover {
  background: var(--ai-bg-hover, #E5EFF6);
  color: var(--ai-color-primary, #00d4ff);
}

.content {
  max-height: 500px;
  overflow-y: auto;
  background: var(--ai-bg-gray, #F5F7FA);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--ai-border-light, #EBEDF3);
}

.code {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ai-text-primary, #333333);
  margin: 0;
  white-space: pre;
  word-break: normal;
}

/* JSON syntax highlighting */
.code :global(.jsonKey) {
  color: #0060A2;
}

.code :global(.jsonString) {
  color: #26A036;
}

.code :global(.jsonNumber) {
  color: #F09700;
}

.code :global(.jsonBool) {
  color: var(--ai-color-purple, #8b5cf6);
}

.code :global(.jsonNull) {
  color: var(--ai-color-purple, #8b5cf6);
}
</style>
