<script setup lang="ts">
/**
 * ActionProposalRenderer — 行动方案步骤渲染器
 *
 * 封装 ActionProposalCard，提供与 RendererRegistry 一致的 step 驱动接口。
 */

import type { StepData } from '@/types'
import ActionProposalCard from '@/components/ActionProposalCard.vue'
import type { ActionItem } from '@/types'

const props = defineProps<{
  step: StepData
}>()

const emit = defineEmits<{
  'proposal-approve': [selectedIds: string[]]
  'proposal-reject': []
  'proposal-toggle-item': [itemId: string]
  'proposal-toggle-all': []
  'proposal-modify': [itemId: string, changes: Partial<ActionItem>]
  'proposal-reset': []
}>()
</script>

<template>
  <ActionProposalCard
    v-if="step.actionProposal"
    :proposal="step.actionProposal"
    @toggle-item="(itemId) => emit('proposal-toggle-item', itemId)"
    @toggle-all="emit('proposal-toggle-all')"
    @approve="(selectedIds) => emit('proposal-approve', selectedIds)"
    @reject="emit('proposal-reject')"
    @modify="(itemId, changes) => emit('proposal-modify', itemId, changes)"
    @reset="emit('proposal-reset')"
  />
</template>
