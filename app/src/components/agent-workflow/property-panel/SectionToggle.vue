<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import styles from './SectionToggle.module.scss'

const props = withDefaults(defineProps<{
  title: string
  count?: number
  defaultOpen?: boolean
}>(), {
  defaultOpen: true,
})

const isOpen = ref(props.defaultOpen)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div :class="styles.section">
    <div :class="styles.header" @click="toggle">
      <AppIcon v-if="isOpen" name="arrow-down" :class="styles.arrow" :size="12" />
      <AppIcon v-else name="arrow-right" :class="styles.arrow" :size="12" />
      <span :class="styles.label">{{ title }}</span>
      <span v-if="count !== undefined" :class="styles.count">{{ count }}</span>
    </div>
    <div v-show="isOpen" :class="styles.body">
      <slot />
    </div>
  </div>
</template>
