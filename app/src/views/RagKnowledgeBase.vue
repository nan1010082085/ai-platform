<script setup lang="ts">
/**
 * RAG 知识库管理页面
 *
 * 布局对齐 Agent 性能监控：dashboard 顶栏 + 摘要卡片 + 双列面板 + 全宽表格
 */

import { ref, onMounted, computed } from 'vue'
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
  uploadRagDocument,
} from '@/api/aiApi'
import type { RagStatusData, RagReindexResult } from '@/api/aiApi'
import type { RagSearchResult } from '@/types'
import RagSummary from '@/components/rag/RagSummary.vue'
import RagSearchPanel from '@/components/rag/RagSearchPanel.vue'
import RagIndexOverview from '@/components/rag/RagIndexOverview.vue'

const INDEX_PAGE_SIZE = 20
const router = useRouter()

const { loading, withLoading: withStatusLoading } = useDataLoading({ timeout: 15000 })
const { loading: reindexing, withLoading: withReindexLoading } = useDataLoading({ timeout: 600_000 })

const status = ref<RagStatusData | null>(null)
const lastReindexResult = ref<RagReindexResult | null>(null)

const bulkMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const bulkProcessing = ref(false)

const searchQuery = ref('')
const searchLoading = ref(false)
const searchResults = ref<RagSearchResult[]>([])
const searchPerformed = ref(false)

const indexPage = ref(1)

const uploadDialogVisible = ref(false)
const uploadFileList = ref<File[]>([])
const uploadLoading = ref(false)

const healthPercent = computed(() => {
  if (!status.value) return 0
  const total = (status.value.totalSchemas ?? 0) + (status.value.totalFlows ?? 0)
  const indexed = (status.value.indexed ?? 0) + (status.value.indexedFlows ?? 0)
  if (total === 0) return 0
  return Math.round((indexed / total) * 100)
})

const unindexedSchemas = computed(() => status.value?.unindexedSchemas ?? [])

const paginatedUnindexed = computed(() => {
  const start = (indexPage.value - 1) * INDEX_PAGE_SIZE
  return unindexedSchemas.value.slice(start, start + INDEX_PAGE_SIZE)
})

function handleIndexPageChange(page: number): void {
  indexPage.value = page
  selectedIds.value.clear()
}

function toggleBulkMode(): void {
  bulkMode.value = !bulkMode.value
  selectedIds.value.clear()
}

function toggleSelect(id: string): void {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

async function handleBulkReindex(): Promise<void> {
  if (selectedIds.value.size === 0) return
  bulkProcessing.value = true
  let success = 0
  let fail = 0
  for (const id of selectedIds.value) {
    try {
      await reindexSingleRag(id)
      success++
    } catch {
      fail++
    }
  }
  bulkProcessing.value = false
  if (fail === 0) message.success(`批量索引完成: ${success} 个`)
  else message.warning(`索引 ${success} 个成功，${fail} 个失败`)
  selectedIds.value.clear()
  bulkMode.value = false
  await loadStatus()
}

async function handleBulkDeleteEmbedding(): Promise<void> {
  if (selectedIds.value.size === 0) return
  try {
    await confirmDanger('批量删除', `确认删除选中的 ${selectedIds.value.size} 个索引？`)
  } catch {
    return
  }

  bulkProcessing.value = true
  let success = 0
  let fail = 0
  for (const id of selectedIds.value) {
    try {
      await deleteRagEmbedding(id)
      success++
    } catch {
      fail++
    }
  }
  bulkProcessing.value = false
  if (fail === 0) message.success(`已删除 ${success} 个索引`)
  else message.warning(`删除 ${success} 个成功，${fail} 个失败`)
  selectedIds.value.clear()
  bulkMode.value = false
  await loadStatus()
}

function openUploadDialog(): void {
  uploadFileList.value = []
  uploadDialogVisible.value = true
}

function handleUploadChange(file: { raw: File }): void {
  uploadFileList.value = [file.raw]
}

async function handleUploadSubmit(): Promise<void> {
  if (uploadFileList.value.length === 0) return
  uploadLoading.value = true
  try {
    const result = await uploadRagDocument(uploadFileList.value[0])
    message.success(`文档 "${result.filename}" 上传并索引成功`)
    uploadDialogVisible.value = false
    uploadFileList.value = []
    await loadStatus()
  } catch (err) {
    message.error(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploadLoading.value = false
  }
}

async function loadStatus(): Promise<void> {
  await withStatusLoading(async () => {
    status.value = await getRagStatus()
    const maxPage = Math.max(1, Math.ceil((status.value?.unindexedSchemas.length ?? 0) / INDEX_PAGE_SIZE))
    if (indexPage.value > maxPage) {
      indexPage.value = maxPage
    }
  })
}

async function handleReindexAll(): Promise<void> {
  await withReindexLoading(async () => {
    lastReindexResult.value = await reindexAllRag()
    message.success('批量重建索引完成')
    await loadStatus()
  })
}

async function handleReindexSingle(schemaId: string): Promise<void> {
  try {
    await reindexSingleRag(schemaId)
    message.success('索引重建成功')
    await loadStatus()
  } catch {
    message.error('索引重建失败')
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

function getSchemaTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    form: '表单',
    search_list: '查询列表',
  }
  return labels[type] ?? type
}

onMounted(() => {
  loadStatus()
})
</script>

<template>
  <div :class="$style.dashboard" v-loading="loading">
    <div :class="$style.header">
      <div>
        <h2 :class="$style.title">RAG 知识库</h2>
        <p :class="$style.subtitle">
          管理 Schema / 流程向量索引，验证语义召回，保障对话上下文质量
        </p>
      </div>
      <div :class="$style.headerActions">
        <el-tooltip
          v-if="status"
          :content="status.embeddingConfigured
            ? '嵌入模型已就绪，语义检索可用'
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
        <el-button type="success" size="small" @click="openUploadDialog">
          <AppIcon name="upload" :size="14" />
          上传文档
        </el-button>
        <el-button type="primary" size="small" :loading="reindexing" @click="handleReindexAll">
          <AppIcon name="refresh" :size="14" />
          {{ reindexing ? '索引中...' : '重建索引' }}
        </el-button>
        <el-button size="small" :loading="loading" @click="loadStatus">
          <AppIcon name="refresh" :size="14" />
          刷新
        </el-button>
      </div>
    </div>

    <div
      v-if="status && !status.embeddingConfigured"
      :class="$style.banner"
    >
      <AppIcon name="warning" :size="16" />
      <span>
        嵌入模型未配置，RAG 只做关键词兜底。前往
        <router-link to="/settings/embedding">嵌入模型设置</router-link>
        后，可启用向量索引与语义召回。
      </span>
    </div>

    <RagSummary
      :status="status"
      :health-percent="healthPercent"
      :class="$style.summaryRow"
    />

    <div :class="$style.panelRow">
      <RagSearchPanel
        v-model:query="searchQuery"
        :loading="searchLoading"
        :performed="searchPerformed"
        :results="searchResults"
        @search="handleSearch"
        @reindex="handleReindexSingle"
      />
      <RagIndexOverview
        :status="status"
        :last-reindex-result="lastReindexResult"
      />
    </div>

    <div :class="$style.section">
      <div :class="$style.sectionHeader">
        <h3 :class="$style.sectionTitle">
          索引管理
          <span v-if="status" :class="$style.sectionCount">（待索引 {{ status.unindexed }}）</span>
        </h3>
        <div :class="$style.sectionActions">
          <el-button size="small" :type="bulkMode ? 'danger' : 'default'" @click="toggleBulkMode">
            {{ bulkMode ? '取消' : '批量操作' }}
          </el-button>
          <template v-if="bulkMode">
            <el-button
              size="small"
              type="primary"
              :disabled="selectedIds.size === 0"
              :loading="bulkProcessing"
              @click="handleBulkReindex"
            >
              批量索引 ({{ selectedIds.size }})
            </el-button>
            <el-button
              size="small"
              type="danger"
              :disabled="selectedIds.size === 0"
              :loading="bulkProcessing"
              @click="handleBulkDeleteEmbedding"
            >
              批量删除 ({{ selectedIds.size }})
            </el-button>
          </template>
        </div>
      </div>

      <el-table
        :data="paginatedUnindexed"
        :class="$style.table"
        stripe
        size="small"
        empty-text="所有 Schema 均已索引 ✓"
      >
        <el-table-column v-if="bulkMode" label="" width="48">
          <template #default="{ row }">
            <el-checkbox
              :model-value="selectedIds.has(row.id)"
              @change="toggleSelect(row.id)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" min-width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 'form' ? 'primary' : 'success'">
              {{ getSchemaTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="120">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleReindexSingle(row.id)">
              <AppIcon name="refresh" :size="12" />
              建立索引
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="unindexedSchemas.length > 0" :class="$style.pagination">
        <el-pagination
          v-model:current-page="indexPage"
          :page-size="INDEX_PAGE_SIZE"
          :total="unindexedSchemas.length"
          layout="total, prev, pager, next"
          small
          background
          @current-change="handleIndexPageChange"
        />
      </div>
    </div>

    <el-dialog
      v-model="uploadDialogVisible"
      title="上传文档到知识库"
      width="600px"
      :close-on-click-modal="false"
    >
      <div :class="$style.uploadContent">
        <p :class="$style.uploadHint">
          支持 PDF、Word、Excel、TXT、CSV 格式，最大 10MB
        </p>
        <el-upload
          :auto-upload="false"
          :limit="1"
          :on-change="handleUploadChange"
          :file-list="uploadFileList.map(f => ({ name: f.name, raw: f }))"
          accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
          drag
        >
          <AppIcon name="upload" :size="40" />
          <div :class="$style.uploadText">拖拽文件到此处，或<em>点击上传</em></div>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="uploadLoading"
          :disabled="uploadFileList.length === 0"
          @click="handleUploadSubmit"
        >
          上传并索引
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style module>
.dashboard {
  padding: 24px;
  min-height: 100%;
  background: var(--el-bg-color-page, #f5f7fa);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  color: var(--el-text-color-primary, #303133);
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}

.headerActions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning-dark-2);
  font-size: 13px;
  line-height: 1.5;
}

.summaryRow {
  margin-bottom: 16px;
}

.panelRow {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 16px;
  margin-bottom: 16px;
  height: 420px;
}

.panelRow > * {
  min-height: 0;
}

.section {
  background: var(--el-bg-color, #fff);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
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

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.uploadContent {
  text-align: center;
}

.uploadHint {
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
  margin-bottom: 16px;
}

.uploadText {
  margin-top: 8px;
  color: var(--el-text-color-secondary, #909399);
  font-size: 14px;
}

.uploadText em {
  color: var(--el-color-primary, #409eff);
  font-style: normal;
}

@media (max-width: 900px) {
  .panelRow {
    grid-template-columns: 1fr;
    height: auto;
  }

  .panelRow > * {
    height: 320px;
  }
}
</style>
