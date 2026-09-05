<script setup lang="ts">
import { PageShell, PageHeader } from '@apform-ui/core'
/**
 * 平台资产知识库 — 按任务流：覆盖与待办首屏，召回试跑 / 文档 / 运维次级
 */

import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message, confirmDanger } from '@schema-platform/platform-shared/utils/message'
import { useDataLoading } from '@schema-platform/platform-shared/utils/useDataLoading'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import {
  getRagStatus,
  reindexAllRag,
  reindexSingleRag,
  deleteRagEmbedding,
  searchRag,
} from '@/api/aiApi'
import type { RagStatusData, RagReindexResult, RagPendingItem, RagStaleItem } from '@/api/aiApi'
import type { RagSearchResult } from '@/types'
import RagSummary from '@/components/rag/RagSummary.vue'
import RagSearchPanel from '@/components/rag/RagSearchPanel.vue'
import RagUploadDialog from '@/components/rag/RagUploadDialog.vue'
import RagIndexOverview from '@/components/rag/RagIndexOverview.vue'
import AppPagination from '@schema-platform/platform-shared/components/common/AppPagination.vue'
import { useClientPagination } from '@schema-platform/platform-shared/utils/useClientPagination'

const router = useRouter()

const { loading, withLoading: withStatusLoading } = useDataLoading({ timeout: 15000 })
const { loading: reindexing, withLoading: withReindexLoading } = useDataLoading({ timeout: 600_000 })

const status = ref<RagStatusData | null>(null)
const lastReindexResult = ref<RagReindexResult | null>(null)

const bulkMode = ref(false)
/** 选中键：`${entityKind}:${id}` */
const selectedKeys = ref<Set<string>>(new Set())
const bulkProcessing = ref(false)

const searchQuery = ref('')
const searchLoading = ref(false)
const searchResults = ref<RagSearchResult[]>([])
const searchPerformed = ref(false)

const uploadDialogVisible = ref(false)
/** 次级面板：召回试跑 / 运维默认折叠 */
const secondaryPanels = ref<string[]>([])

/**
 * 待补齐行：过期优先，再表单未索引，再流程未索引
 */
interface PendingRow {
  key: string
  id: string
  name: string
  type: string
  entityKind: 'schema' | 'flow'
  reason: 'unindexed' | 'stale'
}

const healthPercent = computed(() => {
  if (!status.value) return 0
  const total = (status.value.totalSchemas ?? 0) + (status.value.totalFlows ?? 0)
  const indexed = (status.value.indexed ?? 0) + (status.value.indexedFlows ?? 0)
  if (total === 0) return 0
  return Math.round((indexed / total) * 100)
})

/**
 * @param item - 待索引或过期项
 * @param reason - 原因
 */
function toPendingRow(
  item: RagPendingItem | RagStaleItem,
  reason: 'unindexed' | 'stale',
): PendingRow {
  const entityKind = item.entityKind ?? (item.type === 'flow' ? 'flow' : 'schema')
  return {
    key: `${entityKind}:${item.id}`,
    id: item.id,
    name: item.name,
    type: item.type,
    entityKind,
    reason,
  }
}

const pendingRows = computed(() => {
  const s = status.value
  if (!s) return [] as PendingRow[]

  const rows: PendingRow[] = []
  const seen = new Set<string>()

  for (const item of s.staleItems ?? []) {
    const row = toPendingRow(item, 'stale')
    if (seen.has(row.key)) continue
    seen.add(row.key)
    rows.push(row)
  }
  for (const item of s.unindexedSchemas ?? []) {
    const row = toPendingRow({ ...item, entityKind: item.entityKind ?? 'schema' }, 'unindexed')
    if (seen.has(row.key)) continue
    seen.add(row.key)
    rows.push(row)
  }
  for (const item of s.unindexedFlowsList ?? []) {
    const row = toPendingRow({ ...item, entityKind: 'flow', type: item.type || 'flow' }, 'unindexed')
    if (seen.has(row.key)) continue
    seen.add(row.key)
    rows.push(row)
  }
  return rows
})

const {
  currentPage: indexPage,
  pageSize: indexPageSize,
  pagedItems: paginatedPending,
} = useClientPagination(pendingRows)

watch(indexPage, () => {
  selectedKeys.value.clear()
})

watch(indexPageSize, () => {
  selectedKeys.value.clear()
})

function toggleBulkMode(): void {
  bulkMode.value = !bulkMode.value
  selectedKeys.value.clear()
}

/**
 * @param key - `${entityKind}:${id}`
 */
function toggleSelect(key: string): void {
  const next = new Set(selectedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selectedKeys.value = next
}

/**
 * @param key - 选中键
 */
function parseSelectedKey(key: string): { id: string; entityKind: 'schema' | 'flow' } {
  const sep = key.indexOf(':')
  const entityKind = key.slice(0, sep) as 'schema' | 'flow'
  const id = key.slice(sep + 1)
  return { id, entityKind }
}

async function handleBulkReindex(): Promise<void> {
  if (selectedKeys.value.size === 0) return
  bulkProcessing.value = true
  let success = 0
  let fail = 0
  for (const key of selectedKeys.value) {
    const { id, entityKind } = parseSelectedKey(key)
    try {
      await reindexSingleRag(id, entityKind)
      success++
    } catch {
      fail++
    }
  }
  bulkProcessing.value = false
  if (fail === 0) message.success(`批量索引完成: ${success} 个`)
  else message.warning(`索引 ${success} 个成功，${fail} 个失败`)
  selectedKeys.value.clear()
  bulkMode.value = false
  await loadStatus()
}

async function handleBulkDeleteEmbedding(): Promise<void> {
  if (selectedKeys.value.size === 0) return
  try {
    await confirmDanger('批量删除', `确认删除选中的 ${selectedKeys.value.size} 个索引？`)
  } catch {
    return
  }

  bulkProcessing.value = true
  let success = 0
  let fail = 0
  for (const key of selectedKeys.value) {
    const { id, entityKind } = parseSelectedKey(key)
    try {
      await deleteRagEmbedding(id, entityKind)
      success++
    } catch {
      fail++
    }
  }
  bulkProcessing.value = false
  if (fail === 0) message.success(`已删除 ${success} 个索引`)
  else message.warning(`删除 ${success} 个成功，${fail} 个失败`)
  selectedKeys.value.clear()
  bulkMode.value = false
  await loadStatus()
}

function openUploadDialog(): void {
  uploadDialogVisible.value = true
}

async function loadStatus(): Promise<void> {
  await withStatusLoading(async () => {
    status.value = await getRagStatus()
  })
}

async function handleReindexAll(): Promise<void> {
  await withReindexLoading(async () => {
    lastReindexResult.value = await reindexAllRag()
    message.success('批量重建索引完成')
    await loadStatus()
  })
}

/**
 * @param id - 资产 ID
 * @param entityKind - schema | flow
 */
async function handleReindexSingle(
  id: string,
  entityKind: 'schema' | 'flow' = 'schema',
): Promise<void> {
  try {
    await reindexSingleRag(id, entityKind)
    message.success(entityKind === 'flow' ? '流程索引已同步' : '表单索引已同步')
    await loadStatus()
  } catch {
    message.error('索引同步失败')
  }
}

async function handleSearch(): Promise<void> {
  const query = searchQuery.value.trim()
  if (!query) return

  searchLoading.value = true
  searchPerformed.value = true
  try {
    const result = await searchRag({ query, limit: 10 })
    searchResults.value = result.schemas
  } catch {
    message.error('搜索失败')
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

/**
 * @param type - 资产类型码
 */
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    form: '表单',
    search_list: '查询列表',
    flow: '流程',
  }
  return labels[type] ?? type
}

/**
 * @param reason - 待办原因
 */
function getReasonLabel(reason: PendingRow['reason']): string {
  return reason === 'stale' ? '过期' : '未索引'
}

onMounted(() => {
  loadStatus()
})
</script>

<template>
  <PageShell>
    <div :class="$style.page" v-loading="loading">
    <PageHeader
      title="知识库"
      subtitle="管好表单与流程资产索引：看覆盖、补待办、再试召回"
    >
      <template #actions>
        <el-button size="small" :loading="loading" @click="loadStatus">
          <AppIcon name="refresh" :size="14" />
          刷新
        </el-button>
        <el-tooltip
          v-if="status"
          :content="status.embeddingConfigured
            ? '嵌入模型已就绪'
            : '嵌入模型未配置，点击前往设置'"
          placement="bottom"
        >
          <button
            type="button"
            :class="[
              $style.embeddingStatus,
              status.embeddingConfigured ? $style.embeddingReady : $style.embeddingMissing,
            ]"
            :aria-label="status.embeddingConfigured ? '嵌入已就绪' : '去配置嵌入模型'"
            @click="router.push('/settings/embedding')"
          >
            <AppIcon
              :name="status.embeddingConfigured ? 'circle-check-filled' : 'warning'"
              :size="18"
            />
          </button>
        </el-tooltip>
        <el-dropdown trigger="click">
          <el-button size="small">
            更多
            <AppIcon name="arrow-down" :size="12" style="margin-left: 4px" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="openUploadDialog">上传文档（辅线）</el-dropdown-item>
              <el-dropdown-item @click="router.push('/debug/rag')">检索调试</el-dropdown-item>
              <el-dropdown-item
                :disabled="reindexing"
                divided
                @click="handleReindexAll"
              >
                {{ reindexing ? '全量重建中…' : '全量重建索引' }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
    </PageHeader>

    <div
      v-if="status && !status.embeddingConfigured"
      :class="$style.banner"
    >
      <AppIcon name="warning" :size="16" />
      <span>
        嵌入模型未配置，知识库只做关键词兜底。前往
        <router-link to="/settings/embedding">嵌入模型设置</router-link>
        后，可启用向量索引与语义召回。
      </span>
    </div>

    <RagSummary
      :status="status"
      :health-percent="healthPercent"
      :class="$style.summaryRow"
    />

    <div :class="$style.section" data-testid="pending-section">
      <div :class="$style.sectionHeader">
        <h3 :class="$style.sectionTitle">
          待补齐资产
          <span v-if="status" :class="$style.sectionCount">
            （未索引表单 {{ status.unindexed }} · 未索引流程 {{ status.unindexedFlows ?? 0 }} · 过期 {{ status.stale }}）
          </span>
        </h3>
        <div :class="$style.sectionActions">
          <el-button size="small" :type="bulkMode ? 'danger' : 'default'" @click="toggleBulkMode">
            {{ bulkMode ? '取消' : '批量操作' }}
          </el-button>
          <template v-if="bulkMode">
            <el-button
              size="small"
              type="primary"
              :disabled="selectedKeys.size === 0"
              :loading="bulkProcessing"
              @click="handleBulkReindex"
            >
              批量同步 ({{ selectedKeys.size }})
            </el-button>
            <el-button
              size="small"
              type="danger"
              :disabled="selectedKeys.size === 0"
              :loading="bulkProcessing"
              @click="handleBulkDeleteEmbedding"
            >
              批量删除 ({{ selectedKeys.size }})
            </el-button>
          </template>
        </div>
      </div>

      <el-table
        :data="paginatedPending"
        :class="$style.table"
        stripe
        size="small"
        empty-text="暂无待补齐资产，覆盖良好"
      >
        <el-table-column v-if="bulkMode" label="" width="48">
          <template #default="{ row }">
            <el-checkbox
              :model-value="selectedKeys.has(row.key)"
              @change="toggleSelect(row.key)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="类型" min-width="88">
          <template #default="{ row }">
            <el-tag
              size="small"
              :type="row.entityKind === 'flow' ? 'success' : row.type === 'form' ? 'primary' : 'info'"
            >
              {{ getTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="原因" min-width="88">
          <template #default="{ row }">
            <el-tag size="small" :type="row.reason === 'stale' ? 'warning' : 'info'" effect="plain">
              {{ getReasonLabel(row.reason) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="120">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click="handleReindexSingle(row.id, row.entityKind)"
            >
              {{ row.reason === 'stale' ? '重建索引' : '建立索引' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <AppPagination
        v-model:current-page="indexPage"
        v-model:page-size="indexPageSize"
        :total="pendingRows.length"
      />
    </div>

    <el-collapse v-model="secondaryPanels" :class="$style.collapse">
      <el-collapse-item name="search" title="召回试跑（验证能不能用）">
        <div :class="$style.collapseBody">
          <RagSearchPanel
            v-model:query="searchQuery"
            :loading="searchLoading"
            :performed="searchPerformed"
            :results="searchResults"
            @search="handleSearch"
            @reindex="handleReindexSingle"
          />
        </div>
      </el-collapse-item>
      <el-collapse-item name="ops" title="索引动态与运维">
        <div :class="$style.collapseBody">
          <RagIndexOverview
            :status="status"
            :last-reindex-result="lastReindexResult"
          />
          <div :class="$style.opsBar">
            <el-button type="primary" size="small" :loading="reindexing" @click="handleReindexAll">
              <AppIcon name="refresh" :size="14" />
              {{ reindexing ? '重建中…' : '全量重建索引' }}
            </el-button>
            <span :class="$style.opsHint">全量重建耗时较长，请在低峰操作；日常优先用上方「建立索引」。</span>
          </div>
        </div>
      </el-collapse-item>
      <el-collapse-item name="docs" title="文档辅线（上传）">
        <div :class="$style.collapseBody">
          <p :class="$style.docsHint">
            文档切片为辅，不替代表单 / 流程资产知识。需要时再上传。
          </p>
          <el-button type="success" size="small" @click="openUploadDialog">
            <AppIcon name="upload" :size="14" />
            上传文档
          </el-button>
        </div>
      </el-collapse-item>
    </el-collapse>

    <RagUploadDialog
      v-model:visible="uploadDialogVisible"
      @uploaded="loadStatus"
    />
  </div>
</PageShell>
</template>

<style module>
.page {
  min-height: 100%;
  background: var(--el-bg-color-page, #f5f7fa);
}

.embeddingStatus {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.embeddingStatus:hover {
  background: var(--el-fill-color-light);
}

.embeddingReady {
  color: var(--el-color-success);
}

.embeddingMissing {
  color: var(--el-color-danger);
}

.banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: var(--ai-card-gap);
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning-dark-2);
  font-size: 13px;
  line-height: 1.5;
}

.summaryRow {
  margin-bottom: var(--ai-card-gap);
}

.section {
  background: var(--el-bg-color, #fff);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  margin-bottom: var(--ai-card-gap);
}

.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.sectionTitle {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  margin: 0;
}

.sectionCount {
  font-weight: 400;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}

.sectionActions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.table {
  width: 100%;
}

.collapse {
  background: var(--el-bg-color, #fff);
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  padding: 0 12px;
}

.collapseBody {
  padding: 4px 0 12px;
  min-height: 200px;
}

.opsBar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.opsHint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.docsHint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
</style>
