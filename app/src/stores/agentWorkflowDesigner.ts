import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import type { AgentWorkflowGraph, AgentNodeType, AgentWorkflowNodeData, AgentNodeRecord } from '@/types/agentWorkflow'
import { getPaletteItem } from '@/constants/agentNodes'

function graphToVueFlow(graph: AgentWorkflowGraph): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { ...n.data },
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      type: 'agent-edge',
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      data: { ...e.data },
    })),
  }
}

function stripRuntimeFields(data: Record<string, unknown>): AgentWorkflowNodeData {
  const { runtimeRecord: _runtime, ...rest } = data
  return rest as AgentWorkflowNodeData
}

function vueFlowToGraph(nodes: Node[], edges: Edge[], entryNodeId: string): AgentWorkflowGraph {
  return {
    entryNodeId,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type as AgentNodeType,
      position: n.position,
      data: stripRuntimeFields((n.data ?? { label: n.id }) as Record<string, unknown>),
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
      data: (e.data as AgentWorkflowGraph['edges'][0]['data']) ?? undefined,
    })),
  }
}

export const useAgentWorkflowDesignerStore = defineStore('agentWorkflowDesigner', () => {
  const workflowId = ref<string | null>(null)
  const workflowName = ref('未命名工作流')
  const workflowDescription = ref('')
  const entryNodeId = ref('trigger-1')
  const nodes = shallowRef<Node[]>([])
  const edges = shallowRef<Edge[]>([])
  const selectedNodeId = ref<string | null>(null)
  const selectedEdgeId = ref<string | null>(null)
  const dirty = ref(false)
  const saving = ref(false)

  function loadGraph(graph: AgentWorkflowGraph) {
    entryNodeId.value = graph.entryNodeId
    const vf = graphToVueFlow(graph)
    nodes.value = vf.nodes
    edges.value = vf.edges
    ensureEntryNodeId()
    dirty.value = false
  }

  function ensureEntryNodeId() {
    if (entryNodeId.value && nodes.value.some((n) => n.id === entryNodeId.value)) return
    const trigger = nodes.value.find((n) => n.type === 'manual-trigger' || n.type === 'webhook-trigger')
    entryNodeId.value = trigger?.id ?? nodes.value[0]?.id ?? ''
  }

  function getGraph(): AgentWorkflowGraph {
    ensureEntryNodeId()
    return vueFlowToGraph(nodes.value, edges.value, entryNodeId.value)
  }

  function markDirty() {
    dirty.value = true
  }

  function addNode(type: AgentNodeType, position: { x: number; y: number }) {
    const palette = getPaletteItem(type)
    const id = `${type}-${crypto.randomUUID().slice(0, 8)}`
    nodes.value = [
      ...nodes.value,
      {
        id,
        type,
        position,
        data: { label: palette?.label ?? type, ...palette?.defaultData },
      },
    ]
    if (type === 'manual-trigger' && !nodes.value.some((n) => n.id === entryNodeId.value)) {
      entryNodeId.value = id
    }
    if (type === 'webhook-trigger' && !nodes.value.some((n) => n.id === entryNodeId.value)) {
      entryNodeId.value = id
    }
    dirty.value = true
  }

  function removeNode(id: string) {
    nodes.value = nodes.value.filter((n) => n.id !== id)
    edges.value = edges.value.filter((e) => e.source !== id && e.target !== id)
    if (entryNodeId.value === id) {
      const trigger = nodes.value.find((n) => n.type === 'manual-trigger' || n.type === 'webhook-trigger')
      entryNodeId.value = trigger?.id ?? nodes.value[0]?.id ?? ''
    }
    dirty.value = true
  }

  function addEdge(edge: Edge) {
    edges.value = [...edges.value, { ...edge, type: 'agent-edge', data: { animated: false, ...edge.data } }]
    dirty.value = true
  }

  function removeEdge(id: string) {
    edges.value = edges.value.filter((e) => e.id !== id)
    dirty.value = true
  }

  function updateNodeData(id: string, data: Record<string, unknown>) {
    nodes.value = nodes.value.map((n) =>
      n.id === id ? { ...n, data: { ...(n.data as object), ...data } } : n,
    )
    dirty.value = true
  }

  function updateEdgeData(id: string, data: Record<string, unknown>) {
    edges.value = edges.value.map((e) =>
      e.id === id ? { ...e, data: { ...(e.data as object), ...data } } : e,
    )
    dirty.value = true
  }

  function selectNode(id: string | null) {
    selectedNodeId.value = id
    selectedEdgeId.value = null
  }

  function selectEdge(id: string | null) {
    selectedEdgeId.value = id
    selectedNodeId.value = null
  }

  function applyExecutionHighlight(
    activeNodeIds: string[],
    completedNodeIds: string[],
    records: AgentNodeRecord[] = [],
  ) {
    const activeSet = new Set(activeNodeIds)
    const completedSet = new Set(completedNodeIds)
    const recordMap = new Map(records.map((r) => [r.nodeId, r]))
    nodes.value = nodes.value.map((n) => {
      let cls = ''
      const record = recordMap.get(n.id)
      if (activeSet.has(n.id)) cls = 'aw-node-running'
      else if (completedSet.has(n.id)) cls = 'aw-node-success'
      else if (record?.status === 'error') cls = 'aw-node-error'
      else if (record?.status === 'waiting') cls = 'aw-node-waiting'
      const baseData = stripRuntimeFields((n.data ?? { label: n.id }) as Record<string, unknown>)
      return {
        ...n,
        class: cls,
        data: {
          ...baseData,
          runtimeRecord: record ?? null,
        },
      }
    })
    edges.value = edges.value.map((e) => {
      const animated = activeSet.has(e.target) && completedSet.has(e.source)
      return {
        ...e,
        class: animated ? 'aw-edge-active' : completedSet.has(e.source) && completedSet.has(e.target) ? 'aw-edge-done' : '',
        data: { ...(e.data as object), animated },
      }
    })
  }

  function reset() {
    workflowId.value = null
    workflowName.value = '未命名工作流'
    workflowDescription.value = ''
    nodes.value = []
    edges.value = []
    dirty.value = false
  }

  return {
    workflowId,
    workflowName,
    workflowDescription,
    entryNodeId,
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    dirty,
    saving,
    loadGraph,
    getGraph,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    updateNodeData,
    updateEdgeData,
    selectNode,
    selectEdge,
    applyExecutionHighlight,
    reset,
    markDirty,
    ensureEntryNodeId,
  }
})
