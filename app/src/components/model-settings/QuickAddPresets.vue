<script setup lang="ts">
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { ProviderPreset } from './types'
import styles from '@/views/ModelSettingsView.module.scss'

defineProps<{
  presets: ProviderPreset[]
}>()

const emit = defineEmits<{
  quickAdd: [preset: ProviderPreset]
}>()
</script>

<template>
  <div :class="styles.quickAddSection">
    <div :class="styles.quickAddLabel">快速添加供应商：</div>
    <div :class="styles.quickAddRow">
      <button
        v-for="preset in presets"
        :key="preset.type"
        :class="styles.presetCard"
        @click="emit('quickAdd', preset)"
      >
        <div :class="styles.presetCardIcon" :style="{ color: preset.color }">
          <AppIcon :name="preset.icon" :size="20" />
        </div>
        <div :class="styles.presetCardInfo">
          <div :class="styles.presetCardName">{{ preset.label }}</div>
          <div :class="styles.presetCardDesc">{{ preset.description }}</div>
        </div>
        <AppIcon name="plus" :size="16" :class="styles.presetCardAdd" />
      </button>
    </div>
  </div>
</template>
