<script setup lang="ts">
/**
 * PageHeader - 统一的页面标题栏
 *
 * 统一各设置/列表页的标题区风格：标题 + 副标题 + 右侧操作区。
 * 替代各页面散落的 <header><h1> / <div class=header><h2> 写法。
 */
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header :class="$style.header">
    <div :class="$style.titleRow">
      <div :class="$style.titleLeft">
        <h1 :class="$style.title">{{ title }}</h1>
        <p v-if="subtitle" :class="$style.subtitle">{{ subtitle }}</p>
        <slot />
      </div>
      <div v-if="$slots.actions" :class="$style.actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style module>
.header {
  padding: 28px 0 0;
}

.titleRow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.titleLeft {
  min-width: 0;
}

.title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--text-color-primary, #1f2329);
  line-height: 1.3;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-color-secondary, #909399);
  line-height: 1.5;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
