<template>
  <div :class="$style.container">
    <div :class="$style.header">
      <h3 :class="$style.title">语义搜索测试</h3>
      <p :class="$style.desc">用自然语言验证召回质量，观察相关分与字段命中</p>
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

    <div :class="$style.quickQueries">
      <button
        v-for="item in quickQueries"
        :key="item"
        type="button"
        :class="$style.chip"
        @click="applyQuickQuery(item)"
      >
        {{ item }}
      </button>
    </div>

    <div :class="$style.body">
      <div v-if="!performed" :class="$style.hint">
        <AppIcon name="search" :size="28" />
        <strong>先试一个快捷查询</strong>
        <span>返回的相关分越高，越适合作为对话上下文候选</span>
      </div>

      <div v-else-if="loading" :class="$style.hint">搜索中...</div>

      <div v-else-if="results.length === 0" :class="$style.empty">
        <AppIcon name="warning" :size="24" />
        <span>未找到匹配结果，可尝试更具体的业务词或先重建索引</span>
      </div>

      <div v-else :class="$style.resultList">
        <div :class="$style.resultSummary">共 {{ results.length }} 条召回</div>
        <div v-for="item in results" :key="item.id" :class="$style.resultItem">
          <div :class="$style.scoreBlock">
            <div :class="[$style.resultScore, $style[getScoreClass(item.score)]]">
              {{ Math.round(item.score) }}
            </div>
            <div :class="$style.scoreBar">
              <div
                :class="$style.scoreFill"
                :style="{ width: `${Math.min(100, Math.max(4, item.score))}%` }"
              />
            </div>
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
              <span
                v-for="field in item.fieldNames.slice(0, 3)"
                :key="field"
                :class="$style.fieldChip"
              >
                {{ field }}
              </span>
              <span v-if="item.widgetTypes.length" :class="$style.resultWidgets">
                {{ item.widgetTypes.slice(0, 3).join(' · ') }}
                {{ item.widgetTypes.length > 3 ? ` +${item.widgetTypes.length - 3}` : '' }}
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

const quickQueries = ['用户注册', '请假审批', '设备台账', '表单权限', '流程节点']

function applyQuickQuery(value: string): void {
  emit('update:query', value)
  emit('search')
}

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
  border-radius: 12px;
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
  margin-bottom: 10px;
}

.searchInput {
  flex: 1;
}

.quickQueries {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.chip {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
  cursor: pointer;
}

.chip:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
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
  min-height: 140px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
  padding: 12px;
}

.hint strong {
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.resultList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resultSummary {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 2px;
}

.resultItem {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 10px;
}

.scoreBlock {
  width: 48px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.resultScore {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.scoreBar {
  width: 100%;
  height: 3px;
  border-radius: 999px;
  background: var(--el-fill-color);
  overflow: hidden;
}

.scoreFill {
  height: 100%;
  background: currentColor;
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
  gap: 6px;
  flex-wrap: wrap;
}

.fieldChip {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  border: 1px solid var(--el-border-color-extra-light);
}

.resultWidgets {
  font-size: 12px;
  color: var(--el-text-color-regular);
}
</style>
