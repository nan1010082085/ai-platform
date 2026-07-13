<script setup lang="ts">
/**
 * SmartSuggestionCard — 智能建议卡片
 *
 * 显示 AI 生成的智能建议，支持采纳/忽略操作。
 * 支持键盘导航：Tab 切换、Enter/Space 采纳、Escape 忽略。
 */

import { computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

export interface SuggestionItem {
  id: string
  type: 'action' | 'optimization' | 'reference'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  targetId?: string
  targetName?: string
}

const props = defineProps<{
  suggestion: SuggestionItem
  accepted?: boolean
  dismissed?: boolean
}>()

const emit = defineEmits<{
  accept: [id: string]
  dismiss: [id: string]
}>()

const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
  action: { icon: 'promotion', label: '操作', color: '#409EFF' },
  optimization: { icon: 'magic-stick', label: '优化', color: '#E6A23C' },
  reference: { icon: 'document', label: '参考', color: '#67C23A' },
}

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  high: { label: '高', color: '#F56C6C', bgColor: '#fef0f0' },
  medium: { label: '中', color: '#E6A23C', bgColor: '#fdf6ec' },
  low: { label: '低', color: '#909399', bgColor: '#f4f4f5' },
}

const currentType = computed(() => typeConfig[props.suggestion.type] ?? typeConfig.action)
const currentPriority = computed(() => priorityConfig[props.suggestion.priority] ?? priorityConfig.medium)
const isActionable = computed(() => !props.accepted && !props.dismissed)

function handleAccept(): void {
  if (!isActionable.value) return
  emit('accept', props.suggestion.id)
}

function handleDismiss(): void {
  if (!isActionable.value) return
  emit('dismiss', props.suggestion.id)
}

function handleKeydown(event: KeyboardEvent): void {
  if (!isActionable.value) return

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleAccept()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    handleDismiss()
  }
}
</script>

<template>
  <div
    :class="[
      $styles.card,
      accepted && $styles.accepted,
      dismissed && $styles.dismissed,
    ]"
    :tabindex="isActionable ? 0 : -1"
    role="article"
    :aria-label="`建议: ${suggestion.title}`"
    @keydown="handleKeydown"
  >
    <div :class="$styles.header">
      <div :class="$styles.typeBadge" :style="{ color: currentType.color }">
        <AppIcon :name="currentType.icon" :size="14" />
        <span>{{ currentType.label }}</span>
      </div>
      <div
        :class="$styles.priorityBadge"
        :style="{
          color: currentPriority.color,
          background: currentPriority.bgColor,
        }"
      >
        {{ currentPriority.label }}优先
      </div>
    </div>

    <div :class="$styles.body">
      <div :class="$styles.title">{{ suggestion.title }}</div>
      <div :class="$styles.description">{{ suggestion.description }}</div>
      <div v-if="suggestion.targetName" :class="$styles.target">
        <AppIcon name="connection" :size="12" />
        <span>{{ suggestion.targetName }}</span>
      </div>
    </div>

    <div v-if="isActionable" :class="$styles.actions">
      <button
        :class="$styles.acceptBtn"
        type="button"
        @click="handleAccept"
      >
        <AppIcon name="check" :size="14" />
        采纳
      </button>
      <button
        :class="$styles.dismissBtn"
        type="button"
        @click="handleDismiss"
      >
        <AppIcon name="close" :size="14" />
        忽略
      </button>
    </div>

    <div v-if="accepted" :class="$styles.statusBadge">
      <AppIcon name="check" :size="14" />
      已采纳
    </div>
    <div v-if="dismissed" :class="[$styles.statusBadge, $styles.statusDismissed]">
      <AppIcon name="close" :size="14" />
      已忽略
    </div>
  </div>
</template>

<style module>
.card {
  border: 1px solid var(--border-color-lighter, #e4e7ed);
  border-radius: 8px;
  padding: 12px;
  background: var(--bg-color, #fff);
  transition: all 0.2s;
  outline: none;
}

.card:hover {
  border-color: var(--color-primary, #409eff);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.card:focus-visible {
  border-color: var(--color-primary, #409eff);
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
}

.accepted {
  border-color: var(--color-success, #67c23a);
  background: var(--color-success-light-9, #f0f9eb);
}

.accepted:hover {
  border-color: var(--color-success, #67c23a);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.1);
}

.dismissed {
  opacity: 0.5;
  border-color: var(--border-color-lighter, #e4e7ed);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.typeBadge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}

.priorityBadge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
}

.body {
  margin-bottom: 8px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color-primary, #303133);
  margin-bottom: 4px;
}

.description {
  font-size: 13px;
  color: var(--text-color-regular, #606266);
  line-height: 1.5;
}

.target {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-color-secondary, #909399);
}

.actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color-lighter, #ebeef5);
}

.acceptBtn,
.dismissBtn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.15s;
  font-family: inherit;
}

.acceptBtn:focus-visible,
.dismissBtn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
}

.acceptBtn {
  background: var(--color-primary, #409eff);
  border-color: var(--color-primary, #409eff);
  color: #fff;
}

.acceptBtn:hover {
  background: var(--color-primary-light-3, #79bbff);
}

.dismissBtn {
  background: transparent;
  border-color: var(--border-color, #dcdfe6);
  color: var(--text-color-regular, #606266);
}

.dismissBtn:hover {
  border-color: var(--color-primary, #409eff);
  color: var(--color-primary, #409eff);
}

.statusBadge {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color-lighter, #ebeef5);
  font-size: 12px;
  color: var(--color-success, #67c23a);
  font-weight: 500;
}

.statusDismissed {
  color: var(--text-color-secondary, #909399);
}
</style>
