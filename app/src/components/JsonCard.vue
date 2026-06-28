<script setup lang="ts">
/**
 * JSON/Schema 卡片组件
 *
 * 展示 JSON 数据的简略信息，点击可查看详情。
 */

import { computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

export interface JsonCardProps {
  /** 卡片标题 */
  title: string
  /** JSON 内容 */
  content: string
  /** 卡片类型 */
  type?: 'json' | 'schema' | 'flow'
}

const props = withDefaults(defineProps<JsonCardProps>(), {
  type: 'json',
})

const emit = defineEmits<{
  click: []
}>()

// 解析 JSON 内容
const parsedData = computed(() => {
  try {
    return JSON.parse(props.content)
  } catch {
    return null
  }
})

// 获取简略描述
const summary = computed(() => {
  if (!parsedData.value) return 'JSON 数据'

  const data = parsedData.value

  // Schema 类型
  if (Array.isArray(data)) {
    const count = data.length
    const types = [...new Set(data.map((item: any) => item.type).filter(Boolean))]
    if (types.length > 0) {
      return `${count} 个组件 (${types.slice(0, 3).join(', ')}${types.length > 3 ? '...' : ''})`
    }
    return `${count} 个元素`
  }

  // Flow 类型
  if (data.nodes && Array.isArray(data.nodes)) {
    const nodeCount = data.nodes.length
    const edgeCount = data.edges?.length ?? 0
    return `${nodeCount} 个节点, ${edgeCount} 条连线`
  }

  // 普通对象
  const keys = Object.keys(data)
  if (keys.length > 0) {
    return `${keys.length} 个字段 (${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''})`
  }

  return 'JSON 数据'
})

// 获取图标
const icon = computed(() => {
  switch (props.type) {
    case 'schema':
      return 'document'
    case 'flow':
      return 'connection'
    default:
      return 'files'
  }
})

// 获取类型标签
const typeLabel = computed(() => {
  switch (props.type) {
    case 'schema':
      return 'Schema'
    case 'flow':
      return 'Flow'
    default:
      return 'JSON'
  }
})

function handleClick(): void {
  emit('click')
}
</script>

<template>
  <div :class="$style.card" @click="handleClick">
    <div :class="$style.icon">
      <AppIcon :name="icon" :size="16" />
    </div>
    <div :class="$style.content">
      <div :class="$style.title">{{ title }}</div>
      <div :class="$style.summary">{{ summary }}</div>
    </div>
    <div :class="$style.meta">
      <span :class="$style.typeBadge">{{ typeLabel }}</span>
      <AppIcon name="arrow-right" :size="12" :class="$style.arrow" />
    </div>
  </div>
</template>

<style module>
.card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--ai-bg-gray, #F5F7FA);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid var(--ai-border-light, #EBEDF3);
}

.card:hover {
  background: var(--ai-bg-hover, #E5EFF6);
  border-color: var(--ai-color-primary, #00d4ff);
}

.icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--ai-color-primary-bg, rgba(0, 212, 255, 0.1));
  color: var(--ai-color-primary, #00d4ff);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.content {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ai-text-primary, #333333);
  margin-bottom: 2px;
}

.summary {
  font-size: 12px;
  color: var(--ai-text-hint, #999999);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.typeBadge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  background: var(--ai-color-primary-bg, rgba(0, 212, 255, 0.1));
  color: var(--ai-color-primary, #00d4ff);
}

.arrow {
  color: var(--ai-text-hint, #999999);
}
</style>
