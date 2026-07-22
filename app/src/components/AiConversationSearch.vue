<script setup lang="ts">
/**
 * AiConversationSearch — 对话列表搜索
 *
 * 标准 Element Plus 组件：el-input(prefix-icon) + el-popover 筛选
 */
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import { useAiStore } from '@/stores/ai'
import type { Conversation } from '@/types'
import type { SearchConversationsParams } from '@/api/aiApi'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

const emit = defineEmits<{
  select: [id: string]
}>()

const store = useAiStore()

const query = ref('')
const results = ref<Conversation[]>([])
const total = ref(0)
const searching = ref(false)
const panelVisible = ref(false)
const filtersExpanded = ref(false)
const startDate = ref('')
const endDate = ref('')
const sourceFilter = ref('')

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: 'editor', label: 'Editor' },
  { value: 'flow', label: 'Flow' },
  { value: 'standalone', label: 'AI' },
]

const hasActiveFilters = computed(() =>
  startDate.value !== '' || endDate.value !== '' || sourceFilter.value !== '',
)

let searchTimer: ReturnType<typeof setTimeout> | null = null

function debounceSearch(): void {
  if (searchTimer) clearTimeout(searchTimer)
  if (!query.value.trim() && !hasActiveFilters.value) {
    results.value = []
    total.value = 0
    panelVisible.value = false
    return
  }
  searching.value = true
  panelVisible.value = true
  searchTimer = setTimeout(async () => {
    try {
      const params: SearchConversationsParams = {}
      if (query.value.trim()) params.keyword = query.value.trim()
      if (startDate.value) params.startDate = startDate.value
      if (endDate.value) params.endDate = endDate.value
      if (sourceFilter.value) params.source = sourceFilter.value
      const data = await store.searchConversationsAction(params)
      results.value = data.conversations
      total.value = data.total
    } catch {
      results.value = []
      total.value = 0
    } finally {
      searching.value = false
    }
  }, 300)
}

watch(query, () => debounceSearch())
watch([startDate, endDate, sourceFilter], () => debounceSearch())

function handleSelect(id: string): void {
  emit('select', id)
  query.value = ''
  panelVisible.value = false
}

function handleClear(): void {
  query.value = ''
  startDate.value = ''
  endDate.value = ''
  sourceFilter.value = ''
  panelVisible.value = false
}

function formatTime(date: Date | string): string {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })
</script>

<template>
  <!-- 搜索输入框：标准 el-input，搜索图标在输入框内 -->
  <div :class="$style.searchRow">
    <el-input
      v-model="query"
      placeholder="搜索对话..."
      size="small"
      clearable
      @clear="handleClear"
    >
      <template #prefix>
        <AppIcon name="search" :size="14" />
      </template>
    </el-input>
    <el-popover
      :visible="filtersExpanded"
      placement="bottom-end"
      :width="220"
      trigger="click"
      :show-arrow="false"
      :offset="4"
    >
      <template #reference>
        <el-button
          size="small"
          :type="hasActiveFilters ? 'primary' : 'default'"
          :link="!hasActiveFilters"
          @click="filtersExpanded = !filtersExpanded"
        >
          <AppIcon name="filter" :size="14" />
        </el-button>
      </template>
      <div :class="$style.filterPanel">
        <div :class="$style.filterRow">
          <span :class="$style.filterLabel">来源</span>
          <el-select v-model="sourceFilter" size="small" placeholder="全部" style="flex: 1">
            <el-option v-for="opt in SOURCE_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
        <div :class="$style.filterRow">
          <span :class="$style.filterLabel">时间</span>
          <el-date-picker v-model="startDate" type="date" placeholder="开始" size="small" value-format="YYYY-MM-DD" style="flex: 1" />
          <span :class="$style.filterSep">~</span>
          <el-date-picker v-model="endDate" type="date" placeholder="结束" size="small" value-format="YYYY-MM-DD" style="flex: 1" />
        </div>
      </div>
    </el-popover>
  </div>

  <!-- 搜索结果 -->
  <div v-if="panelVisible" :class="$style.results">
    <div v-if="searching" :class="$style.empty">搜索中...</div>
    <template v-else-if="results.length > 0">
      <div :class="$style.resultCount">找到 {{ total }} 条结果</div>
      <div
        v-for="conv in results"
        :key="conv.id"
        :class="$style.resultItem"
        @click="handleSelect(conv.id)"
      >
        <span :class="$style.resultTitle">{{ conv.title }}</span>
        <el-tag :type="conv.source === 'editor' ? 'success' : conv.source === 'flow' ? 'primary' : 'warning'" size="small">
          {{ conv.source === 'editor' ? 'Editor' : conv.source === 'flow' ? 'Flow' : 'AI' }}
        </el-tag>
        <span :class="$style.resultTime">{{ formatTime(conv.updatedAt) }}</span>
      </div>
    </template>
    <div v-else :class="$style.empty">无匹配对话</div>
  </div>
</template>

<style module>
.searchRow {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.filterPanel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filterRow {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filterLabel {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  width: 32px;
}

.filterSep {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.results {
  max-height: 360px;
  overflow-y: auto;
  overflow-x: hidden;
}

.resultCount {
  padding: 6px 12px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.resultItem {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background 0.1s;
}

.resultItem:last-child { border-bottom: none; }
.resultItem:hover { background: var(--el-fill-color-light); }

.resultTitle {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.resultTime {
  font-size: 10px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.empty {
  text-align: center;
  padding: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
