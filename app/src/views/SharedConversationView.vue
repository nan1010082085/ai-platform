<script setup lang="ts">
/**
 * SharedConversationView — 分享对话只读展示页
 *
 * 通过 shareId 加载分享的对话，展示消息列表。
 * 公开路由，无需登录。
 */
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AiMessage from '@/components/AiMessage.vue'
import { getSharedConversation } from '@/api/aiApi/conversation'
import type { StepData } from '@/types'

const route = useRoute()
const loading = ref(false)
const loadError = ref<string | null>(null)
const title = ref('')
const messages = ref<Array<{
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: string
  steps?: StepData[]
}>>([])

const shareId = route.params.shareId as string

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const data = await getSharedConversation(shareId)
    title.value = data.title || '分享的对话'
    messages.value = data.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
      thinking: m.thinking,
      timestamp: m.timestamp,
    }))
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '加载分享对话失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="shared-page">
    <header class="shared-header">
      <div class="shared-header-left">
        <AppIcon name="connection" :size="20" />
        <h1>{{ title }}</h1>
      </div>
      <span class="shared-badge">只读分享</span>
    </header>

    <div v-if="loading" class="shared-loading">
      <div class="loading-spinner" />
      <p>加载中...</p>
    </div>

    <div v-else-if="loadError" class="shared-error">
      <AppIcon name="warning-filled" :size="32" />
      <p>{{ loadError }}</p>
    </div>

    <div v-else class="shared-messages">
      <AiMessage
        v-for="(msg, idx) in messages"
        :key="idx"
        :role="msg.role"
        :label="msg.role === 'user' ? '用户' : 'AI'"
        :content="msg.content"
        :thinking="msg.thinking"
      />
    </div>
  </div>
</template>

<style scoped>
.shared-page {
  min-height: 100vh;
  background: var(--bg-color-page, #f5f6fa);
}

.shared-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  background: var(--bg-color-white, #fff);
  border-bottom: 1px solid var(--border-color-light, #ebedf3);
  position: sticky;
  top: 0;
  z-index: 10;
}

.shared-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shared-header-left h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color-primary, #333);
}

.shared-badge {
  font-size: 12px;
  color: var(--text-color-secondary, #666);
  background: var(--bg-color-gray, #f5f7fa);
  padding: 4px 8px;
  border-radius: 4px;
}

.shared-loading,
.shared-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 56px);
  gap: 16px;
  color: var(--text-color-secondary, #666);
}

.shared-error p {
  margin: 0;
  max-width: 400px;
  text-align: center;
}

.shared-messages {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color-light, #ebedf3);
  border-top-color: var(--color-primary, #0060a2);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
