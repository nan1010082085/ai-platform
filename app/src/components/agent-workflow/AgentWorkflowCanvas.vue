<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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

const props = defineProps<{
  readOnly?: boolean
  disableDelete?: boolean
}>()

const store = useAgentWorkflowDesignerStore()
const canvasEl = ref<HTMLDivElement>()

const defaultEdgeOptions = {
  type: 'agent-edge' as const,
  markerEnd: { type: MarkerType.ArrowClosed },
  data: { animated: false },
}

const { onConnect, onNodeClick, onEdgeClick, onPaneClick, onNodesChange, onEdgesChange, screenToFlowCoordinate } = useVueFlow({
  id: 'agent-workflow-canvas',
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
  if (!props.readOnly) store.selectNode(node.id)
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
  const { type } = JSON.parse(raw) as { type: AgentNodeType }
  const position = screenToFlowCoordinate({
    x: e.clientX - 80,
    y: e.clientY - 24,
  })
  store.addNode(type, position)
}

function onKeyDown(e: KeyboardEvent) {
  if (props.readOnly || props.disableDelete) return
  const target = e.target as HTMLElement
  if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selectedNodeId) store.removeNode(store.selectedNodeId)
    if (store.selectedEdgeId) store.removeEdge(store.selectedEdgeId)
  }
}

onMounted(() => {
  if (!props.readOnly) window.addEventListener('keydown', onKeyDown)
})
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <div
    ref="canvasEl"
    :class="styles.canvas"
    @drop="onDrop"
    @dragover="onDragOver"
  >
    <VueFlow
      id="agent-workflow-canvas"
      v-model:nodes="store.nodes"
      v-model:edges="store.edges"
      :class="styles.flow"
      :default-edge-options="defaultEdgeOptions"
      :nodes-connectable="!readOnly"
      :nodes-draggable="!readOnly"
      :edges-updatable="!readOnly"
      :elements-selectable="!readOnly"
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
