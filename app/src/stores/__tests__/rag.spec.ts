/**
 * rag store unit tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/aiApi', () => ({
  searchRag: vi.fn(),
}))

import { searchRag } from '@/api/aiApi'
import { useRAGStore } from '@/stores/rag'

describe('rag store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('searchRagAction skips empty query', async () => {
    const store = useRAGStore()
    await store.searchRagAction('  ')
    expect(store.ragSearchResults).toEqual([])
    expect(searchRag).not.toHaveBeenCalled()
  })

  it('searchRagAction fetches and sets results', async () => {
    vi.mocked(searchRag).mockResolvedValue({ schemas: [{ id: 's1', name: 'Test', score: 95, widgetTypes: ['input'] }] })

    const store = useRAGStore()
    await store.searchRagAction('test query', 3)

    expect(store.ragSearchResults).toHaveLength(1)
    expect(store.ragSearching).toBe(false)
    expect(searchRag).toHaveBeenCalledWith({ query: 'test query', limit: 3 })
  })

  it('searchRagAction clears results on error', async () => {
    vi.mocked(searchRag).mockRejectedValue(new Error('fail'))

    const store = useRAGStore()
    await expect(store.searchRagAction('test')).rejects.toThrow('fail')
    expect(store.ragSearchResults).toEqual([])
    expect(store.ragSearching).toBe(false)
  })

  it('addRagContext deduplicates by id', () => {
    const store = useRAGStore()
    const item = { id: 's1', name: 'Test', score: 90, widgetTypes: ['input'] }
    store.addRagContext(item)
    store.addRagContext(item)
    expect(store.ragContext).toHaveLength(1)
  })

  it('removeRagContext removes by id', () => {
    const store = useRAGStore()
    store.ragContext = [
      { id: 's1', name: 'A', score: 90, widgetTypes: [] },
      { id: 's2', name: 'B', score: 80, widgetTypes: [] },
    ]
    store.removeRagContext('s1')
    expect(store.ragContext).toHaveLength(1)
    expect(store.ragContext[0].id).toBe('s2')
  })

  it('clearRagContext clears both context and results', () => {
    const store = useRAGStore()
    store.ragContext = [{ id: 's1', name: 'A', score: 90, widgetTypes: [] }]
    store.ragSearchResults = [{ id: 's2', name: 'B', score: 80, widgetTypes: [] }]
    store.clearRagContext()
    expect(store.ragContext).toEqual([])
    expect(store.ragSearchResults).toEqual([])
  })

  it('getRagContextContent returns formatted content and clears context', () => {
    const store = useRAGStore()
    store.ragContext = [
      { id: 's1', name: 'UserForm', score: 95, widgetTypes: ['input', 'select'] },
    ]
    const content = store.getRagContextContent()
    expect(content).toContain('RAG 上下文')
    expect(content).toContain('UserForm')
    expect(content).toContain('95%')
    expect(content).toContain('input, select')
    expect(store.ragContext).toEqual([]) // cleared after get
  })

  it('getRagContextContent returns empty string when no context', () => {
    const store = useRAGStore()
    expect(store.getRagContextContent()).toBe('')
  })
})
