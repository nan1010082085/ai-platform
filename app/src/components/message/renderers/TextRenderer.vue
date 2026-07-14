<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{
  /** Markdown / plain text content */
  content: string
  /** Agent type — reserved for future agent-specific styling */
  agent?: string
}>()

const emit = defineEmits<{
  copy: []
}>()

// ---- Markdown rendering ----

/**
 * Render Markdown to sanitized HTML.
 * - Uses `marked` with `breaks: true` for GFM-style line breaks.
 * - Wraps <table> in a scrollable container for horizontal overflow.
 * - Sanitizes via DOMPurify, preserving the `class` attribute for tableScroll.
 */
function renderMarkdown(raw: string): string {
  if (!raw) return ''
  const rawHtml = marked.parse(raw, { breaks: true }) as string
  // Wrap <table> in a horizontally scrollable div
  const wrapped = rawHtml
    .replace(/<table>/g, '<div class="tableScroll"><table>')
    .replace(/<\/table>/g, '</table></div>')
  return DOMPurify.sanitize(wrapped, { ADD_ATTR: ['class'] })
}

const renderedHtml = computed(() => renderMarkdown(props.content))

// ---- Copy ----

function handleCopy(): void {
  if (props.content) {
    navigator.clipboard.writeText(props.content)
  }
  emit('copy')
}
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
