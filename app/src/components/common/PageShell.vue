<script setup lang="ts">
/**
 * PageShell - 路由页统一外沿容器
 *
 * 为列表 / 设置 / 调试页提供左右与底部内边距、滚动与页面背景。
 * 顶距由 PageHeader（padding-top: 28px）或页面自建 header 负责。
 * 全幅页（对话、设计器、侧栏、执行详情）不要使用本组件。
 */
</script>

<template>
  <div :class="$style.shell">
    <slot />
  </div>
</template>

<style module>
.shell {
  box-sizing: border-box;
  height: 100%;
  overflow: auto;
  background: var(--bg-color-page, var(--ai-bg-gray, #f5f7fa));
  padding: 0 var(--page-padding-x, 24px) var(--page-padding-bottom, 24px);
}
</style>
