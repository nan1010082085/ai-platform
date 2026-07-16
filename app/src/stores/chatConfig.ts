/**
 * Chat configuration store.
 *
 * Fetches chat UI configuration (starter prompts, etc.) from the server
 * and exposes it reactively to components.
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@schema-platform/platform-shared/utils/apiClient'

export interface StarterPrompt {
  icon: string
  text: string
  agent: string
}

const DEFAULT_STARTER_PROMPTS: StarterPrompt[] = [
  { icon: 'edit', text: '帮我创建一个表单', agent: 'editor' },
  { icon: 'connection', text: '设计一个审批流程', agent: 'flow' },
  { icon: 'search', text: '搜索知识库', agent: 'auto' },
]

export const useChatConfigStore = defineStore('chatConfig', () => {
  const starterPrompts = ref<StarterPrompt[]>(DEFAULT_STARTER_PROMPTS)
  const loaded = ref(false)

  async function fetchConfig(): Promise<void> {
    try {
      const data = await apiClient.get<{ starterPrompts: StarterPrompt[] }>('/ai/chat-config')
      if (Array.isArray(data.starterPrompts) && data.starterPrompts.length > 0) {
        starterPrompts.value = data.starterPrompts
      }
      loaded.value = true
    } catch {
      // API failure — keep defaults, mark loaded so we don't retry forever
      loaded.value = true
    }
  }

  return {
    starterPrompts,
    loaded,
    fetchConfig,
  }
})
