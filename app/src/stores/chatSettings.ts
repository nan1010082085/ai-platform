/**
 * Chat Settings Store
 *
 * 职责：聊天设置管理（语言、风格、历史摘要模式）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatSettings } from '@/types'

const CHAT_SETTINGS_KEY = 'ai-chat-settings'

const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  model: '',
  agentWorkflowId: null,
  preferences: {
    replyLanguage: 'zh-CN',
    replyStyle: 'detailed',
    codeComment: 'yes',
  },
  historySummary: {
    mode: 'auto',
  },
}

function loadChatSettings(): ChatSettings {
  try {
    const stored = localStorage.getItem(CHAT_SETTINGS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as ChatSettings
      return {
        model: typeof parsed.model === 'string' ? parsed.model : '',
        agentWorkflowId: typeof parsed.agentWorkflowId === 'string' ? parsed.agentWorkflowId : null,
        preferences: { ...DEFAULT_CHAT_SETTINGS.preferences, ...parsed.preferences },
        historySummary: { ...DEFAULT_CHAT_SETTINGS.historySummary, ...parsed.historySummary },
      }
    }
  } catch {
    // localStorage 不可用或数据损坏，使用默认值
  }
  return { ...DEFAULT_CHAT_SETTINGS }
}

export const useChatSettingsStore = defineStore('chatSettings', () => {
  // ---- State ----
  const chatSettings = ref<ChatSettings>(loadChatSettings())

  // ---- Actions ----
  function updateModel(model: string): void {
    chatSettings.value = { ...chatSettings.value, model }
    localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(chatSettings.value))
  }

  function updateChatSettings(settings: {
    model?: string
    agentWorkflowId?: string | null
    preferences?: Partial<ChatSettings['preferences']>
    historySummary?: Partial<ChatSettings['historySummary']>
  }): void {
    chatSettings.value = {
      model: settings.model ?? chatSettings.value.model,
      agentWorkflowId: settings.agentWorkflowId !== undefined
        ? settings.agentWorkflowId
        : chatSettings.value.agentWorkflowId,
      preferences: { ...chatSettings.value.preferences, ...settings.preferences },
      historySummary: { ...chatSettings.value.historySummary, ...settings.historySummary },
    }
    localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(chatSettings.value))
  }

  function updateAgentWorkflowId(workflowId: string | null): void {
    updateChatSettings({ agentWorkflowId: workflowId })
  }

  function getHistorySummary(): string | undefined {
    return chatSettings.value.historySummary.mode === 'manual'
      ? chatSettings.value.historySummary.manualSummary
      : undefined
  }

  return {
    // state
    chatSettings,
    // actions
    updateChatSettings,
    updateModel,
    updateAgentWorkflowId,
    getHistorySummary,
  }
})
