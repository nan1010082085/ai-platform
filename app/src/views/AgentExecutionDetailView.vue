<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import FilterTabs from '@schema-platform/platform-shared/components/common/FilterTabs.vue'
import AgentNodeExecutionDetail from '@/components/agent-workflow/AgentNodeExecutionDetail.vue'
import NodeTraceList, { NODE_STATUS_TAG_TYPE, NODE_STATUS_LABELS } from '@/components/agent-workflow/NodeTraceList.vue'
import ExecutionHITLDialog from '@/components/agent-workflow/ExecutionHITLDialog.vue'
import type { AgentNodeRecord, AgentWorkflowExecution, AgentWorkflowGraph, AgentWorkflowNodeData } from '@/types/agentWorkflow'
import { useAgentWorkflowDesignerStore } from '@/stores/agentWorkflowDesigner'
import AgentWorkflowCanvas from '@/components/agent-workflow/AgentWorkflowCanvas.vue'
import * as api from '@/api/agentWorkflowApi'
import { getExecutionTriggerLabel } from '@/constants/workflowInvocation'
import { subscribeWorkflowExecution } from '@/composables/useWorkflowExecutionStream'
import styles from './AgentExecutionDetailView.module.scss'

const route = useRoute()
const router = useRouter()
const store = useAgentWorkflowDesignerStore()
const execution = ref<AgentWorkflowExecution | null>(null)
const selectedRecord = ref<AgentNodeRecord | null>(null)
const activeTab = ref<'records' | 'logs' | 'detail'>('records')
const panelOpen = ref(true)
const panelExpanded = ref(false)
const hitlDialogVisible = ref(false)
const hitlDialog = ref<InstanceType<typeof ExecutionHITLDialog> | null>(null)
const cancelling = ref(false)
let unsubscribeWorkflow: (() => void) | null = null

const TERMINAL_STATUSES = new Set(['success', 'error', 'waiting', 'cancelled'])

const executionId = () => route.params.id as string

const tabOptions = [
  { label: '节点记录', value: 'records' },
  { label: '日志', value: 'logs' },
  { label: '节点详情', value: 'detail' },
]

async function load() {
  const data = await api.getExecution(executionId())
  execution.value = data

  const active = data.nodeRecords.filter((r) => r.status === 'running').map((r) => r.nodeId)
  const completed = data.nodeRecords
    .filter((r) => r.status === 'success')
    .map((r) => r.nodeId)
  store.applyExecutionHighlight(active, completed, data.nodeRecords)

  if (selectedRecord.value) {
    const updated = data.nodeRecords.find((r) => r.nodeId === selectedRecord.value!.nodeId)
    if (updated) selectedRecord.value = updated
  } else if (data.nodeRecords.length) {
    selectedRecord.value = data.nodeRecords[data.nodeRecords.length - 1]
  }
}

function selectRecord(record: AgentNodeRecord) {
  selectedRecord.value = record
  activeTab.value = 'detail'
  panelOpen.value = true
  const active = record.status === 'running' ? [record.nodeId] : []
  const completed = execution.value?.nodeRecords
    .filter((r) => r.status === 'success')
    .map((r) => r.nodeId) ?? []
  store.applyExecutionHighlight(active, completed, execution.value?.nodeRecords ?? [])
}

function onCanvasNodeClick(nodeId: string) {
  const record = execution.value?.nodeRecords.find((r) => r.nodeId === nodeId)
  if (record) {
    selectRecord(record)
  }
}

function openHitlDialog(action: 'approve' | 'reject') {
  hitlDialog.value?.setAction(action)
  hitlDialogVisible.value = true
}

async function onHitlResolved() {
  await load()
  startWorkflowWatch()
}

function applyExecutionUpdate(data: AgentWorkflowExecution) {
  execution.value = data
  const active = data.nodeRecords.filter((r) => r.status === 'running').map((r) => r.nodeId)
  const completed = data.nodeRecords
    .filter((r) => r.status === 'success')
    .map((r) => r.nodeId)
  store.applyExecutionHighlight(active, completed, data.nodeRecords)
  if (selectedRecord.value) {
    const updated = data.nodeRecords.find((r) => r.nodeId === selectedRecord.value!.nodeId)
    if (updated) selectedRecord.value = updated
  }
}

function startWorkflowWatch() {
  stopWorkflowWatch()
  if (!execution.value || !TERMINAL_STATUSES.has(execution.value.status)) {
    if (execution.value?.status === 'running') {
      unsubscribeWorkflow = subscribeWorkflowExecution(executionId(), (data) => {
        applyExecutionUpdate(data)
      })
    }
  }
}

function stopWorkflowWatch() {
  if (unsubscribeWorkflow) {
    unsubscribeWorkflow()
    unsubscribeWorkflow = null
  }
}

async function stopExecution() {
  if (!execution.value || execution.value.status !== 'running') return
  cancelling.value = true
  try {
    execution.value = await api.cancelExecution(executionId())
    ElMessage.success('已停止执行')
    stopWorkflowWatch()
    await load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '停止失败')
  } finally {
    cancelling.value = false
  }
}

async function loadExecutionGraph(exec: AgentWorkflowExecution) {
  try {
    const snap = await api.getWorkflowVersion(exec.workflowId, exec.version)
    store.loadGraph(snap.graph as AgentWorkflowGraph)
  } catch {
    const wf = await api.getWorkflow(exec.workflowId)
    store.loadGraph(wf.draftGraph)
  }
}

onMounted(async () => {
  const exec = await api.getExecution(executionId())
  execution.value = exec
  await loadExecutionGraph(exec)
  await load()
  if (execution.value?.status === 'waiting') {
    openHitlDialog('approve')
  }
  startWorkflowWatch()
})

onUnmounted(() => {
  stopWorkflowWatch()
  store.reset()
})

const durationLabel = computed(() => {
  const ms = execution.value?.durationMs
  if (ms == null) return '-'
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
})

const selectedNodeData = computed((): AgentWorkflowNodeData | null => {
  if (!selectedRecord.value) return null
  const node = store.nodes.find((n) => n.id === selectedRecord.value!.nodeId)
  return (node?.data as AgentWorkflowNodeData | undefined) ?? null
})

// 当前等待中的 HITL 节点记录
const waitingRecord = computed(() =>
  execution.value?.nodeRecords.find((r) => r.status === 'waiting') ?? null,
)

watch(
  () => execution.value?.status,
  (status) => {
    if (TERMINAL_STATUSES.has(status ?? '')) {
      stopWorkflowWatch()
    } else if (status === 'running') {
      startWorkflowWatch()
    }
    if (status === 'waiting' && !hitlDialogVisible.value) {
      openHitlDialog('approve')
    }
  },
)

// 从节点记录派生执行日志
interface LogEntry {
  time: string
  level: string
  message: string
}

const logEntries = computed<LogEntry[]>(() => {
  if (!execution.value) return []
  const entries: LogEntry[] = []
  for (const r of execution.value.nodeRecords) {
    if (r.startedAt) {
      entries.push({
        time: new Date(r.startedAt).toLocaleTimeString('zh-CN', { hour12: false }),
        level: r.status === 'error' ? 'error' : r.status === 'waiting' ? 'warn' : 'info',
        message: `[${r.nodeName}] 开始执行 (${r.nodeType})`,
      })
    }
    if (r.finishedAt) {
      const level = r.status === 'error' ? 'error' : r.status === 'waiting' ? 'warn' : 'success'
      const suffix = r.durationMs != null ? ` · ${r.durationMs}ms` : ''
      entries.push({
        time: new Date(r.finishedAt).toLocaleTimeString('zh-CN', { hour12: false }),
        level,
        message:
          r.status === 'error'
            ? `[${r.nodeName}] 执行失败${suffix}${r.error ? '：' + r.error : ''}`
            : `[${r.nodeName}] ${NODE_STATUS_LABELS[r.status] ?? r.status}${suffix}`,
      })
    }
  }
  if (execution.value.error) {
    entries.push({
      time: execution.value.finishedAt
        ? new Date(execution.value.finishedAt).toLocaleTimeString('zh-CN', { hour12: false })
        : '',
      level: 'error',
      message: `工作流执行失败：${execution.value.error}`,
    })
  }
  return entries
})

const LOG_LEVEL_COLOR: Record<string, string> = {
  info: 'var(--text-color-secondary)',
  success: 'var(--color-success)',
  warn: 'var(--color-warning)',
  error: 'var(--color-danger)',
}

const LOG_LEVEL_LABEL: Record<string, string> = {
  info: '信息',
  success: '成功',
  warn: '警告',
  error: '错误',
}

function togglePanel() {
  panelOpen.value = !panelOpen.value
  if (!panelOpen.value) panelExpanded.value = false
}

function togglePanelExpand() {
  panelExpanded.value = !panelExpanded.value
}
</script>

<template>
  <div v-if="execution" :class="styles.page">
    <!-- Toolbar -->
    <header :class="styles.toolbar">
      <div :class="styles.toolbarLeft">
        <button :class="styles.iconBtn" title="返回执行记录" @click="router.push({ name: 'agent-workflow-executions', params: { id: execution.workflowId } })">
          <AppIcon name="arrow-left" :size="14" />
        </button>
        <div :class="styles.divider" />
        <div :class="styles.titleWrap">
          <span :class="styles.title">{{ execution.workflowName }}</span>
          <span :class="styles.meta">
            {{ execution.id }} · v{{ execution.version }} · {{ getExecutionTriggerLabel(execution.trigger) }} · {{ durationLabel }}
          </span>
        </div>
        <el-tag size="small" :type="NODE_STATUS_TAG_TYPE[execution.status] ?? 'info'">
          {{ NODE_STATUS_LABELS[execution.status] ?? execution.status }}
        </el-tag>
      </div>

      <div :class="styles.toolbarCenter">
        <FilterTabs v-model="activeTab" :options="tabOptions" />
      </div>

      <div :class="styles.toolbarRight">
        <button
          :class="[styles.iconBtn, { [styles.iconBtnActive]: panelOpen }]"
          :title="panelOpen ? '收起底部面板' : '展开底部面板'"
          @click="togglePanel"
        >
          <AppIcon name="data-line" :size="14" />
        </button>
        <el-button
          v-if="execution.status === 'running'"
          size="small"
          type="danger"
          plain
          :loading="cancelling"
          @click="stopExecution"
        >
          停止执行
        </el-button>
        <template v-if="execution.status === 'waiting'">
          <el-button size="small" type="danger" plain @click="openHitlDialog('reject')">
            拒绝
          </el-button>
          <el-button type="primary" size="small" @click="openHitlDialog('approve')">
            确认继续
          </el-button>
        </template>
      </div>
    </header>

    <!-- Canvas -->
    <div :class="styles.body">
      <AgentWorkflowCanvas
        read-only
        :selected-node-id="selectedRecord?.nodeId ?? null"
        @node-click="onCanvasNodeClick"
      />
    </div>

    <!-- Bottom slide-up panel -->
    <transition name="slideUp">
      <div
        v-show="panelOpen"
        :class="[styles.bottomPanel, panelExpanded && styles.bottomPanelExpanded]"
      >
        <button
          :class="styles.panelExpandBtn"
          :title="panelExpanded ? '收起面板' : '展开面板'"
          @click="togglePanelExpand"
        >
          <AppIcon :name="panelExpanded ? 'arrow-down' : 'arrow-up'" :size="12" />
        </button>
        <div :class="styles.panelHeader">
          <span :class="styles.panelTitle">
            {{ tabOptions.find((t) => t.value === activeTab)?.label }}
          </span>
        </div>

        <div :class="styles.panelContent">
          <!-- 节点记录 -->
          <template v-if="activeTab === 'records'">
            <NodeTraceList
              :records="execution.nodeRecords"
              :selected-node-id="selectedRecord?.nodeId"
              @select="selectRecord"
            />
          </template>

          <!-- 日志 -->
          <template v-else-if="activeTab === 'logs'">
            <div v-if="!logEntries.length" :class="styles.empty">暂无日志</div>
            <div
              v-for="(entry, idx) in logEntries"
              :key="idx"
              :class="styles.logEntry"
            >
              <span :class="styles.logTime">{{ entry.time }}</span>
              <span :class="styles.logLevel" :style="{ color: LOG_LEVEL_COLOR[entry.level] }">
                {{ LOG_LEVEL_LABEL[entry.level] ?? entry.level }}
              </span>
              <span :class="styles.logMsg">{{ entry.message }}</span>
            </div>
          </template>

          <!-- 节点详情 -->
          <template v-else>
            <div v-if="!selectedRecord" :class="styles.empty">选择节点记录查看输入输出</div>
            <AgentNodeExecutionDetail
              v-else
              :record="selectedRecord"
              :node-data="selectedNodeData"
              :expanded="panelExpanded"
            />
          </template>
        </div>
      </div>
    </transition>

    <!-- HITL 人工确认弹框 -->
    <ExecutionHITLDialog
      ref="hitlDialog"
      v-model:visible="hitlDialogVisible"
      :waiting-record="waitingRecord"
      :execution-id="executionId()"
      @resolved="onHitlResolved"
    />
  </div>
</template>

