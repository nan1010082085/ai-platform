<script setup lang="ts">
import HintText from './HintText.vue'
import styles from './FieldRow.module.scss'

defineProps<{
  label: string
  textarea?: boolean
  hint?: string
}>()
</script>

<template>
  <div :class="[styles.fieldRow, textarea && styles.fieldRowTextarea]">
    <div :class="styles.label">
      {{ label }}
      <HintText v-if="hint">{{ hint }}</HintText>
    </div>
    <div :class="[styles.control, textarea && styles.controlTextarea]">
      <slot />
    </div>
  </div>
</template>
