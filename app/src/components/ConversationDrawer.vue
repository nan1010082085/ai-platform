<script setup lang="ts">
import { computed } from 'vue'
import type { Conversation } from '@/types'
import styles from './ConversationDrawer.module.scss'

const props = defineProps<{
  visible: boolean
  conversations: Conversation[]
  activeId?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [id: string]
  delete: [id: string]
}>()

const sortedConversations = computed(() => {
  return [...props.conversations].sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
})

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 86400000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.getDate() === yesterday.getDate()
      && date.getMonth() === yesterday.getMonth()
      && date.getFullYear() === yesterday.getFullYear()) {
    return '昨天'
  }

  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    editor: 'Editor',
    flow: 'Flow',
    page: 'Page',
    standalone: '独立',
  }
  return labels[source] ?? source
}

function handleVisibleChange(value: boolean): void {
  emit('update:visible', value)
}

function handleSelect(id: string): void {
  emit('select', id)
}

function handleDelete(id: string, event: Event): void {
  event.stopPropagation()
  emit('delete', id)
}
</script>

<template>
  <el-drawer
    :model-value="visible"
    title="对话历史"
    :size="320"
    direction="rtl"
    :class="styles.drawer"
    append-to-body
    @update:model-value="handleVisibleChange"
  >
    <div :class="styles.list">
      <div v-if="sortedConversations.length === 0" :class="styles.empty">
        暂无对话记录
      </div>
      <div
        v-for="conv in sortedConversations"
        :key="conv.id"
        :class="[styles.item, { [styles.itemActive]: conv.id === activeId }]"
        @click="handleSelect(conv.id)"
      >
        <div :class="styles.title">{{ conv.title || '新对话' }}</div>
        <div :class="styles.meta">
          <span :class="styles.source">{{ getSourceLabel(conv.source) }}</span>
          <span>{{ formatTime(conv.updatedAt) }}</span>
        </div>
        <button
          type="button"
          :class="styles.deleteBtn"
          aria-label="删除对话"
          @click="(e: Event) => handleDelete(conv.id, e)"
        >
          ×
        </button>
      </div>
    </div>
  </el-drawer>
</template>
