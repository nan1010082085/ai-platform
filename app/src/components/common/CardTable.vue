<script setup lang="ts">
/**
 * CardTable — 卡片式表格容器
 *
 * 统一背景、边框、圆角、内边距，包裹 el-table 或其他内容。
 * 消除各视图中 tableWrap / modelTableWrap / cardWrap 等重复样式。
 */
import styles from './CardTable.module.scss'

const props = withDefaults(
  defineProps<{
    /** 是否显示加载状态 */
    loading?: boolean
    /** 自定义内边距 */
    padding?: string
    /** 无边框模式 */
    borderless?: boolean
  }>(),
  {
    loading: false,
    padding: '8px',
    borderless: false,
  },
)
</script>

<template>
  <div
    v-loading="props.loading"
    :class="[styles.card, props.borderless && styles.borderless]"
    :style="{ padding: props.padding }"
  >
    <slot />
  </div>
</template>
