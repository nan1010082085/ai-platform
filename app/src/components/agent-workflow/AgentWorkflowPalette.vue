<script setup lang="ts">
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { AGENT_PALETTE_ITEMS, AGENT_NODE_COLORS } from '@/constants/agentNodes'
import type { AgentNodeType } from '@/types/agentWorkflow'
import styles from './AgentWorkflowPalette.module.scss'

const categories = [
  { key: 'trigger', label: '触发器' },
  { key: 'ai', label: 'AI' },
  { key: 'experts', label: '专家 Agent' },
  { key: 'tools', label: 'MCP 工具' },
  { key: 'logic', label: '逻辑' },
  { key: 'action', label: '动作' },
] as const

function itemColor(type: AgentNodeType): string {
  return AGENT_NODE_COLORS[type] ?? '#909399'
}

function onDragStart(e: DragEvent, type: AgentNodeType) {
  e.dataTransfer?.setData('application/agent-node', JSON.stringify({ type }))
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
          v-for="item in AGENT_PALETTE_ITEMS.filter((i) => i.category === cat.key)"
          :key="item.type"
          :class="styles.item"
          :style="{ '--item-accent': itemColor(item.type) }"
          draggable="true"
          @dragstart="onDragStart($event, item.type)"
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
