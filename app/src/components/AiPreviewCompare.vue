<script setup lang="ts">
/**
 * 预览对比组件
 *
 * 并排显示修改前后的 Schema/Flow，高亮差异。
 * 业务逻辑在 usePreviewCompare composable。
 */

import { usePreviewCompare } from '@/composables/usePreviewCompare'
import type { Widget, FlowGraph } from '@/types'

export interface AiPreviewCompareProps {
  /** 修改前的内容 */
  before: Widget[] | FlowGraph | null
  /** 修改后的内容 */
  after: Widget[] | FlowGraph | null
  /** 内容类型 */
  type: 'schema' | 'flow'
  /** 修改前标签 */
  beforeLabel?: string
  /** 修改后标签 */
  afterLabel?: string
}

const props = withDefaults(defineProps<AiPreviewCompareProps>(), {
  beforeLabel: '修改前',
  afterLabel: '修改后',
})

const emit = defineEmits<{
  close: []
  'apply-selected': [ids: string[]]
}>()

const {
  schemaDiffs,
  flowDiffs,
  summary,
  hasDiffs,
  getStatusColor,
  getStatusLabel,
  getStatusBg,
  getApplyAllIds,
} = usePreviewCompare({
  before: props.before,
  after: props.after,
  type: props.type,
})

function handleApplyAll() {
  emit('apply-selected', getApplyAllIds())
}

function handleApplySelected() {
  // TODO: 支持勾选特定项
  emit('apply-selected', [])
}
</script>

<template>
  <div :class="$style.compare">
    <!-- Header -->
    <div :class="$style.header">
      <span :class="$style.title">版本对比</span>
      <div :class="$style.labels">
        <span :class="$style.label">{{ beforeLabel }}</span>
        <span :class="$style.labelSeparator">→</span>
        <span :class="$style.label">{{ afterLabel }}</span>
      </div>
      <div :class="$style.summary" data-testid="summary">
        <span :class="$style.summaryItem">
          <span :class="$style.dot" :style="{ background: 'var(--ai-color-success, #26A036)' }" />
          新增 {{ summary.added }}
        </span>
        <span :class="$style.summaryItem">
          <span :class="$style.dot" :style="{ background: 'var(--ai-color-danger, #E50113)' }" />
          删除 {{ summary.removed }}
        </span>
        <span :class="$style.summaryItem">
          <span :class="$style.dot" :style="{ background: 'var(--ai-color-warning, #E6A23C)' }" />
          修改 {{ summary.changed }}
        </span>
      </div>
      <el-button :class="$style.closeBtn" link @click="emit('close')">
        &times;
      </el-button>
    </div>

    <!-- Diff 列表 -->
    <div :class="$style.body">
      <div v-if="!hasDiffs" :class="$style.noDiff" data-testid="no-diff">
        <span>两个版本完全相同</span>
      </div>

      <div v-else :class="$style.diffList">
        <!-- Schema Diffs -->
        <template v-if="type === 'schema'">
          <div
            v-for="diff in schemaDiffs"
            :key="diff.id"
            :class="[$style.diffItem, $style[`status-${diff.status}`]]"
            :style="{ background: getStatusBg(diff.status) }"
          >
            <div :class="$style.diffHeader">
              <span :class="$style.diffBadge" :style="{ background: getStatusColor(diff.status) }">
                {{ getStatusLabel(diff.status) }}
              </span>
              <span :class="$style.diffLabel">{{ diff.label }}</span>
              <span :class="$style.diffType">{{ diff.type }}</span>
            </div>

            <!-- 变更详情 -->
            <div v-if="diff.changedFields && diff.changedFields.length > 0" :class="$style.changes">
              <span v-for="field in diff.changedFields" :key="field" :class="$style.changeTag">
                {{ field }}
              </span>
            </div>
          </div>
        </template>

        <!-- Flow Diffs -->
        <template v-if="type === 'flow'">
          <div
            v-for="diff in flowDiffs"
            :key="diff.id"
            :class="[$style.diffItem, $style[`status-${diff.status}`]]"
            :style="{ background: getStatusBg(diff.status) }"
          >
            <div :class="$style.diffHeader">
              <span :class="$style.diffBadge" :style="{ background: getStatusColor(diff.status) }">
                {{ getStatusLabel(diff.status) }}
              </span>
              <span :class="$style.diffLabel">{{ diff.label }}</span>
              <span :class="$style.diffType">{{ diff.type === 'node' ? '节点' : '连线' }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Actions -->
    <div v-if="hasDiffs" :class="$style.actions">
      <el-button :class="$style.btnPrimary" type="primary" @click="handleApplyAll">
        应用全部变更
      </el-button>
      <el-button :class="$style.btnGhost" @click="handleApplySelected">
        部分应用
      </el-button>
    </div>
  </div>
</template>

<style module>
.compare {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--ai-bg-white, #FFFFFF);
  border: 1px solid var(--ai-border-base, #D5DDE3);
  border-radius: var(--ai-radius-md, 4px);
  overflow: hidden;
}

.header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--ai-border-base, #D5DDE3);
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--ai-bg-gray-light, #FAFAFA);
}

.title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ai-text-primary, #333333);
}

.labels {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ai-text-secondary, #666666);
}

.labelSeparator {
  color: var(--ai-text-disabled, #C0C4CC);
}

.summary {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.summaryItem {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--ai-text-secondary, #666666);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.closeBtn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  color: var(--ai-text-secondary, #666666);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ai-radius-sm, 2px);
  margin-left: auto;
}

.closeBtn:hover {
  background: var(--ai-bg-gray, #F5F7FA);
}

.body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.body::-webkit-scrollbar {
  width: 3px;
}

.body::-webkit-scrollbar-thumb {
  background: var(--ai-border-base, #D5DDE3);
  border-radius: 2px;
}

.noDiff {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--ai-text-disabled, #C0C4CC);
  font-size: 13px;
}

.diffList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.diffItem {
  padding: 10px 12px;
  border: 1px solid var(--ai-border-base, #D5DDE3);
  border-radius: var(--ai-radius-md, 4px);
  transition: all 0.2s ease;
}

.diffItem:hover {
  border-color: var(--ai-color-primary, #0060A2);
}

.diffHeader {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diffBadge {
  padding: 2px 6px;
  border-radius: var(--ai-radius-sm, 2px);
  font-size: 10px;
  font-weight: 500;
  color: var(--ai-text-inverse, #FFFFFF);
}

.diffLabel {
  font-size: 12px;
  font-weight: 500;
  color: var(--ai-text-primary, #333333);
}

.diffType {
  font-size: 10px;
  color: var(--ai-text-hint, #999999);
  margin-left: auto;
}

.changes {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.changeTag {
  padding: 2px 6px;
  background: var(--ai-bg-gray, #F5F7FA);
  border-radius: var(--ai-radius-sm, 2px);
  font-size: 10px;
  color: var(--ai-text-secondary, #666666);
  font-family: Consolas, Monaco, monospace;
}

.status-added {
  border-color: var(--ai-color-success, #26A036);
}

.status-removed {
  border-color: var(--ai-color-danger, #E50113);
  opacity: 0.8;
}

.status-changed {
  border-color: var(--ai-color-warning, #E6A23C);
}

.actions {
  padding: 12px 16px;
  border-top: 1px solid var(--ai-border-base, #D5DDE3);
  display: flex;
  gap: 8px;
}

.actions button {
  flex: 1;
  text-align: center;
  padding: 8px;
}

.btnPrimary {
  border-radius: var(--ai-radius-sm, 2px);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: var(--ai-color-primary, #0060A2);
  color: var(--ai-text-inverse, #FFFFFF);
  font-family: inherit;
}

.btnPrimary:hover {
  background: var(--ai-color-primary-hover, #035B9C);
}

.btnGhost {
  border-radius: var(--ai-radius-sm, 2px);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: var(--ai-text-secondary, #666666);
  border: 1px solid var(--ai-border-light, #EBEDF3);
  font-family: inherit;
}

.btnGhost:hover {
  border-color: var(--ai-color-primary, #0060A2);
  color: var(--ai-color-primary, #0060A2);
}
</style>
