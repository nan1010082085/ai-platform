import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAgentWorkflowDesignerStore } from '@/stores/agentWorkflowDesigner'
import type { AgentNodeRecord } from '@/types/agentWorkflow'

describe('agentWorkflowDesignerStore execution runtime', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does not apply execution record when node type changed', () => {
    const store = useAgentWorkflowDesignerStore()
    store.loadGraph({
      entryNodeId: 'n1',
      nodes: [
        {
          id: 'n1',
          type: 'tool',
          position: { x: 0, y: 0 },
          data: { label: 'Schema 工具', toolName: 'schema__search' },
        },
      ],
      edges: [],
    })

    const records: AgentNodeRecord[] = [
      {
        nodeId: 'n1',
        nodeType: 'llm',
        nodeName: '旧 LLM',
        status: 'success',
      },
    ]

    store.applyExecutionHighlight([], [], records)
    expect(store.nodes[0]?.data?.runtimeRecord).toBeNull()

    store.replaceNode('n1', 'expert')
    expect(store.nodes[0]?.type).toBe('expert')
    expect(store.nodes[0]?.data?.runtimeRecord).toBeUndefined()
  })

  it('replaceNode keeps edges on the same node id', () => {
    const store = useAgentWorkflowDesignerStore()
    store.loadGraph({
      entryNodeId: 't1',
      nodes: [
        { id: 't1', type: 'manual-trigger', position: { x: 0, y: 0 }, data: { label: '触发' } },
        { id: 'n1', type: 'llm', position: { x: 200, y: 0 }, data: { label: 'LLM' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'n1' }],
    })

    store.replaceNode('n1', 'tool')
    expect(store.nodes.find((n) => n.id === 'n1')?.type).toBe('tool')
    expect(store.edges.some((e) => e.source === 't1' && e.target === 'n1')).toBe(true)
  })

  it('sets edge runtime state class and data.runtimeState on execution highlight', () => {
    const store = useAgentWorkflowDesignerStore()
    store.loadGraph({
      entryNodeId: 't1',
      nodes: [
        { id: 't1', type: 'manual-trigger', position: { x: 0, y: 0 }, data: { label: '触发' } },
        { id: 'n1', type: 'llm', position: { x: 200, y: 0 }, data: { label: 'LLM' } },
        { id: 'n2', type: 'llm', position: { x: 400, y: 0 }, data: { label: 'LLM2' } },
      ],
      edges: [
        { id: 'e1', source: 't1', target: 'n1' },
        { id: 'e2', source: 'n1', target: 'n2' },
      ],
    })

    store.applyExecutionHighlight(
      ['n2'],
      ['t1', 'n1'],
      [
        { nodeId: 't1', nodeType: 'manual-trigger', nodeName: '触发', status: 'success' },
        { nodeId: 'n1', nodeType: 'llm', nodeName: 'LLM', status: 'success' },
        { nodeId: 'n2', nodeType: 'llm', nodeName: 'LLM2', status: 'running' },
      ],
    )

    const e1 = store.edges.find((e) => e.id === 'e1')
    const e2 = store.edges.find((e) => e.id === 'e2')
    expect(e1?.class).toBe('edge-completed')
    expect(e1?.data?.runtimeState).toBe('edge-completed')
    expect(e1?.data?.animated).toBe(false)
    expect(e2?.class).toBe('edge-active')
    expect(e2?.data?.runtimeState).toBe('edge-active')
    expect(e2?.data?.animated).toBe(true)
  })

  it('marks unexecuted edges as edge-pending with runtimeState in data', () => {
    const store = useAgentWorkflowDesignerStore()
    store.loadGraph({
      entryNodeId: 't1',
      nodes: [
        { id: 't1', type: 'manual-trigger', position: { x: 0, y: 0 }, data: { label: '触发' } },
        { id: 'n1', type: 'llm', position: { x: 200, y: 0 }, data: { label: 'LLM' } },
        { id: 'n2', type: 'llm', position: { x: 400, y: 0 }, data: { label: 'LLM2' } },
      ],
      edges: [
        { id: 'e1', source: 't1', target: 'n1' },
        { id: 'e2', source: 'n1', target: 'n2' },
      ],
    })

    store.applyExecutionHighlight(
      ['n1'],
      ['t1'],
      [
        { nodeId: 't1', nodeType: 'manual-trigger', nodeName: '触发', status: 'success' },
        { nodeId: 'n1', nodeType: 'llm', nodeName: 'LLM', status: 'running' },
      ],
    )

    const e2 = store.edges.find((e) => e.id === 'e2')
    expect(e2?.class).toBe('edge-pending')
    expect(e2?.data?.runtimeState).toBe('edge-pending')
    expect(e2?.data?.animated).toBe(false)
  })

  it('clears edge runtimeState when node data is updated', () => {
    const store = useAgentWorkflowDesignerStore()
    store.loadGraph({
      entryNodeId: 't1',
      nodes: [
        { id: 't1', type: 'manual-trigger', position: { x: 0, y: 0 }, data: { label: '触发' } },
        { id: 'n1', type: 'llm', position: { x: 200, y: 0 }, data: { label: 'LLM' } },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'n1' }],
    })

    store.applyExecutionHighlight(
      [],
      ['t1', 'n1'],
      [
        { nodeId: 't1', nodeType: 'manual-trigger', nodeName: '触发', status: 'success' },
        { nodeId: 'n1', nodeType: 'llm', nodeName: 'LLM', status: 'success' },
      ],
    )
    expect(store.edges[0]?.data?.runtimeState).toBe('edge-completed')

    store.updateNodeData('n1', { prompt: 'updated' })
    expect(store.edges[0]?.class).toBeUndefined()
    expect(store.edges[0]?.data?.runtimeState).toBeUndefined()
    expect(store.edges[0]?.data?.animated).toBe(false)
  })

  it('clears runtime record when node data is updated', () => {
    const store = useAgentWorkflowDesignerStore()
    store.loadGraph({
      entryNodeId: 'n1',
      nodes: [
        {
          id: 'n1',
          type: 'llm',
          position: { x: 0, y: 0 },
          data: { label: 'LLM', prompt: 'a' },
        },
      ],
      edges: [],
    })

    store.applyExecutionHighlight(
      [],
      ['n1'],
      [
        {
          nodeId: 'n1',
          nodeType: 'llm',
          nodeName: 'LLM',
          status: 'success',
        },
      ],
    )
    expect(store.nodes[0]?.data?.runtimeRecord).toBeTruthy()

    store.updateNodeData('n1', { prompt: 'b' })
    expect(store.nodes[0]?.data?.runtimeRecord).toBeUndefined()
  })
})
