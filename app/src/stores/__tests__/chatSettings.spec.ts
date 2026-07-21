/**
 * chatSettings store unit tests
 *
 * 覆盖 loadChatSettings / updateModel / updateChatSettings / updateAgentWorkflowId / getHistorySummary。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChatSettingsStore } from '@/stores/chatSettings'

describe('chatSettings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('initializes with default settings', () => {
    const store = useChatSettingsStore()
    expect(store.chatSettings.model).toBe('')
    expect(store.chatSettings.agentWorkflowId).toBeNull()
    expect(store.chatSettings.preferences.replyLanguage).toBe('zh-CN')
    expect(store.chatSettings.preferences.replyStyle).toBe('detailed')
    expect(store.chatSettings.historySummary.mode).toBe('auto')
  })

  it('loads settings from localStorage', () => {
    const saved = {
      model: 'deepseek-v4',
      agentWorkflowId: 'wf-1',
      preferences: { replyLanguage: 'en-US', replyStyle: 'concise', codeComment: 'no' },
      historySummary: { mode: 'manual', manualSummary: 'test summary' },
    }
    localStorage.setItem('ai-chat-settings', JSON.stringify(saved))

    const store = useChatSettingsStore()
    expect(store.chatSettings.model).toBe('deepseek-v4')
    expect(store.chatSettings.agentWorkflowId).toBe('wf-1')
    expect(store.chatSettings.preferences.replyLanguage).toBe('en-US')
    expect(store.chatSettings.historySummary.mode).toBe('manual')
  })

  it('falls back to defaults when localStorage is corrupted', () => {
    localStorage.setItem('ai-chat-settings', 'invalid json')

    const store = useChatSettingsStore()
    expect(store.chatSettings.model).toBe('')
    expect(store.chatSettings.preferences.replyLanguage).toBe('zh-CN')
  })

  it('updateModel updates model and persists', () => {
    const store = useChatSettingsStore()
    store.updateModel('gpt-4o')

    expect(store.chatSettings.model).toBe('gpt-4o')
    const stored = JSON.parse(localStorage.getItem('ai-chat-settings')!)
    expect(stored.model).toBe('gpt-4o')
  })

  it('updateChatSettings merges partial settings', () => {
    const store = useChatSettingsStore()
    store.updateChatSettings({
      model: 'claude-3',
      preferences: { replyStyle: 'concise' },
    })

    expect(store.chatSettings.model).toBe('claude-3')
    expect(store.chatSettings.preferences.replyStyle).toBe('concise')
    expect(store.chatSettings.preferences.replyLanguage).toBe('zh-CN') // preserved
  })

  it('updateChatSettings handles agentWorkflowId', () => {
    const store = useChatSettingsStore()
    store.updateChatSettings({ agentWorkflowId: 'wf-1' })
    expect(store.chatSettings.agentWorkflowId).toBe('wf-1')

    store.updateChatSettings({ agentWorkflowId: null })
    expect(store.chatSettings.agentWorkflowId).toBeNull()
  })

  it('updateAgentWorkflowId delegates to updateChatSettings', () => {
    const store = useChatSettingsStore()
    store.updateAgentWorkflowId('wf-2')
    expect(store.chatSettings.agentWorkflowId).toBe('wf-2')
  })

  it('getHistorySummary returns undefined for auto mode', () => {
    const store = useChatSettingsStore()
    expect(store.getHistorySummary()).toBeUndefined()
  })

  it('getHistorySummary returns manual summary for manual mode', () => {
    const store = useChatSettingsStore()
    store.updateChatSettings({
      historySummary: { mode: 'manual', manualSummary: 'My summary' },
    })
    expect(store.getHistorySummary()).toBe('My summary')
  })
})
