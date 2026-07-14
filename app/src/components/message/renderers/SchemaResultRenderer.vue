<script setup lang="ts">
/**
 * SchemaResultRenderer — Schema 结果步骤渲染器
 *
 * 从 AiMessage.vue 提取的 schema 卡片渲染逻辑。
 * 优先使用 SchemaPreviewCard（有 schemaWidgets 时），
 * 否则回退到 SchemaCard 字段列表。
 */

import type { StepData, Widget } from '@/types'
import type { SchemaField } from '@/components/SchemaCard.vue'
import SchemaPreviewCard from '@/components/SchemaPreviewCard.vue'
import SchemaCard from '@/components/SchemaCard.vue'

export interface MessageSchemaCard {
  type: 'schema'
  title: string
  fields: SchemaField[]
  primaryAction?: string
  secondaryAction?: string
}

const props = defineProps<{
  step: StepData
  cards?: MessageSchemaCard[]
  schemaWidgets?: Widget[]
}>()

const emit = defineEmits<{
  'schema-publish': []
  'schema-preview': []
}>()

const schemaCards = (props.cards ?? []).filter((c) => c.type === 'schema') as MessageSchemaCard[]
</script>

<template>
  <SchemaPreviewCard
    v-if="schemaWidgets && schemaWidgets.length > 0"
    :widgets="schemaWidgets"
    :title="schemaCards[0]?.title ?? '生成的表单'"
    compact
    @click="emit('schema-preview')"
    @primary-action="emit('schema-publish')"
    @secondary-action="emit('schema-preview')"
  />
  <template v-else>
    <SchemaCard
      v-for="(card, cIdx) in schemaCards"
      :key="cIdx"
      :title="card.title"
      :fields="card.fields"
      :primary-action="card.primaryAction"
      :secondary-action="card.secondaryAction"
      compact
      @primary-action="emit('schema-publish')"
      @secondary-action="emit('schema-preview')"
    />
  </template>
</template>
