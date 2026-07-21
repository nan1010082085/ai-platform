/**
 * publishedAgentWorkflows store unit tests
 *
 * 覆盖 loadPublishedWorkflows / workflowOptions / getWorkflowName / sanitizeStoredWorkflowSelection。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/agentWorkflowApi', () => ({
  listWorkflows: vi.fn(),
}))

import { listWorkflows } from '@/api/agentWorkflowApi'
import { usePublishedAgentWorkflowsStore } from '@/stores/publishedAgentWorkflows'

describe('publishedAgentWorkflows store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('initializes with empty state', () => {
    const store = usePublishedAgentWorkflowsStore()
    expect(store.workflows).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.loaded).toBe(false)
  })

  it('loadPublishedWorkflows fetches and filters published workflows', async () => {
    vi.mocked(listWorkflows).mockResolvedValue([
      { id: 'w1', name: 'Flow 1', status: 'published' },
      { id: 'w2', name: 'Flow 2', status: 'draft' },
      { id: 'w3', name: 'Flow 3', status: 'published' },
    ] as never)

    const store = usePublishedAgentWorkflowsStore()
    await store.loadPublishedWorkflows()

    expect(store.workflows).toHaveLength(2)
    expect(store.workflows[0].id).toBe('w1')
    expect(store.workflows[1].id).toBe('w3')
    expect(store.loaded).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('loadPublishedWorkflows skips fetch when already loaded and not forced', async () => {
    vi.mocked(listWorkflows).mockResolvedValue([{ id: 'w1', name: 'Flow 1', status: 'published' }] as never)

    const store = usePublishedAgentWorkflowsStore()
    await store.loadPublishedWorkflows()
    await store.loadPublishedWorkflows() // second call, should not fetch again

    expect(listWorkflows).toHaveBeenCalledTimes(1)
  })

  it('loadPublishedWorkflows forces re-fetch when force=true', async () => {
    vi.mocked(listWorkflows).mockResolvedValue([{ id: 'w1', name: 'Flow 1', status: 'published' }] as never)

    const store = usePublishedAgentWorkflowsStore()
    await store.loadPublishedWorkflows()
    await store.loadPublishedWorkflows(true)

    expect(listWorkflows).toHaveBeenCalledTimes(2)
  })

  it('workflowOptions maps workflows to select options', async () => {
    vi.mocked(listWorkflows).mockResolvedValue([
      { id: 'w1', name: 'Flow 1', status: 'published' },
      { id: 'w2', name: 'Flow 2', status: 'published' },
    ] as never)

    const store = usePublishedAgentWorkflowsStore()
    await store.loadPublishedWorkflows()

    expect(store.workflowOptions).toEqual([
      { value: 'w1', label: 'Flow 1' },
      { value: 'w2', label: 'Flow 2' },
    ])
  })

  it('getWorkflowName returns name for matching id', async () => {
    vi.mocked(listWorkflows).mockResolvedValue([
      { id: 'w1', name: 'Flow 1', status: 'published' },
    ] as never)

    const store = usePublishedAgentWorkflowsStore()
    await store.loadPublishedWorkflows()

    expect(store.getWorkflowName('w1')).toBe('Flow 1')
  })

  it('getWorkflowName returns null for unknown id', async () => {
    vi.mocked(listWorkflows).mockResolvedValue([] as never)

    const store = usePublishedAgentWorkflowsStore()
    await store.loadPublishedWorkflows()

    expect(store.getWorkflowName('unknown')).toBeNull()
  })

  it('getWorkflowName returns null for null/undefined', () => {
    const store = usePublishedAgentWorkflowsStore()
    expect(store.getWorkflowName(null)).toBeNull()
    expect(store.getWorkflowName(undefined)).toBeNull()
  })

  it('loadPublishedWorkflows sets loading during fetch', async () => {
    let resolve: (v: unknown) => void
    vi.mocked(listWorkflows).mockReturnValue(new Promise((r) => { resolve = r }))

    const store = usePublishedAgentWorkflowsStore()
    const promise = store.loadPublishedWorkflows()
    expect(store.loading).toBe(true)

    resolve!([])
    await promise
    expect(store.loading).toBe(false)
  })
})
