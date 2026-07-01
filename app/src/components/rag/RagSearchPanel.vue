<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">语义搜索测试</h3>
      <p :class="$style.desc">输入自然语言描述，测试 RAG 语义搜索效果</p>
    </div>

    <div :class="$style.searchBox">
      <el-input
        :model-value="query"
        :class="$style.searchInput"
        placeholder="例如：用户注册表单、请假审批流程..."
        clearable
        @update:model-value="emit('update:query', $event)"
        @keyup.enter="emit('search')"
      >
        <template #prefix>
          <AppIcon name="search" :size="16" />
        </template>
      </el-input>
      <el-button type="primary" :loading="loading" @click="emit('search')">
        搜索
      </el-button>
    </div>

    <div :class="$style.body">
      <div v-if="!performed" :class="$style.hint">
        输入查询词后点击搜索，查看语义匹配结果
      </div>

      <div v-else-if="loading" :class="$style.hint">搜索中...</div>

      <div v-else-if="results.length === 0" :class="$style.empty">
        <AppIcon name="search" :size="24" />
        <span>未找到匹配的 Schema</span>
      </div>

      <div v-else :class="$style.resultList">
        <div v-for="item in results" :key="item.id" :class="$style.resultItem">
          <div :class="[$style.resultScore, $style[getScoreClass(item.score)]]">
            {{ item.score }}
          </div>
          <div :class="$style.resultContent">
            <div :class="$style.resultName">{{ item.name }}</div>
            <div v-if="item.description" :class="$style.resultDesc">
              {{ item.description }}
            </div>
            <div :class="$style.resultMeta">
              <el-tag size="small" :type="item.type === 'form' ? 'primary' : 'success'">
                {{ getSchemaTypeLabel(item.type) }}
              </el-tag>
              <span :class="$style.resultWidgets">
                {{ item.widgetTypes.slice(0, 3).join(', ') }}
                {{ item.widgetTypes.length > 3 ? `+${item.widgetTypes.length - 3}` : '' }}
              </span>
            </div>
          </div>
          <el-button type="primary" link size="small" @click="emit('reindex', item.id)">
            重建索引
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { RagSearchResult } from '@/types'

defineProps<{
  query: string
  loading: boolean
  performed: boolean
  results: RagSearchResult[]
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  search: []
  reindex: [schemaId: string]
}>()

function getScoreClass(score: number): string {
  if (score >= 70) return 'scoreHigh'
  if (score >= 40) return 'scoreMedium'
  return 'scoreLow'
}

function getSchemaTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    form: '表单',
    search_list: '查询列表',
  }
  return labels[type] ?? type
}
</script>

<style module>
.container {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.header {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 4px;
}

.desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.searchBox {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  margin-bottom: 12px;
}

.searchInput {
  flex: 1;
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.hint,
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 120px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.resultList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resultItem {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.resultScore {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.scoreHigh {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.scoreMedium {
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}

.scoreLow {
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
}

.resultContent {
  flex: 1;
  min-width: 0;
}

.resultName {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.resultDesc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.resultMeta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.resultWidgets {
  font-size: 12px;
  color: var(--el-text-color-regular);
}
</style>
