<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import TableRowActions, { type TableRowAction } from '@/components/common/TableRowActions.vue'
import type { AgentWorkflowExecution } from '@/types/agentWorkflow'
import { getExecutionTriggerLabel } from '@/constants/workflowInvocation'
import { watchRunningWorkflowExecutions } from '@/composables/useWorkflowExecutionStream'
import * as api from '@/api/agentWorkflowApi'
import { validateObjectId } from '@/utils/objectId'
import { buildExecutionDetailQuery } from '@/utils/executionNavigation'
import styles from './AgentExecutionListView.module.scss'
import PageShell from '@/components/common/PageShell.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const loadError = ref<string | null>(null)
const cancellingId = ref<string | null>(null)
const items = ref<AgentWorkflowExecution[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(DEFAULT_PAGE_SIZE)
let stopWorkflowWatch: (() => void) | null = null

const workflowId = computed(() => route.params.id as string)
const isGlobal = computed(() => route.name === 'agent-executions')

// 筛选
const filterStatus = ref<string>('')
const filterTrigger = ref<string>('')

const STATUS_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '执行中', value: 'running' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'error' },
  { label: '待确认', value: 'waiting' },
  { label: '已取消', value: 'cancelled' },
]

const TRIGGER_OPTIONS = [
  { label: '全部来源', value: '' },
  { label: '手动', value: 'manual' },
  { label: '对话', value: 'chat' },
  { label: 'Webhook', value: 'webhook' },
  { label: 'API', value: 'api' },
  { label: '定时', value: 'schedule' },
]

type TagType = 'success' | 'info' | 'warning' | 'danger' | 'primary'
const statusType: Record<string, TagType> = {
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

function runningExecutionIds(): string[] {
  return items.value.filter((item) => item.status === 'running').map((item) => item.id)
}

function patchExecution(execution: AgentWorkflowExecution) {
  const idx = items.value.findIndex((item) => item.id === execution.id)
  if (idx >= 0) {
    items.value[idx] = execution
  }
}

function syncWorkflowWatch() {
  stopWorkflowWatch?.()
  stopWorkflowWatch = null

  const ids = runningExecutionIds()
  if (ids.length === 0) return

  stopWorkflowWatch = watchRunningWorkflowExecutions(
    runningExecutionIds,
    patchExecution,
  )
}

async function load(opts?: { silent?: boolean }) {
  if (!opts?.silent) loading.value = true
  loadError.value = null
  try {
    let wfId: string | undefined
    if (!isGlobal.value) {
      const validation = validateObjectId(workflowId.value, '工作流 ID')
      if (!validation.valid) {
        ElMessage.error(validation.error)
        return
      }
      wfId = validation.id
    }
    const res = await api.listExecutions({
      workflowId: wfId,
      status: filterStatus.value || undefined,
      trigger: filterTrigger.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    items.value = res.items
    total.value = res.total
    syncWorkflowWatch()
  } catch (e) {
    items.value = []
    total.value = 0
    loadError.value = e instanceof Error ? e.message : '加载失败'
    stopWorkflowWatch?.()
    stopWorkflowWatch = null
  } finally {
    if (!opts?.silent) loading.value = false
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

function onFilterChange() {
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

async function stopExecution(id: string) {
  try {
    await ElMessageBox.confirm('确定停止该执行？停止后不可继续当前运行。', '停止执行', {
      type: 'warning',
      confirmButtonText: '确认停止',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  cancellingId.value = id
  try {
    await api.cancelExecution(id)
    ElMessage.success('已停止执行')
    await load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '停止失败')
  } finally {
    cancellingId.value = null
  }
}

function rowActions(row: AgentWorkflowExecution): TableRowAction[] {
  const actions: TableRowAction[] = []
  if (row.status === 'running') {
    actions.push({
      key: 'stop',
      label: '停止',
      type: 'danger',
      loading: cancellingId.value === row.id,
      onClick: () => stopExecution(row.id),
    })
  }
  actions.push({
    key: 'detail',
    label: '详情',
    type: 'primary',
    onClick: () =>
      router.push({
        name: 'agent-execution-detail',
        params: { id: row.id },
        query: buildExecutionDetailQuery(isGlobal.value),
      }),
  })
  return actions
}

onMounted(() => {
  load()
})

onUnmounted(() => {
  stopWorkflowWatch?.()
  stopWorkflowWatch = null
})
</script>

<template>
  <PageShell>
      <PageHeader
        :title="isGlobal ? '全部执行记录' : '执行记录'"
        :subtitle="isGlobal ? '所有工作流的执行历史' : '工作流的全部执行历史'"
      >
        <template #actions>
          <el-button @click="router.push({ name: 'agent-workflows' })">
            返回
          </el-button>
          <el-button v-if="!isGlobal" type="primary" @click="router.push({ name: 'agent-workflow-designer', params: { id: workflowId } })">
            打开设计器
          </el-button>
        </template>
      </PageHeader>
      <div :class="styles.filters">
        <el-select v-model="filterStatus" :class="styles.filterSelect" @change="onFilterChange">
          <el-option v-for="opt in STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-select v-model="filterTrigger" :class="styles.filterSelect" @change="onFilterChange">
          <el-option v-for="opt in TRIGGER_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>

      <div :class="styles.content">
        <div v-if="loadError" :class="styles.errorState">
          <AppIcon name="warning-filled" :size="32" />
          <p>{{ loadError }}</p>
          <el-button type="primary" size="small" @click="load()">重试</el-button>
        </div>
        <el-table
          v-else
          v-loading="loading"
          :data="items"
          :class="styles.table"
          stripe
        >
          <el-table-column v-if="isGlobal" label="工作流" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <router-link :to="{ name: 'agent-workflow-executions', params: { id: row.workflowId } }" :class="styles.workflowLink">
                {{ row.workflowName || '-' }}
              </router-link>
            </template>
          </el-table-column>
          <el-table-column label="执行 ID" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">
              <span :class="styles.execId">{{ row.id }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="statusType[row.status] ?? 'info'" size="small" :effect="row.status === 'running' ? 'dark' : 'light'">
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
              {{ getExecutionTriggerLabel(row.trigger) }}
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
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <TableRowActions :actions="rowActions(row)" />
            </template>
          </el-table-column>
          <template #empty>
            <div :class="styles.empty">
              <AppIcon name="list" :size="48" />
              <p>暂无执行记录</p>
              <el-button v-if="!isGlobal" type="primary" size="small" @click="router.push({ name: 'agent-workflow-designer', params: { id: workflowId } })">
                去测试执行
              </el-button>
            </div>
          </template>
        </el-table>

        <AppPagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          @current-change="onPageChange"
          @size-change="onPageSizeChange"
        />
      </div>
</PageShell>
</template>
