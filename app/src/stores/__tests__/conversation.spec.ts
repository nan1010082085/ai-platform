/**
 * conversation store unit tests
 *
 * 覆盖 loadConversations / loadConversation / removeConversation / clearConversation / currentConversation。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/aiApi', () => ({
  getConversations: vi.fn(),
  getConversationDetail: vi.fn(),
  deleteConversation: vi.fn(),
  publish: vi.fn(),
}))

import { getConversations, getConversationDetail, deleteConversation } from '@/api/aiApi'
import { useConversationStore } from '@/stores/conversation'

describe('conversation store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loadConversations fetches and sets conversations', async () => {
    vi.mocked(getConversations).mockResolvedValue([
      { id: 'c1', name: 'Chat 1' },
      { id: 'c2', name: 'Chat 2' },
    ] as never)

    const store = useConversationStore()
    await store.loadConversations()

    expect(store.conversations).toHaveLength(2)
    expect(store.conversations[0].id).toBe('c1')
  })

  it('loadConversation fetches detail, parses messages, and sets current id', async () => {
    vi.mocked(getConversationDetail).mockResolvedValue({
      id: 'c1',
      messages: [
        { role: 'user', content: 'hello', timestamp: '2026-07-21T00:00:00Z' },
        { role: 'assistant', content: 'hi there', schema: [{ type: 'input', id: 'i1' }], timestamp: '2026-07-21T00:01:00Z' },
      ],
    } as never)

    const store = useConversationStore()
    const result = await store.loadConversation('c1')

    expect(store.currentConversationId).toBe('c1')
    expect(result.messages).toHaveLength(2)
    expect(result.messages[0].role).toBe('user')
    expect(result.messages[0].content).toBe('hello')
    expect(result.messages[1].role).toBe('assistant')
    expect(result.messages[1].content).toBe('hi there')
    expect(result.schema).toEqual([{ type: 'input', id: 'i1' }])
    expect(result.flow).toBeNull()
  })

  it('loadConversation restores flow from last assistant message', async () => {
    vi.mocked(getConversationDetail).mockResolvedValue({
      id: 'c1',
      messages: [
        { role: 'user', content: 'make a flow', timestamp: '2026-07-21T00:00:00Z' },
        { role: 'assistant', content: 'done', flow: { nodes: [], edges: [] }, timestamp: '2026-07-21T00:01:00Z' },
      ],
    } as never)

    const store = useConversationStore()
    const result = await store.loadConversation('c1')

    expect(result.flow).toEqual({ nodes: [], edges: [] })
  })

  it('currentConversation returns matching conversation', async () => {
    vi.mocked(getConversations).mockResolvedValue([
      { id: 'c1', name: 'Chat 1' },
      { id: 'c2', name: 'Chat 2' },
    ] as never)

    const store = useConversationStore()
    await store.loadConversations()
    store.currentConversationId = 'c2'

    expect(store.currentConversation?.id).toBe('c2')
  })

  it('currentConversation returns null when no match', () => {
    const store = useConversationStore()
    store.currentConversationId = 'nonexistent'
    expect(store.currentConversation).toBeNull()
  })

  it('removeConversation deletes and filters', async () => {
    vi.mocked(deleteConversation).mockResolvedValue(undefined as never)
    vi.mocked(getConversations).mockResolvedValue([
      { id: 'c1', name: 'Chat 1' },
      { id: 'c2', name: 'Chat 2' },
    ] as never)

    const store = useConversationStore()
    await store.loadConversations()
    await store.removeConversation('c1')

    expect(store.conversations).toHaveLength(1)
    expect(store.conversations[0].id).toBe('c2')
    expect(deleteConversation).toHaveBeenCalledWith('c1')
  })

  it('clearConversation resets id and messages', () => {
    const store = useConversationStore()
    store.currentConversationId = 'c1'
    store.messages = [{ role: 'user', content: 'hi', timestamp: new Date(), status: 'sent' }] as never
    store.clearConversation()
    expect(store.currentConversationId).toBeNull()
    expect(store.messages).toEqual([])
  })
})
