/**
 * LLM Provider 管理 Store
 *
 * 职责：LLM 提供商、策略、用量管理
 * 策略随 /llm-providers 一并返回（availableStrategies + defaultStrategy），
 * 不再单独调用不存在的 /llm-strategies、/llm-strategy 端点。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  LLMProviderInfo,
  LLMAggregatedUsage,
} from '@/api/aiApi'
import {
  getLLMProviders,
  switchLLMProvider,
  getLLMUsage,
} from '@/api/aiApi'

export const useLLMStore = defineStore('llm', () => {
  // ---- State ----
  const llmProviders = ref<LLMProviderInfo[]>([])
  const llmDefaultProvider = ref<string>('deepseek')
  const llmDefaultStrategy = ref<string | null>(null)
  const llmStrategies = ref<string[]>([])
  const llmUsage = ref<LLMAggregatedUsage | null>(null)
  const llmLoading = ref(false)

  // ---- Actions ----
  async function loadLLMProviders(): Promise<void> {
    llmLoading.value = true
    try {
      const data = await getLLMProviders()
      llmProviders.value = data.providers
      llmDefaultProvider.value = data.defaultProvider
      llmDefaultStrategy.value = data.defaultStrategy
      llmStrategies.value = data.availableStrategies
    } finally {
      llmLoading.value = false
    }
  }

  async function loadLLMUsage(): Promise<void> {
    const data = await getLLMUsage()
    llmUsage.value = data as LLMAggregatedUsage
  }

  async function switchProvider(provider: string): Promise<void> {
    await switchLLMProvider(provider)
    llmDefaultProvider.value = provider
    // 更新 providers 列表中的 isDefault 标记
    llmProviders.value = llmProviders.value.map((p) => ({
      ...p,
      isDefault: p.name === provider,
    }))
  }

  return {
    // state
    llmProviders,
    llmDefaultProvider,
    llmDefaultStrategy,
    llmStrategies,
    llmUsage,
    llmLoading,
    // actions
    loadLLMProviders,
    loadLLMUsage,
    switchProvider,
  }
})
