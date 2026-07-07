<script setup lang="ts">
import { computed } from 'vue'
import TruncatedTooltipText from './TruncatedTooltipText.vue'
import styles from './FieldRow.module.scss'

const props = defineProps<{
  label: string
  textarea?: boolean
  hint?: string
}>()

const labelTooltip = computed(() => {
  if (props.hint?.trim()) {
    return `${props.label}\n${props.hint.trim()}`
  }
  return props.label
})
</script>

<template>
  <div :class="[styles.fieldRow, textarea && styles.fieldRowTextarea]">
    <div :class="styles.label">
      <TruncatedTooltipText :content="labelTooltip" :class="styles.labelText">
        {{ label }}
      </TruncatedTooltipText>
    </div>
    <div :class="[styles.control, textarea && styles.controlTextarea]">
      <slot />
    </div>
  </div>
</template>
