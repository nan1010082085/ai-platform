<script setup lang="ts">
import { useRouter, type RouteLocationRaw } from 'vue-router'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

defineProps<{ backTo: RouteLocationRaw; title: string }>()
const router = useRouter()
</script>

<template>
  <header :class="$style.bar">
    <button type="button" :class="$style.back" aria-label="返回" @click="router.push(backTo)">
      <AppIcon name="arrow-left" :size="16" />
    </button>
    <h1 :class="$style.title">{{ title }}</h1>
    <div :class="$style.actions"><slot name="actions" /></div>
  </header>
</template>

<style module>
.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 48px;
  padding: 0 16px;
  background: var(--ai-bg-white, #fff);
  border-bottom: 1px solid var(--ai-border-light, #ebedf3);
}

.back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ai-text-primary, #333);
  cursor: pointer;
  transition: background 0.2s;
}

.back:hover {
  background: var(--ai-bg-hover, #f5f7fa);
}

.back:focus-visible {
  outline: 2px solid var(--ai-color-primary, #0060a2);
  outline-offset: 2px;
}

.title {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ai-text-primary, #333);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
