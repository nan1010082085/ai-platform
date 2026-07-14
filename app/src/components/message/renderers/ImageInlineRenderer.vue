<script setup lang="ts">
/**
 * ImageInlineRenderer — 内联图片渲染器
 *
 * 当 text 步骤包含 Markdown 图片语法时，
 * 将文本和图片混合渲染，支持点击放大预览。
 */

import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{
  content: string
  agent?: string
}>()

const emit = defineEmits<{
  'image-preview': [url: string]
}>()

function renderMarkdown(raw: string): string {
  if (!raw) return ''
  const rawHtml = marked.parse(raw, { breaks: true }) as string
  return DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['class'] })
}

const renderedHtml = computed(() => renderMarkdown(props.content))

function handleClick(e: Event) {
  const target = e.target as HTMLElement
  if (target.tagName === 'IMG') {
    const src = target.getAttribute('src')
    if (src) emit('image-preview', src)
  }
}
</script>

<template>
  <div :class="$style.root" v-html="renderedHtml" @click="handleClick" />
</template>

<style module>
.root {
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-color-primary, #333333);
}

.root img {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
  margin: 4px 0;
  border: 1px solid var(--border-color-light, #EBEDF3);
}

.root img:hover {
  border-color: var(--color-primary, #0060A2);
}
</style>
