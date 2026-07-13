/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'

vi.mock('@/api/modelConfigApi', () => ({
  getModelConfigs: vi.fn(),
}))

vi.mock('@/api/aiApi', () => ({
  checkAIHealth: vi.fn(),
}))

import { getModelConfigs } from '@/api/modelConfigApi'
import { checkAIHealth } from '@/api/aiApi'
import { useModelOptions, _resetModelOptionsState } from '@/composables/useModelOptions'

const mockGetModelConfigs = vi.mocked(getModelConfigs)
const mockCheckAIHealth = vi.mocked(checkAIHealth)

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

function mockResolved(items: typeof sampleItems) {
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

  it('loads model options on mount', async () => {
    mockResolved(sampleItems)
    const result = mountWithComposable()
    await flushPromises()
    expect(result.loaded.value).toBe(true)
    expect(mockGetModelConfigs).toHaveBeenCalledWith({ pageSize: 100 })
    expect(result.modelOptions.value).toHaveLength(2)
  })

  it('maps items to ModelOption format', async () => {
    mockResolved(sampleItems)
    const result = mountWithComposable()
    await flushPromises()
    const opts = result.modelOptions.value
    expect(opts[0].value).toBe('deepseek-v4-flash')
    expect(opts[0].label).toBe('DeepSeek Flash · deepseek-v4-flash')
    expect(opts[0].provider).toBe('deepseek')
    expect(opts[0].isDefault).toBe(true)
    expect(opts[1].value).toBe('gpt-4o')
    expect(opts[1].label).toBe('GPT-4o · gpt-4o')
  })

  it('sets default model from isDefault item', async () => {
    mockResolved(sampleItems)
    const result = mountWithComposable()
    await flushPromises()
    expect(result.defaultModel.value).toBe('deepseek-v4-flash')
  })

  it('falls back to first item when no isDefault', async () => {
    mockResolved(sampleItems.map((i) => ({ ...i, isDefault: false })))
    const result = mountWithComposable()
    await flushPromises()
    expect(result.defaultModel.value).toBe('deepseek-v4-flash')
  })

  it('sets empty default when no items', async () => {
    mockResolved([])
    const result = mountWithComposable()
    await flushPromises()
    expect(result.defaultModel.value).toBe('')
    expect(result.modelOptions.value).toHaveLength(0)
  })

  it('falls back to env health providers when DB list is empty', async () => {
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
  })

  it('handles API error gracefully', async () => {
    mockGetModelConfigs.mockRejectedValue(new Error('Network error'))
    mockCheckAIHealth.mockRejectedValue(new Error('Health unavailable'))
    const result = mountWithComposable()
    await flushPromises()
    expect(result.loaded.value).toBe(false)
    expect(result.modelOptions.value).toHaveLength(0)
  })

  it('loadModelOptions can be called manually', async () => {
    mockResolved(sampleItems)
    const result = mountWithComposable()
    await flushPromises()
    const callCount = mockGetModelConfigs.mock.calls.length
    expect(callCount).toBeGreaterThanOrEqual(1)

    await result.loadModelOptions()
    expect(mockGetModelConfigs.mock.calls.length).toBeGreaterThan(callCount)
  })
})
