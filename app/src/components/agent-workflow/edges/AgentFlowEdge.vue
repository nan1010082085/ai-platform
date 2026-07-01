<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@vue-flow/core'
import styles from './AgentFlowEdge.module.scss'

const props = defineProps<EdgeProps>()

const isAnimated = computed(() => props.data?.animated === true)

const path = computed(() =>
  getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  }),
)
</script>

<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :marker-end="markerEnd"
    :class="isAnimated ? styles.animated : styles.static"
    :style="{ strokeWidth: 2, ...style }"
  />
  <EdgeLabelRenderer v-if="data?.branch">
    <div
      :class="styles.label"
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)`,
      }"
    >
      {{ data.branch === 'true' ? '是' : data.branch === 'false' ? '否' : data.branch }}
    </div>
  </EdgeLabelRenderer>
</template>
