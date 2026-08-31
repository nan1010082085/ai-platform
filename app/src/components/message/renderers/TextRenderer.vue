<script setup lang="ts">
/**
 * TextRenderer — Markdown 正文渲染
 * 渲染引擎收敛到 @apform-ui/core renderMarkdown
 */
import { computed } from 'vue'
import { renderMarkdown } from '@apform-ui/core'

const props = defineProps<{
  /** Markdown / plain text content */
  content: string
  /** Agent type — reserved for future agent-specific styling */
  agent?: string
}>()

const emit = defineEmits<{
  copy: []
}>()

const renderedHtml = computed(() => renderMarkdown(props.content))

/**
 * 复制原文到剪贴板
 */
function handleCopy(): void {
  if (props.content) {
    navigator.clipboard.writeText(props.content)
  }
  emit('copy')
}

defineExpose({ handleCopy })
</script>

<template>
  <div :class="$style.root">
    <div
      :class="$style.markdownContent"
      v-html="renderedHtml"
    />
  </div>
</template>

<style module src="./TextRenderer.module.scss" />
