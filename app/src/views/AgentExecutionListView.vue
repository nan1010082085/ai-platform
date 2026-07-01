<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { AgentWorkflowExecution } from '@/types/agentWorkflow'
import * as api from '@/api/agentWorkflowApi'
import styles from './AgentExecutionListView.module.scss'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const items = ref<AgentWorkflowExecution[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const workflowId = computed(() => route.params.id as string)

const statusType: Record<string, string> = {
  running: 'primary',
  success: 'success',
  error: 'danger',
  waiting: 'warning',
  cancelled: 'info',
}

const STATUS_LABELS: Record<string, string> = {
  running: '执行中',
  success: '成功',
  error: '失败',
  waiting: '待确认',
  cancelled: '已取消',
}

async function load() {
  loading.value = true
  try {
    const res = await api.listExecutions({
      workflowId: workflowId.value,
      page: page.value,
      pageSize: pageSize.value,
    })
    items.value = res.items
    total.value = res.total
  } catch {
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  load()
}

function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  load()
}

function formatVersion(v: string): string {
  if (!v || v.length !== 14) return v || '-'
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)} ${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}`
}

function formatDuration(ms?: number): string {
  if (ms == null) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m${s}s`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', { hour12: false })
}

onMounted(load)
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.scroll">
      <!-- Header -->
      <div :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1>执行记录</h1>
            <p :class="styles.subtitle">工作流的全部执行历史</p>
          </div>
          <div :class="styles.headerActions">
            <el-button @click="router.push({ name: 'agent-workflow-executions', params: { id: workflowId } })">
              返回
            </el-button>
            <el-button type="primary" @click="router.push({ name: 'agent-workflow-designer', params: { id: workflowId } })">
              打开设计器
            </el-button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div :class="styles.content">
        <el-table
          v-loading="loading"
          :data="items"
          :class="styles.table"
          stripe
        >
          <el-table-column label="执行 ID" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">
              <span :class="styles.execId">{{ row.id }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="(statusType[row.status] as any) ?? 'info'" size="small" :effect="row.status === 'running' ? 'dark' : 'light'">
                {{ STATUS_LABELS[row.status] ?? row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="版本" width="180">
            <template #default="{ row }">
              <span :class="styles.version">{{ formatVersion(row.version) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="触发方式" width="100">
            <template #default="{ row }">
              {{ row.trigger === 'manual' ? '手动' : row.trigger === 'webhook' ? 'Webhook' : row.trigger }}
            </template>
          </el-table-column>
          <el-table-column label="耗时" width="100">
            <template #default="{ row }">{{ formatDuration(row.durationMs) }}</template>
          </el-table-column>
          <el-table-column label="开始时间" min-width="180">
            <template #default="{ row }">{{ formatTime(row.startedAt) }}</template>
          </el-table-column>
          <el-table-column label="节点数" width="80" align="center">
            <template #default="{ row }">{{ row.nodeRecords?.length ?? 0 }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="router.push({ name: 'agent-execution-detail', params: { id: row.id } })">
                详情
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <div :class="styles.empty">
              <AppIcon name="list" :size="48" />
              <p>暂无执行记录</p>
              <el-button type="primary" size="small" @click="router.push({ name: 'agent-workflow-designer', params: { id: workflowId } })">
                去测试执行
              </el-button>
            </div>
          </template>
        </el-table>

        <!-- Pagination -->
        <div v-if="total > 0" :class="styles.pagination">
          <el-pagination
            :current-page="page"
            :page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next"
            background
            @current-change="onPageChange"
            @size-change="onPageSizeChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>
