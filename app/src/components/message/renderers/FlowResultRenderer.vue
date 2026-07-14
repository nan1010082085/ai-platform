<script setup lang="ts">
/**
 * FlowResultRenderer — Flow 结果步骤渲染器
 *
 * 从 AiMessage.vue 提取的 flow 卡片渲染逻辑。
 * 优先使用 FlowPreviewCard（有 graph 时），
 * 否则回退到 FlowCard 节点列表。
 */

import type { StepData, FlowGraph } from '@/types'
import type { FlowNode } from '@/components/FlowCard.vue'
import FlowPreviewCard from '@/components/FlowPreviewCard.vue'
import FlowCard from '@/components/FlowCard.vue'

export interface MessageFlowCard {
  type: 'flow'
  title: string
  nodes: FlowNode[]
  graph?: FlowGraph
  primaryAction?: string
  secondaryAction?: string
}

const props = defineProps<{
  step: StepData
  cards?: MessageFlowCard[]
}>()

const emit = defineEmits<{
  'flow-publish': []
  'flow-preview': []
}>()

const flowCards = (props.cards ?? []).filter((c) => c.type === 'flow') as MessageFlowCard[]
</script>

<template>
  <template v-for="(card, cIdx) in flowCards" :key="cIdx">
    <FlowPreviewCard
      v-if="card.graph"
      :title="card.title"
      :graph="card.graph"
      :primary-action="card.primaryAction"
      :secondary-action="card.secondaryAction"
      compact
      @primary-action="emit('flow-publish')"
      @secondary-action="emit('flow-preview')"
    />
    <FlowCard
      v-else
      :title="card.title"
      :nodes="card.nodes"
      :primary-action="card.primaryAction"
      :secondary-action="card.secondaryAction"
      compact
      @primary-action="emit('flow-publish')"
      @secondary-action="emit('flow-preview')"
    />
  </template>
</template>
