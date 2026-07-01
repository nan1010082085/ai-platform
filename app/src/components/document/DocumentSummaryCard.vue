<script setup lang="ts">
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { MessageDocumentSummary } from '@/types'
import styles from './DocumentSummaryCard.module.scss'

defineProps<{
  item: MessageDocumentSummary
}>()
</script>

<template>
  <div :class="styles.card">
    <div :class="styles.header">
      <AppIcon name="document" :size="16" />
      <div>
        <div :class="styles.title">{{ item.summary.title }}</div>
        <div :class="styles.filename">{{ item.filename }}</div>
      </div>
    </div>
    <div :class="styles.summary">{{ item.summary.summary }}</div>
    <ul v-if="item.summary.keyPoints.length" :class="styles.points">
      <li v-for="(point, idx) in item.summary.keyPoints" :key="idx">{{ point }}</li>
    </ul>
    <div
      v-for="(section, idx) in item.summary.sections"
      :key="idx"
      :class="styles.section"
    >
      <div :class="styles.sectionTitle">{{ section.heading }}</div>
      <div :class="styles.sectionContent">{{ section.content }}</div>
    </div>
  </div>
</template>
