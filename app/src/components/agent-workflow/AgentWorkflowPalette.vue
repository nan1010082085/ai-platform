<script setup lang="ts">
import { computed, onMounted, ref, reactive } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import {
  AGENT_NODE_COLORS,
  getPluginHost,
  serviceState,
  type AgentPaletteItem,
} from '@/plugins'
import { usePluginRegistry } from '@/composables/usePluginRegistry'
import type { AgentNodeType } from '@/types/agentWorkflow'
import styles from './AgentWorkflowPalette.module.scss'

const { load, expertColor } = usePluginRegistry()

const host = getPluginHost()
const paletteItems = serviceState(host, 'nodeTypes/changed', () => host.nodeTypes.list())

const searchQuery = ref('')

/** 可折叠分类：默认仅展开触发器/智能/逻辑 */
const collapsed = reactive<Record<string, boolean>>({
  experts: true,
  tools: true,
  action: true,
})

const RECENT_KEY = 'ai.workflow.palette.recent'
const recentIds = ref<string[]>([])

onMounted(() => {
  void load()
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (raw) recentIds.value = JSON.parse(raw) as string[]
  } catch {
    recentIds.value = []
  }
})

/**
 * 记录最近拖入的节点类型
 * @param type 节点类型
 */
function pushRecent(type: string) {
  const next = [type, ...recentIds.value.filter((t) => t !== type)].slice(0, 8)
  recentIds.value = next
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
}

const recentItems = computed(() => {
  const byType = new Map(paletteItems.value.map((i) => [i.type, i]))
  return recentIds.value
    .map((t) => byType.get(t as AgentNodeType))
    .filter(Boolean) as AgentPaletteItem[]
})

function matchesQuery(item: AgentPaletteItem): boolean {
  if (!searchQuery.value.trim()) return true
  const q = searchQuery.value.trim().toLowerCase()
  return item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
}

/** 搜索时扁平展示所有匹配项；非搜索时按分类展示 */
const isSearching = computed(() => searchQuery.value.trim().length > 0)

const flatResults = computed<AgentPaletteItem[]>(() => {
  if (!isSearching.value) return []
  return paletteItems.value.filter(matchesQuery)
})

const categories = [
  { key: 'trigger', label: '触发器', icon: 'video-play' },
  { key: 'ai', label: '智能', icon: 'cpu' },
  { key: 'experts', label: '专家', icon: 'user' },
  { key: 'tools', label: '工具', icon: 'setting' },
  { key: 'logic', label: '逻辑', icon: 'share' },
  { key: 'action', label: '动作', icon: 'circle-check' },
] as const

function itemsForCategory(key: string): AgentPaletteItem[] {
  return paletteItems.value.filter((item) => item.category === key)
}

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
  pushRecent(item.type)
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
      <div v-if="recentItems.length" :class="styles.section">
        <div :class="styles.sectionTitle">
          <span :class="styles.sectionLabel">最近</span>
        </div>
        <div :class="styles.items">
          <div
            v-for="item in recentItems"
            :key="`recent-${item.type}-${item.label}`"
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
