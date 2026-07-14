<script setup lang="ts">
/**
 * AiMessageActionBar — 消息操作栏
 *
 * 从 AiMessage.vue 提取的独立组件，负责：
 * - 复制按钮（调用 clipboard API）
 * - 重新生成按钮
 * - 反馈按钮（👍/👎）
 * - hover 时显示（带 300ms 延迟）
 */

import { ref, watch } from 'vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

// ---- Props ----

const props = defineProps<{
  /** 消息内容，用于复制功能 */
  content?: string
  /** 消息 ID，用于反馈 API */
  messageId?: string
  /** 当前反馈状态 */
  feedback?: 'positive' | 'negative' | null
  /** 父组件是否处于 hover 状态 */
  isHovered: boolean
}>()

// ---- Emits ----

const emit = defineEmits<{
  copy: []
  regenerate: []
  feedback: [type: 'positive' | 'negative']
}>()

// ---- State ----

const showActions = ref(false)
let hoverTimer: ReturnType<typeof setTimeout> | null = null

const currentFeedback = ref<'positive' | 'negative' | null>(props.feedback ?? null)

// ---- Watchers ----

watch(() => props.feedback, (newVal) => {
  currentFeedback.value = newVal ?? null
})

watch(() => props.isHovered, (hovered) => {
  if (hovered) {
    hoverTimer = setTimeout(() => {
      showActions.value = true
    }, 300)
  } else {
    showActions.value = false
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      hoverTimer = null
    }
  }
})

// ---- Handlers ----

function handleCopy(): void {
  if (props.content) {
    navigator.clipboard.writeText(props.content)
    message.success('已复制到剪贴板')
  }
  emit('copy')
}

function handleRegenerate(): void {
  emit('regenerate')
}

function handleFeedback(type: 'positive' | 'negative'): void {
  // Toggle off if clicking the same feedback
  if (currentFeedback.value === type) {
    currentFeedback.value = null
  } else {
    currentFeedback.value = type
  }
  emit('feedback', type)
}
</script>

<template>
  <div :class="[$style.actionMenu, { [$style.actionMenuVisible]: showActions }]">
    <el-tooltip content="复制" placement="top" :show-after="300">
      <button :class="$style.actionBtn" @click="handleCopy">
        <AppIcon name="copy-document" :size="14" />
      </button>
    </el-tooltip>
    <el-tooltip content="重新生成" placement="top" :show-after="300">
      <button :class="$style.actionBtn" @click="handleRegenerate">
        <AppIcon name="refresh" :size="14" />
      </button>
    </el-tooltip>
    <el-tooltip content="点赞" placement="top" :show-after="300">
      <button
        :class="[$style.actionBtn, { [$style.actionBtnActive]: currentFeedback === 'positive' }]"
        @click="handleFeedback('positive')"
      >
        <AppIcon name="star" :size="14" />
      </button>
    </el-tooltip>
    <el-tooltip content="点踩" placement="top" :show-after="300">
      <button
        :class="[$style.actionBtn, { [$style.actionBtnActive]: currentFeedback === 'negative' }]"
        @click="handleFeedback('negative')"
      >
        <AppIcon name="star" :size="14" />
      </button>
    </el-tooltip>
  </div>
</template>

<style module>
/* ---- Action menu (hover to show) ---- */
.actionMenu {
  display: flex;
  gap: 2px;
  margin-top: 8px;
  padding: 4px;
  background: var(--bg-color-white, #FFFFFF);
  border: 1px solid var(--border-color-light, #EBEDF3);
  border-radius: 8px;
  box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.08));
  width: fit-content;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
}

.actionMenuVisible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.actionBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-color-secondary, #666666);
  transition: all 0.15s ease;
}

.actionBtn:hover {
  background: var(--bg-color-hover, #E5EFF6);
  color: var(--color-primary, #0060A2);
}

.actionBtnActive {
  color: var(--color-primary, #0060A2);
  background: var(--color-primary-lighter, #EEF5FF);
}

.actionBtnActive:hover {
  color: var(--color-primary-hover, #4581E9);
  background: var(--color-primary-lighter, #EEF5FF);
}
</style>
