/**
 * llm store unit tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/aiApi', () => ({
  getLLMProviders: vi.fn(),
  switchLLMProvider: vi.fn(),
  getLLMUsage: vi.fn(),
}))

import { getLLMProviders, switchLLMProvider, getLLMUsage } from '@/api/aiApi'
import { useLLMStore } from '@/stores/llm'

describe('llm store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loadLLMProviders fetches and sets providers', async () => {
    vi.mocked(getLLMProviders).mockResolvedValue({
      providers: [{ name: 'deepseek', models: ['v4-flash'], defaultModel: 'v4-flash', isDefault: true, qualityScore: 90, speedScore: 85, costPer1kPromptTokens: 0.001, costPer1kCompletionTokens: 0.002 }],
      defaultProvider: 'deepseek',
      defaultStrategy: 'balanced',
      availableStrategies: ['balanced', 'fast', 'quality'],
    })

    const store = useLLMStore()
    await store.loadLLMProviders()

    expect(store.llmProviders).toHaveLength(1)
    expect(store.llmDefaultProvider).toBe('deepseek')
    expect(store.llmDefaultStrategy).toBe('balanced')
    expect(store.llmStrategies).toEqual(['balanced', 'fast', 'quality'])
    expect(store.llmLoading).toBe(false)
  })

  it('loadLLMProviders sets loading during fetch', async () => {
    let resolve: (v: unknown) => void
    vi.mocked(getLLMProviders).mockReturnValue(new Promise((r) => { resolve = r }))

    const store = useLLMStore()
    const promise = store.loadLLMProviders()
    expect(store.llmLoading).toBe(true)

    resolve!({ providers: [], defaultProvider: '', defaultStrategy: null, availableStrategies: [] })
    await promise
    expect(store.llmLoading).toBe(false)
  })

  it('loadLLMUsage fetches usage data', async () => {
    const usage = { total: { totalTokens: 1000, totalCost: 0.05, requestCount: 10, promptTokens: 500, completionTokens: 500 }, byProvider: [] }
    vi.mocked(getLLMUsage).mockResolvedValue(usage as never)

    const store = useLLMStore()
    await store.loadLLMUsage()

    expect(store.llmUsage).toEqual(usage)
  })

  it('switchProvider updates default and provider list', async () => {
    vi.mocked(switchLLMProvider).mockResolvedValue({ provider: 'openai', message: 'switched' })

    const store = useLLMStore()
    store.llmProviders = [
      { name: 'deepseek', models: [], defaultModel: '', isDefault: true, qualityScore: 0, speedScore: 0, costPer1kPromptTokens: 0, costPer1kCompletionTokens: 0 },
      { name: 'openai', models: [], defaultModel: '', isDefault: false, qualityScore: 0, speedScore: 0, costPer1kPromptTokens: 0, costPer1kCompletionTokens: 0 },
    ]

    await store.switchProvider('openai')

    expect(store.llmDefaultProvider).toBe('openai')
    expect(store.llmProviders[0].isDefault).toBe(false)
    expect(store.llmProviders[1].isDefault).toBe(true)
  })
})
