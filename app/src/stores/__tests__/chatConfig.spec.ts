/**
 * chatConfig store unit tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@schema-platform/platform-shared/utils/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { apiClient } from '@schema-platform/platform-shared/utils/apiClient'
import { useChatConfigStore } from '@/stores/chatConfig'

describe('chatConfig store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with default starter prompts', () => {
    const store = useChatConfigStore()
    expect(store.starterPrompts).toHaveLength(3)
    expect(store.starterPrompts[0].icon).toBe('edit')
    expect(store.loaded).toBe(false)
  })

  it('fetchConfig loads prompts from API', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      starterPrompts: [
        { icon: 'star', text: 'Custom prompt', agent: 'general' },
      ],
    })

    const store = useChatConfigStore()
    await store.fetchConfig()

    expect(store.starterPrompts).toHaveLength(1)
    expect(store.starterPrompts[0].text).toBe('Custom prompt')
    expect(store.loaded).toBe(true)
  })

  it('fetchConfig keeps defaults when API returns empty array', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ starterPrompts: [] })

    const store = useChatConfigStore()
    await store.fetchConfig()

    expect(store.starterPrompts).toHaveLength(3) // defaults preserved
    expect(store.loaded).toBe(true)
  })

  it('fetchConfig keeps defaults when API returns non-array', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ starterPrompts: null })

    const store = useChatConfigStore()
    await store.fetchConfig()

    expect(store.starterPrompts).toHaveLength(3) // defaults preserved
    expect(store.loaded).toBe(true)
  })

  it('fetchConfig marks loaded on error (keeps defaults)', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('network'))

    const store = useChatConfigStore()
    await store.fetchConfig()

    expect(store.starterPrompts).toHaveLength(3) // defaults preserved
    expect(store.loaded).toBe(true)
  })
})
