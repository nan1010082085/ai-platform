<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@vue-flow/core'
import { useAgentWorkflowDesignerStore } from '@/stores/agentWorkflowDesigner'
import { useEdgePath } from '@/composables/useEdgePath'
import { EDGE_LINE_STYLE_KEY, type EdgeLineStyle } from '@/types/edgeLineStyle'
import type { EdgeRuntimeState } from '@/utils/edgeRuntimeState'
import styles from './AgentFlowEdge.module.scss'

const props = defineProps<EdgeProps>()

const store = useAgentWorkflowDesignerStore()
const injectedStyle = inject<Ref<EdgeLineStyle> | null>(EDGE_LINE_STYLE_KEY, null)

const lineStyle = computed<EdgeLineStyle>(() => {
  const fromData = props.data?.lineStyle as EdgeLineStyle | undefined
  if (fromData) return fromData
  if (injectedStyle) return injectedStyle.value
  return store.edgeLineStyle
})

const { path } = useEdgePath(props, lineStyle)

const runtimeState = computed(() => props.data?.runtimeState as EdgeRuntimeState | undefined)
const isAnimated = computed(() => props.data?.animated === true)

const edgeLabel = computed(() => {
  const dataLabel = props.data?.label
  if (typeof dataLabel === 'string' && dataLabel.length > 0) return dataLabel
  if (typeof props.label === 'string' && props.label.length > 0) return props.label
  return ''
})

const branchLabel = computed(() => {
  const branch = props.data?.branch
  if (branch === 'true') return '是'
  if (branch === 'false') return '否'
  if (typeof branch === 'string' && branch.length > 0) return branch
  return ''
})

const edgePathClass = computed(() => {
  switch (runtimeState.value) {
    case 'edge-pending':
      return styles.pending
    case 'edge-completed':
      return styles.completed
    case 'edge-failed':
      return styles.failed
    case 'edge-active':
      return styles.animated
    default:
      return isAnimated.value ? styles.animated : styles.static
  }
})
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :marker-end="markerEnd"
    :interaction-width="interactionWidth ?? 20"
    :class="[edgePathClass, selected && styles.selected]"
    :style="{ strokeWidth: selected ? 2.5 : 2, ...style }"
  />
  <EdgeLabelRenderer v-if="edgeLabel || branchLabel">
    <div
      :class="styles.label"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)`,
      }"
    >
      {{ edgeLabel || branchLabel }}
    </div>
  </EdgeLabelRenderer>
</template>
