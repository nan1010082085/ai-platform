<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, provide, toRef, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import { useAgentWorkflowDesignerStore } from '@/stores/agentWorkflowDesigner'
import AgentFlowNode from './nodes/AgentFlowNode.vue'
import AgentFlowEdge from './edges/AgentFlowEdge.vue'
import type { AgentNodeType } from '@/types/agentWorkflow'
import { AGENT_PALETTE_ITEMS } from '@/constants/agentNodes'
import styles from './AgentWorkflowCanvas.module.scss'
import { EDGE_LINE_STYLE_KEY } from '@/types/edgeLineStyle'

const props = withDefaults(
  defineProps<{
    readOnly?: boolean
    disableDelete?: boolean
    selectedNodeId?: string | null
    /** 独立 VueFlow 实例 ID，避免预览与设计器共享视口 */
    canvasId?: string
    /** 只读模式下加载后自动 fitView */
    fitViewOnLoad?: boolean
  }>(),
  {
    canvasId: 'agent-workflow-canvas',
    fitViewOnLoad: true,
  },
)

const emit = defineEmits<{
  nodeClick: [nodeId: string]
}>()

const store = useAgentWorkflowDesignerStore()
const { selectedNodeId, selectedEdgeId } = storeToRefs(store)
provide(EDGE_LINE_STYLE_KEY, toRef(store, 'edgeLineStyle'))
const canvasEl = ref<HTMLDivElement>()

const defaultEdgeOptions = {
  type: 'agent-edge' as const,
  markerEnd: { type: MarkerType.ArrowClosed },
  data: { animated: false },
}

const { onConnect, onNodeClick, onEdgeClick, onPaneClick, onNodesChange, onEdgesChange, screenToFlowCoordinate, addSelectedNodes, removeSelectedNodes, addSelectedEdges, removeSelectedEdges, getNodes, getEdges, fitView } = useVueFlow({
  id: props.canvasId,
})

let fitViewTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFitView() {
  if (!props.readOnly || !props.fitViewOnLoad) return
  if (fitViewTimer) clearTimeout(fitViewTimer)
  fitViewTimer = setTimeout(() => {
    nextTick(() => {
      fitView({ padding: 0.12, duration: 200 })
    })
  }, 80)
}

function syncNodeSelection(nodeId: string | null) {
  const selected = getNodes.value.filter((n) => n.selected)
  if (selected.length) removeSelectedNodes(selected)
  if (!nodeId) return
  const node = getNodes.value.find((n) => n.id === nodeId)
  if (node) addSelectedNodes([node])
}

function syncEdgeSelection(edgeId: string | null) {
  const selected = getEdges.value.filter((e) => e.selected)
  if (selected.length) removeSelectedEdges(selected)
  if (!edgeId) return
  const edge = getEdges.value.find((e) => e.id === edgeId)
  if (edge) addSelectedEdges([edge])
}

watch(selectedNodeId, (nodeId) => {
  if (props.readOnly) return
  syncNodeSelection(nodeId)
})

watch(selectedEdgeId, (edgeId) => {
  if (props.readOnly) return
  syncEdgeSelection(edgeId)
})

function markGraphDirty(changes: Array<{ type?: string }>) {
  if (props.readOnly) return
  // Only structural changes (add/remove/move) should mark the graph dirty.
  // 'dimensions' fires during initial layout and 'select' fires on click — neither modifies the graph.
  const meaningful = changes.some((c) =>
    c.type === 'add' || c.type === 'remove' || c.type === 'position',
  )
  if (meaningful) store.dirty = true
}

onNodesChange(markGraphDirty)
onEdgesChange(markGraphDirty)

onNodeClick(({ node }) => {
  if (props.readOnly) {
    emit('nodeClick', node.id)
    return
  }
  store.selectNode(node.id)
})
onEdgeClick(({ edge }) => {
  if (!props.readOnly) store.selectEdge(edge.id)
})
onPaneClick(() => {
  if (!props.readOnly) {
    store.selectNode(null)
    store.selectEdge(null)
  }
})

function syncSelectedNode(nodeId: string | null | undefined) {
  syncNodeSelection(nodeId ?? null)
}

watch(
  () => props.selectedNodeId,
  (nodeId) => {
    if (!props.readOnly) return
    syncSelectedNode(nodeId)
  },
  { immediate: true },
)

watch(
  () => store.nodes,
  () => {
    if (!props.readOnly || !props.selectedNodeId) return
    syncSelectedNode(props.selectedNodeId)
  },
)

watch(
  () => [store.nodes.length, store.edges.length, props.readOnly, props.fitViewOnLoad] as const,
  () => scheduleFitView(),
)

onMounted(() => {
  if (!props.readOnly) window.addEventListener('keydown', onKeyDown)
  scheduleFitView()
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (fitViewTimer) clearTimeout(fitViewTimer)
})

onConnect((params) => {
  if (props.readOnly) return
  store.addEdge({
    id: `e-${params.source}-${params.target}-${crypto.randomUUID().slice(0, 4)}`,
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
    data: {
      branch: params.sourceHandle === 'false' ? 'false' : params.sourceHandle === 'true' ? 'true' : undefined,
    },
  })
})

function onDragOver(e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

function onDrop(e: DragEvent) {
  if (props.readOnly || !e.dataTransfer) return
  const raw = e.dataTransfer.getData('application/agent-node')
  if (!raw) return
  const { type, expertId, toolName, label } = JSON.parse(raw) as {
    type: AgentNodeType
    expertId?: string
    toolName?: string
    label?: string
  }
  if (store.selectedNodeId) {
    store.replaceNode(store.selectedNodeId, type)
    return
  }
  const position = screenToFlowCoordinate({
    x: e.clientX - 80,
    y: e.clientY - 24,
  })
  const extra = expertId
    ? { expertId, label }
    : toolName
      ? { toolName, label }
      : undefined
  store.addNode(type, position, extra)
}

function onKeyDown(e: KeyboardEvent) {
  if (props.readOnly || props.disableDelete) return
  const target = e.target as HTMLElement
  if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    const nodeIds = new Set<string>()
    const edgeIds = new Set<string>()
    for (const n of getNodes.value.filter((n) => n.selected)) nodeIds.add(n.id)
    for (const edge of getEdges.value.filter((edge) => edge.selected)) edgeIds.add(edge.id)
    if (selectedNodeId.value) nodeIds.add(selectedNodeId.value)
    if (selectedEdgeId.value) edgeIds.add(selectedEdgeId.value)
    for (const id of nodeIds) store.removeNode(id)
    for (const id of edgeIds) store.removeEdge(id)
    if (nodeIds.size || edgeIds.size) {
      store.selectNode(null)
      store.selectEdge(null)
    }
  }
}
</script>

<template>
  <div
    ref="canvasEl"
    :class="[styles.canvas, readOnly && styles.canvasReadOnly]"
    @drop="onDrop"
    @dragover="onDragOver"
  >
    <VueFlow
      :id="canvasId"
      v-model:nodes="store.nodes"
      v-model:edges="store.edges"
      :class="styles.flow"
      :default-edge-options="defaultEdgeOptions"
      :nodes-connectable="!readOnly"
      :nodes-draggable="!readOnly"
      :edges-updatable="!readOnly"
      :elements-selectable="true"
      :snap-to-grid="true"
      :snap-grid="[16, 16]"
    >
      <template v-for="item in AGENT_PALETTE_ITEMS" :key="item.type" #[`node-${item.type}`]="nodeProps">
        <AgentFlowNode v-bind="nodeProps" />
      </template>
      <template #edge-agent-edge="edgeProps">
        <AgentFlowEdge v-bind="edgeProps" />
      </template>
      <Background :gap="16" :size="1" color="#d8dce5" />
      <Controls v-if="!readOnly" />
    </VueFlow>
  </div>
</template>
