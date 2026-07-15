/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'

vi.mock('@/api/providerApi', () => ({
  listProvidersWithModels: vi.fn(),
}))

vi.mock('@/api/modelConfigApi', () => ({
  getModelConfigs: vi.fn(),
}))

vi.mock('@/api/aiApi', () => ({
  checkAIHealth: vi.fn(),
}))

import { listProvidersWithModels } from '@/api/providerApi'
import { getModelConfigs } from '@/api/modelConfigApi'
import { checkAIHealth } from '@/api/aiApi'
import { useModelOptions, _resetModelOptionsState } from '@/composables/useModelOptions'

const mockListProviders = vi.mocked(listProvidersWithModels)
const mockGetModelConfigs = vi.mocked(getModelConfigs)
const mockCheckAIHealth = vi.mocked(checkAIHealth)

// ---- Provider API mock data ----

const sampleProviders = [
  {
    id: 'p1',
    name: 'DeepSeek',
    type: 'deepseek' as const,
    baseUrl: 'https://api.deepseek.com',
    apiKey: '****',
    isActive: true,
    createdAt: '2026-07-01T08:00:00Z',
    updatedAt: '2026-07-01T08:00:00Z',
    models: [
      {
        id: 'm1',
        name: 'DeepSeek V4 Flash',
        providerId: 'p1',
        model: 'deepseek-v4-flash',
        parameters: { temperature: 0.7, maxTokens: 4096 },
        isDefault: true,
        isActive: true,
        createdAt: '2026-07-01T08:00:00Z',
        updatedAt: '2026-07-01T08:00:00Z',
      },
    ],
  },
  {
    id: 'p2',
    name: 'OpenAI',
    type: 'openai' as const,
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '****',
    isActive: true,
    createdAt: '2026-06-15T08:00:00Z',
    updatedAt: '2026-06-20T08:00:00Z',
    models: [
      {
        id: 'm2',
        name: 'GPT-4o',
        providerId: 'p2',
        model: 'gpt-4o',
        parameters: { temperature: 0.5, maxTokens: 8192 },
        isDefault: false,
        isActive: true,
        createdAt: '2026-06-15T08:00:00Z',
        updatedAt: '2026-06-20T08:00:00Z',
      },
    ],
  },
]

// ---- Legacy model-configs mock data ----

const sampleItems = [
  {
    id: 'c1',
    name: 'DeepSeek Flash',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    apiKey: 'sk-****abcd',
    baseUrl: '',
    parameters: { temperature: 0.7, maxTokens: 4096 },
    isDefault: true,
    createdAt: '2026-07-01T08:00:00Z',
    updatedAt: '2026-07-01T08:00:00Z',
  },
  {
    id: 'c2',
    name: 'GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: 'sk-****1234',
    baseUrl: 'https://api.openai.com/v1',
    parameters: { temperature: 0.5, maxTokens: 8192 },
    isDefault: false,
    createdAt: '2026-06-15T08:00:00Z',
    updatedAt: '2026-06-20T08:00:00Z',
  },
]

function mockProvidersResolved(providers: typeof sampleProviders) {
  mockListProviders.mockResolvedValue(providers)
}

function mockProvidersRejected(error?: Error) {
  mockListProviders.mockRejectedValue(error ?? new Error('Provider API unavailable'))
}

function mockLegacyResolved(items: typeof sampleItems) {
  mockGetModelConfigs.mockResolvedValue({
    items,
    total: items.length,
    page: 1,
    pageSize: 100,
    totalPages: 1,
  })
}

function mountWithComposable() {
  let result: ReturnType<typeof useModelOptions>
  const TestComponent = defineComponent({
    setup() {
      result = useModelOptions()
      return {}
    },
    template: '<div />',
  })
  mount(TestComponent)
  return result!
}

describe('useModelOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetModelOptionsState()
  })

  // ---- Primary: providers API ----

  it('loads from providers API on mount (primary path)', async () => {
    mockProvidersResolved(sampleProviders)
    const result = mountWithComposable()
    await flushPromises()
    expect(result.loaded.value).toBe(true)
    expect(mockListProviders).toHaveBeenCalled()
    expect(result.modelOptions.value).toHaveLength(2)
    expect(result.dataSource.value).toBe('providers')
  })

  it('maps provider models to ModelOption format', async () => {
    mockProvidersResolved(sampleProviders)
    const result = mountWithComposable()
    await flushPromises()
    const opts = result.modelOptions.value
    expect(opts[0].value).toBe('deepseek-v4-flash')
    expect(opts[0].label).toBe('DeepSeek · DeepSeek V4 Flash')
    expect(opts[0].shortLabel).toBe('DeepSeek V4 Flash')
    expect(opts[0].provider).toBe('deepseek')
    expect(opts[0].isDefault).toBe(true)
    expect(opts[0].source).toBe('provider')
    expect(opts[1].value).toBe('gpt-4o')
    expect(opts[1].label).toBe('OpenAI · GPT-4o')
    expect(opts[1].shortLabel).toBe('GPT-4o')
  })

  it('populates providerGroups from providers API', async () => {
    mockProvidersResolved(sampleProviders)
    const result = mountWithComposable()
    await flushPromises()
    expect(result.providerGroups.value).toHaveLength(2)
    expect(result.providerGroups.value[0].providerName).toBe('DeepSeek')
    expect(result.providerGroups.value[0].models).toHaveLength(1)
    expect(result.providerGroups.value[1].providerName).toBe('OpenAI')
    expect(result.hasGroupedData.value).toBe(true)
  })

  it('sets default model from providers API', async () => {
    mockProvidersResolved(sampleProviders)
    const result = mountWithComposable()
    await flushPromises()
    expect(result.defaultModel.value).toBe('deepseek-v4-flash')
  })

  it('skips inactive providers and models', async () => {
    mockProvidersResolved([
      {
        ...sampleProviders[0],
        isActive: false,
      },
      {
        ...sampleProviders[1],
        models: [{ ...sampleProviders[1].models[0], isActive: false }],
      },
    ])
    const result = mountWithComposable()
    await flushPromises()
    expect(result.modelOptions.value).toHaveLength(0)
    expect(result.providerGroups.value).toHaveLength(0)
  })

  // ---- Fallback: model-configs API ----

  it('falls back to model-configs when providers API fails', async () => {
    mockProvidersRejected()
    mockLegacyResolved(sampleItems)
    const result = mountWithComposable()
    await flushPromises()
    expect(result.loaded.value).toBe(true)
    expect(mockListProviders).toHaveBeenCalled()
    expect(mockGetModelConfigs).toHaveBeenCalledWith({ pageSize: 100 })
    expect(result.modelOptions.value).toHaveLength(2)
    expect(result.dataSource.value).toBe('model-configs')
    expect(result.providerGroups.value.length).toBeGreaterThan(0)
    expect(result.hasGroupedData.value).toBe(true)
  })

  it('falls back to model-configs when providers returns empty active models', async () => {
    mockProvidersResolved([{ ...sampleProviders[0], isActive: false }])
    mockLegacyResolved(sampleItems)
    const result = mountWithComposable()
    await flushPromises()
    expect(result.loaded.value).toBe(true)
    expect(result.modelOptions.value).toHaveLength(2)
    expect(result.dataSource.value).toBe('model-configs')
  })

  it('maps legacy items to ModelOption format', async () => {
    mockProvidersRejected()
    mockLegacyResolved(sampleItems)
    const result = mountWithComposable()
    await flushPromises()
    const opts = result.modelOptions.value
    expect(opts[0].value).toBe('deepseek-v4-flash')
    expect(opts[0].label).toBe('DeepSeek Flash · deepseek-v4-flash')
    expect(opts[0].source).toBe('db')
    expect(opts[1].value).toBe('gpt-4o')
  })

  // ---- Fallback: env health ----

  it('falls back to env health providers when both APIs return empty', async () => {
    mockProvidersResolved([])
    mockGetModelConfigs.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
      totalPages: 0,
    })
    mockCheckAIHealth.mockResolvedValue({
      status: 'ok',
      defaultProvider: 'deepseek',
      hasApiKey: true,
      providers: [{
        name: 'deepseek',
        hasApiKey: true,
        model: 'deepseek-v4-flash',
        isDefault: true,
      }],
    })

    const result = mountWithComposable()
    await flushPromises()

    expect(mockCheckAIHealth).toHaveBeenCalled()
    expect(result.modelOptions.value).toHaveLength(1)
    expect(result.modelOptions.value[0].value).toBe('deepseek-v4-flash')
    expect(result.modelOptions.value[0].source).toBe('env')
    expect(result.defaultModel.value).toBe('deepseek-v4-flash')
    expect(result.dataSource.value).toBe('env')
  })

  it('falls back to env when providers fails and legacy returns empty', async () => {
    mockProvidersRejected()
    mockGetModelConfigs.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
      totalPages: 0,
    })
    mockCheckAIHealth.mockResolvedValue({
      status: 'ok',
      defaultProvider: 'deepseek',
      hasApiKey: true,
      providers: [{
        name: 'deepseek',
        hasApiKey: true,
        model: 'deepseek-v4-flash',
        isDefault: true,
      }],
    })

    const result = mountWithComposable()
    await flushPromises()

    expect(result.loaded.value).toBe(true)
    expect(result.modelOptions.value).toHaveLength(1)
    expect(result.dataSource.value).toBe('env')
  })

  // ---- Error handling ----

  it('handles all APIs failing gracefully', async () => {
    mockProvidersRejected()
    mockGetModelConfigs.mockRejectedValue(new Error('Network error'))
    mockCheckAIHealth.mockRejectedValue(new Error('Health unavailable'))
    const result = mountWithComposable()
    await flushPromises()
    expect(result.loaded.value).toBe(false)
    expect(result.modelOptions.value).toHaveLength(0)
  })

  // ---- Manual reload ----

  it('loadModelOptions can be called manually', async () => {
    mockProvidersResolved(sampleProviders)
    const result = mountWithComposable()
    await flushPromises()
    const callCount = mockListProviders.mock.calls.length
    expect(callCount).toBeGreaterThanOrEqual(1)

    await result.loadModelOptions()
    expect(mockListProviders.mock.calls.length).toBeGreaterThan(callCount)
  })

  // ---- Default model fallbacks ----

  it('sets empty default when no items from any source', async () => {
    mockProvidersResolved([])
    mockGetModelConfigs.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
      totalPages: 0,
    })
    mockCheckAIHealth.mockResolvedValue({
      status: 'unconfigured',
      defaultProvider: '',
      hasApiKey: false,
      providers: [],
    })
    const result = mountWithComposable()
    await flushPromises()
    expect(result.defaultModel.value).toBe('')
    expect(result.modelOptions.value).toHaveLength(0)
  })

  it('falls back to first item when no isDefault', async () => {
    mockProvidersResolved([
      {
        ...sampleProviders[0],
        models: [{ ...sampleProviders[0].models[0], isDefault: false }],
      },
    ])
    const result = mountWithComposable()
    await flushPromises()
    expect(result.defaultModel.value).toBe('deepseek-v4-flash')
  })
})
