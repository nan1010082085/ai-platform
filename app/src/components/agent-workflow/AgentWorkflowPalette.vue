<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { AGENT_PALETTE_ITEMS, AGENT_NODE_COLORS } from '@/constants/agentNodes'
import { usePluginRegistry } from '@/composables/usePluginRegistry'
import type { AgentNodeType } from '@/types/agentWorkflow'
import type { AgentPaletteItem } from '@/constants/agentNodes'
import styles from './AgentWorkflowPalette.module.scss'

const { expertPaletteItems, toolPaletteItems, load, expertColor } = usePluginRegistry()

onMounted(() => {
  void load()
})

const categories = [
  { key: 'trigger', label: '触发器' },
  { key: 'ai', label: 'AI' },
  { key: 'experts', label: '专家 Agent' },
  { key: 'tools', label: 'MCP 工具' },
  { key: 'logic', label: '逻辑' },
  { key: 'action', label: '动作' },
] as const

const staticByCategory = computed(() => {
  const map = new Map<string, AgentPaletteItem[]>()
  for (const item of AGENT_PALETTE_ITEMS) {
    const list = map.get(item.category) ?? []
    list.push(item)
    map.set(item.category, list)
  }
  return map
})

function itemsForCategory(key: string): AgentPaletteItem[] {
  if (key === 'experts') {
    return [...(staticByCategory.value.get('experts') ?? []), ...expertPaletteItems.value]
  }
  if (key === 'tools') {
    return toolPaletteItems.value.length > 0
      ? toolPaletteItems.value
      : (staticByCategory.value.get('tools') ?? [])
  }
  return staticByCategory.value.get(key) ?? []
}

function itemColor(type: AgentNodeType, expertId?: string): string {
  if (type === 'expert' && expertId) return expertColor(expertId)
  return AGENT_NODE_COLORS[type] ?? '#909399'
}

function onDragStart(e: DragEvent, item: AgentPaletteItem) {
  e.dataTransfer?.setData(
    'application/agent-node',
    JSON.stringify({
      type: item.type,
      expertId: item.defaultData.expertId,
      toolName: item.defaultData.toolName,
      label: item.defaultData.label,
    }),
  )
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
</script>

<template>
  <div :class="styles.palette">
    <div :class="styles.title">节点</div>
    <div v-for="cat in categories" :key="cat.key" :class="styles.section">
      <div :class="styles.sectionTitle">{{ cat.label }}</div>
      <div :class="styles.items">
        <div
          v-for="item in itemsForCategory(cat.key)"
          :key="`${item.type}-${item.defaultData.expertId ?? item.defaultData.toolName ?? item.label}`"
          :class="styles.item"
          :style="{ '--item-accent': itemColor(item.type, item.defaultData.expertId) }"
          draggable="true"
          @dragstart="onDragStart($event, item)"
        >
          <div :class="styles.iconWrap">
            <AppIcon :name="item.icon" :size="15" />
          </div>
          <div :class="styles.itemText">
            <span :class="styles.itemLabel">{{ item.label }}</span>
            <span :class="styles.itemDesc">{{ item.description }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
