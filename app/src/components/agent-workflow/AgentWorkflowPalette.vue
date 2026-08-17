<script setup lang="ts">
import { computed, onMounted, ref, reactive } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { AGENT_PALETTE_ITEMS, AGENT_NODE_COLORS } from '@/plugins'
import { usePluginRegistry } from '@/composables/usePluginRegistry'
import type { AgentNodeType } from '@/types/agentWorkflow'
import type { AgentPaletteItem } from '@/plugins'
import styles from './AgentWorkflowPalette.module.scss'

const { expertPaletteItems, toolPaletteItems, load, expertColor } = usePluginRegistry()

onMounted(() => {
  void load()
})

const searchQuery = ref('')

function matchesQuery(item: AgentPaletteItem): boolean {
  if (!searchQuery.value.trim()) return true
  const q = searchQuery.value.trim().toLowerCase()
  return item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
}

/** 搜索时扁平展示所有匹配项；非搜索时按分类展示 */
const isSearching = computed(() => searchQuery.value.trim().length > 0)

const flatResults = computed<AgentPaletteItem[]>(() => {
  if (!isSearching.value) return []
  const all = [
    ...AGENT_PALETTE_ITEMS,
    ...expertPaletteItems.value,
    ...toolPaletteItems.value,
  ]
  return all.filter(matchesQuery)
})

const categories = [
  { key: 'trigger', label: '触发器', icon: 'video-play' },
  { key: 'ai', label: 'AI', icon: 'cpu' },
  { key: 'experts', label: '专家 Agent', icon: 'user' },
  { key: 'tools', label: 'MCP 工具', icon: 'setting' },
  { key: 'logic', label: '逻辑', icon: 'share' },
  { key: 'action', label: '动作', icon: 'circle-check' },
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
    return toolPaletteItems.value
  }
  return staticByCategory.value.get(key) ?? []
}

/** 可折叠分类状态（默认展开） */
const collapsed = reactive<Record<string, boolean>>({})

function toggleCollapse(key: string) {
  collapsed[key] = !collapsed[key]
}

function isCollapsed(key: string): boolean {
  return !!collapsed[key]
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
    <div :class="styles.stickyHeader">
      <div :class="styles.title">节点</div>
      <div :class="styles.searchBox">
        <el-input
          v-model="searchQuery"
          placeholder="搜索节点…"
          clearable
          size="small"
        >
          <template #prefix>
            <AppIcon name="search" :size="14" />
          </template>
        </el-input>
      </div>
    </div>

    <template v-if="isSearching">
      <div :class="styles.section">
        <div :class="styles.sectionTitle">搜索结果（{{ flatResults.length }}）</div>
        <div v-if="flatResults.length === 0" :class="styles.empty">无匹配节点</div>
        <div :class="styles.items">
          <div
            v-for="item in flatResults"
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
    </template>

    <template v-else>
      <div v-for="cat in categories" :key="cat.key" :class="styles.section">
        <div
          :class="styles.sectionTitle"
          @click="toggleCollapse(cat.key)"
          :style="{ cursor: 'pointer' }"
        >
          <span :class="styles.sectionLabel">
            <span :class="styles.sectionCount">{{ itemsForCategory(cat.key).length }}</span>
            {{ cat.label }}
          </span>
          <AppIcon
            :name="isCollapsed(cat.key) ? 'caret-bottom' : 'caret-top'"
            :size="12"
            :class="styles.collapseIcon"
          />
        </div>
        <div v-show="!isCollapsed(cat.key)" :class="styles.items">
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
    </template>
  </div>
</template>
