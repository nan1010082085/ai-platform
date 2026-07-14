<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

const props = defineProps<{
  /** Thinking content (Markdown) */
  content: string
  /** Agent type for coloring */
  agent?: string
}>()

const collapsed = ref(true)

const agentLabels: Record<string, string> = {
  editor: 'Editor 专家',
  flow: 'Flow 专家',
  page: 'Page 专家',
  general: '通用助手',
}

/** Summary of thinking content (shown when collapsed) */
const thinkingSummary = computed(() => {
  if (!props.content) return ''
  const text = props.content.replace(/<[^>]*>/g, '').trim()
  return text.length > 100 ? text.slice(0, 100) + '...' : text
})

/** Rendered Markdown HTML */
const renderedContent = computed(() => {
  if (!props.content) return ''
  const rawHtml = marked.parse(props.content, { breaks: true }) as string
  return DOMPurify.sanitize(rawHtml)
})

function toggleCollapse(): void {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <div :class="$style.root">
    <!-- Header (always visible) -->
    <div :class="$style.header" @click="toggleCollapse">
      <div :class="$style.headerLeft">
        <div :class="$style.icon">
          <AppIcon name="info-filled" :size="14" />
        </div>
        <div :class="$style.headerText">
          <div :class="$style.title">
            思考过程
            <span v-if="agent" :class="[$style.agentBadge, $style[`agent_${agent}`]]">
              {{ agentLabels[agent] ?? agent }}
            </span>
          </div>
          <div :class="$style.subtitle">
            {{ collapsed ? thinkingSummary : '已完成思考' }}
          </div>
        </div>
      </div>
      <div :class="$style.headerRight">
        <span :class="$style.badge">已完成</span>
        <div :class="[$style.toggle, { [$style.toggleExpanded]: !collapsed }]">
          <AppIcon name="arrow-down" :size="12" />
        </div>
      </div>
    </div>

    <!-- Body (visible when expanded) -->
    <div v-if="!collapsed" :class="$style.body">
      <div :class="$style.thinkingContent" v-html="renderedContent" />
    </div>
  </div>
</template>

<style module src="./ThinkingRenderer.module.scss" />
