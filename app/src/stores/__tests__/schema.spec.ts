/**
 * schema store unit tests
 *
 * 覆盖 Schema/Flow 状态管理、版本历史、Diff 管理、撤销等函数。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/api/aiApi', () => ({
  getVersions: vi.fn(),
  rollbackVersion: vi.fn(),
}))

import { getVersions, rollbackVersion } from '@/api/aiApi'
import { useSchemaStore } from '@/stores/schema'

describe('schema store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with null schema and flow', () => {
    const store = useSchemaStore()
    expect(store.currentSchema).toBeNull()
    expect(store.currentFlow).toBeNull()
    expect(store.currentDiff).toBeNull()
    expect(store.currentFlowDiff).toBeNull()
    expect(store.schemaHistory).toEqual([])
    expect(store.versionHistory).toEqual([])
    expect(store.currentVersionIndex).toBe(-1)
    expect(store.currentBuildStep).toBeNull()
  })

  it('hasPreview returns true when schema exists', () => {
    const store = useSchemaStore()
    expect(store.hasPreview).toBe(false)
    store.currentSchema = [{ type: 'input', id: 'i1' }] as never
    expect(store.hasPreview).toBe(true)
  })

  it('hasPreview returns true when flow exists', () => {
    const store = useSchemaStore()
    store.currentFlow = { nodes: [], edges: [] } as never
    expect(store.hasPreview).toBe(true)
  })

  it('canUndoSchema returns true when history has entries', () => {
    const store = useSchemaStore()
    expect(store.canUndoSchema).toBe(false)
    store.schemaHistory = [[{ type: 'input', id: 'i1' }]] as never
    expect(store.canUndoSchema).toBe(true)
  })

  it('setCurrentSchema updates currentSchema', () => {
    const store = useSchemaStore()
    const schema = [{ type: 'form', id: 'f1' }] as never
    store.setCurrentSchema(schema)
    expect(store.currentSchema).toEqual(schema)
  })

  it('setCurrentFlow updates currentFlow', () => {
    const store = useSchemaStore()
    const flow = { nodes: [], edges: [] } as never
    store.setCurrentFlow(flow)
    expect(store.currentFlow).toEqual(flow)
  })

  it('pushSchemaHistory pushes current schema to history', () => {
    const store = useSchemaStore()
    store.currentSchema = [{ type: 'input', id: 'i1' }] as never
    store.pushSchemaHistory()
    expect(store.schemaHistory).toHaveLength(1)
    expect(store.schemaHistory[0]).toEqual([{ type: 'input', id: 'i1' }])
  })

  it('pushSchemaHistory does nothing when no current schema', () => {
    const store = useSchemaStore()
    store.pushSchemaHistory()
    expect(store.schemaHistory).toEqual([])
  })

  it('undoLastSchemaUpdate restores previous schema and clears diff', () => {
    const store = useSchemaStore()
    const prevSchema = [{ type: 'input', id: 'i1' }] as never
    store.schemaHistory = [prevSchema]
    store.currentSchema = [{ type: 'select', id: 's1' }] as never
    store.currentDiff = { added: [], removed: [], modified: [] } as never
    store.schemaUpdateDescription = 'test'

    store.undoLastSchemaUpdate()

    expect(store.currentSchema).toEqual(prevSchema)
    expect(store.currentDiff).toBeNull()
    expect(store.schemaUpdateDescription).toBeNull()
    expect(store.schemaHistory).toEqual([])
  })

  it('undoLastSchemaUpdate does nothing when history is empty', () => {
    const store = useSchemaStore()
    store.currentSchema = [{ type: 'input', id: 'i1' }] as never
    store.undoLastSchemaUpdate()
    expect(store.currentSchema).toEqual([{ type: 'input', id: 'i1' }])
  })

  it('clearDiff resets all diff state', () => {
    const store = useSchemaStore()
    store.currentDiff = { added: [], removed: [], modified: [] } as never
    store.currentFlowDiff = { added: [], removed: [], modified: [] } as never
    store.schemaUpdateDescription = 'test'

    store.clearDiff()

    expect(store.currentDiff).toBeNull()
    expect(store.currentFlowDiff).toBeNull()
    expect(store.schemaUpdateDescription).toBeNull()
  })

  it('setSchemaDiff updates diff and description', () => {
    const store = useSchemaStore()
    const diff = { added: [{ type: 'input', id: 'i1' }], removed: [], modified: [] } as never
    store.setSchemaDiff(diff, 'Added input')
    expect(store.currentDiff).toEqual(diff)
    expect(store.schemaUpdateDescription).toBe('Added input')
  })

  it('setSchemaDiff defaults description to null', () => {
    const store = useSchemaStore()
    const diff = { added: [], removed: [], modified: [] } as never
    store.setSchemaDiff(diff)
    expect(store.schemaUpdateDescription).toBeNull()
  })

  it('setFlowDiff updates flow diff', () => {
    const store = useSchemaStore()
    const diff = { added: [], removed: [], modified: [] } as never
    store.setFlowDiff(diff)
    expect(store.currentFlowDiff).toEqual(diff)
  })

  it('setBuildStep updates build step', () => {
    const store = useSchemaStore()
    store.setBuildStep('layout')
    expect(store.currentBuildStep).toBe('layout')
    store.setBuildStep(null)
    expect(store.currentBuildStep).toBeNull()
  })

  it('updateSchema pushes history and updates schema', () => {
    const store = useSchemaStore()
    store.currentSchema = [{ type: 'input', id: 'i1' }] as never
    const newSchema = [{ type: 'select', id: 's1' }] as never

    store.updateSchema(newSchema)

    expect(store.schemaHistory).toHaveLength(1)
    expect(store.currentSchema).toEqual(newSchema)
  })

  it('updateFlow updates current flow', () => {
    const store = useSchemaStore()
    const flow = { nodes: [{ id: 'n1' }], edges: [] } as never
    store.updateFlow(flow)
    expect(store.currentFlow).toEqual(flow)
  })

  it('loadVersionHistory fetches and sets versions', async () => {
    vi.mocked(getVersions).mockResolvedValue([
      { id: 'v1', version: 1, type: 'schema', description: 'Initial', createdAt: '2026-07-21T00:00:00Z' },
      { id: 'v2', version: 2, type: 'schema', description: 'Updated', createdAt: '2026-07-21T01:00:00Z' },
    ] as never)

    const store = useSchemaStore()
    await store.loadVersionHistory('conv-1')

    expect(store.versionHistory).toHaveLength(2)
    expect(store.versionHistory[0].id).toBe('v1')
    expect(store.currentVersionIndex).toBe(0)
    expect(getVersions).toHaveBeenCalledWith('conv-1')
  })

  it('loadVersionHistory sets index to -1 when no versions', async () => {
    vi.mocked(getVersions).mockResolvedValue([] as never)

    const store = useSchemaStore()
    await store.loadVersionHistory('conv-1')

    expect(store.versionHistory).toEqual([])
    expect(store.currentVersionIndex).toBe(-1)
  })

  it('rollbackToVersion updates schema for schema type', async () => {
    vi.mocked(rollbackVersion).mockResolvedValue({
      id: 'v1',
      version: 1,
      type: 'schema',
      content: [{ type: 'input', id: 'i1' }],
    } as never)

    const store = useSchemaStore()
    store.currentSchema = [{ type: 'select', id: 's1' }] as never
    await store.rollbackToVersion('conv-1', 'v1')

    expect(store.currentSchema).toEqual([{ type: 'input', id: 'i1' }])
    expect(store.currentDiff).toBeNull()
  })

  it('rollbackToVersion updates flow for flow type', async () => {
    vi.mocked(rollbackVersion).mockResolvedValue({
      id: 'v2',
      version: 2,
      type: 'flow',
      content: { nodes: [{ id: 'n1' }], edges: [] },
    } as never)

    const store = useSchemaStore()
    await store.rollbackToVersion('conv-1', 'v2')

    expect(store.currentFlow).toEqual({ nodes: [{ id: 'n1' }], edges: [] })
    expect(store.currentFlowDiff).toBeNull()
  })
})
