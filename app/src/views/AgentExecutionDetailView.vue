<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import FilterTabs from '@schema-platform/platform-shared/components/common/FilterTabs.vue'
import HitlConfirmQuestions from '@/components/agent-workflow/HitlConfirmQuestions.vue'
import AgentNodeExecutionDetail from '@/components/agent-workflow/AgentNodeExecutionDetail.vue'
import type { AgentHitlConfirmQuestion, AgentNodeRecord, AgentWorkflowExecution, AgentWorkflowGraph, AgentWorkflowNodeData } from '@/types/agentWorkflow'
import { useAgentWorkflowDesignerStore } from '@/stores/agentWorkflowDesigner'
import AgentWorkflowCanvas from '@/components/agent-workflow/AgentWorkflowCanvas.vue'
import * as api from '@/api/agentWorkflowApi'
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
const hitlComment = ref('')
const hitlAction = ref<'approve' | 'reject'>('approve')
const hitlSubmitting = ref(false)
const hitlAnswers = ref<Record<string, string>>({})
const hitlQuestionsRef = ref<InstanceType<typeof HitlConfirmQuestions> | null>(null)
const cancelling = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const executionId = () => route.params.id as string

const tabOptions = [
  { label: '节点记录', value: 'records' },
  { label: '日志', value: 'logs' },
  { label: '节点详情', value: 'detail' },
]

const statusIcon: Record<string, string> = {
  running: 'loading',
  success: 'circle-check',
  error: 'circle-close',
  waiting: 'clock',
  skipped: 'minus',
  pending: 'more',
}

const statusType: Record<string, string> = {
  running: 'primary',
  success: 'success',
  error: 'danger',
  waiting: 'warning',
  cancelled: 'info',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '等待',
  running: '执行中',
  success: '成功',
  error: '失败',
  skipped: '跳过',
  waiting: '待确认',
  cancelled: '已取消',
}

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

async function confirmHitl() {
  if (hitlAction.value === 'approve' && hitlQuestions.value.length > 0) {
    const canConfirm = hitlQuestionsRef.value?.canConfirm ?? false
    if (!canConfirm) {
      ElMessage.warning('请先回答所有必填问题')
      return
    }
  }

  hitlSubmitting.value = true
  try {
    const approved = hitlAction.value === 'approve'
    await api.resumeExecution(executionId(), {
      approved,
      comment: hitlComment.value,
      answers: hitlAnswers.value,
    })
    ElMessage.success(approved ? '已确认继续' : '已拒绝')
    hitlDialogVisible.value = false
    hitlComment.value = ''
    hitlAnswers.value = {}
    await load()
    startPoll()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  } finally {
    hitlSubmitting.value = false
  }
}

function openHitlDialog(action: 'approve' | 'reject') {
  hitlAction.value = action
  initHitlAnswers()
  hitlDialogVisible.value = true
}

function initHitlAnswers() {
  const next: Record<string, string> = {}
  for (const q of hitlQuestions.value) {
    next[q.id] = hitlAnswers.value[q.id] ?? ''
  }
  hitlAnswers.value = next
}

async function rejectHitl() {
  openHitlDialog('reject')
}

function startPoll() {
  stopPoll()
  if (execution.value?.status === 'running') {
    pollTimer = setInterval(load, 2000)
  }
}

async function stopExecution() {
  if (!execution.value || execution.value.status !== 'running') return
  cancelling.value = true
  try {
    execution.value = await api.cancelExecution(executionId())
    ElMessage.success('已停止执行')
    stopPoll()
    await load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '停止失败')
  } finally {
    cancelling.value = false
  }
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
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
  startPoll()
})

onUnmounted(() => {
  stopPoll()
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

const hitlConfirmMessage = computed(() => {
  const output = waitingRecord.value?.output as Record<string, unknown> | undefined
  return (output?.message as string) ?? '请确认是否继续执行'
})

const hitlQuestions = computed((): AgentHitlConfirmQuestion[] => {
  const output = waitingRecord.value?.output as Record<string, unknown> | undefined
  const raw = output?.confirmQuestions
  if (!Array.isArray(raw)) return []
  return raw
    .filter((q): q is Record<string, unknown> => q != null && typeof q === 'object')
    .map((q, i) => ({
      id: String(q.id ?? `q${i + 1}`),
      question: String(q.question ?? ''),
      options: Array.isArray(q.options) ? q.options.map(String) : undefined,
      required: q.required !== false,
    }))
    .filter((q) => q.question.trim())
})

const hitlDialogWidth = computed(() => (hitlQuestions.value.length > 0 ? '560px' : '460px'))

const canSubmitHitl = computed(() => {
  if (hitlAction.value === 'reject') return true
  if (hitlQuestions.value.length === 0) return true
  return hitlQuestions.value
    .filter((q) => q.required !== false)
    .every((q) => hitlAnswers.value[q.id]?.trim())
})

watch(
  () => execution.value?.status,
  (status) => {
    if (status !== 'running') {
      stopPoll()
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
            : `[${r.nodeName}] ${STATUS_LABELS[r.status] ?? r.status}${suffix}`,
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
          <span :class="styles.meta">{{ execution.id }} · v{{ execution.version }} · {{ durationLabel }}</span>
        </div>
        <el-tag size="small" :type="(statusType[execution.status] as any) ?? 'info'">
          {{ STATUS_LABELS[execution.status] ?? execution.status }}
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
          <el-button size="small" type="danger" plain @click="rejectHitl">
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
            <div v-if="!execution.nodeRecords.length" :class="styles.empty">暂无节点记录</div>
            <div
              v-for="record in execution.nodeRecords"
              :key="`${record.nodeId}-${record.startedAt}`"
              :class="[styles.recordItem, selectedRecord?.nodeId === record.nodeId && styles.recordItemActive]"
              @click="selectRecord(record)"
            >
              <AppIcon :name="statusIcon[record.status] ?? 'connection'" :size="14" />
              <div :class="styles.recordText">
                <span :class="styles.recordName">{{ record.nodeName }}</span>
                <span :class="styles.recordType">{{ record.nodeType }} · {{ STATUS_LABELS[record.status] ?? record.status }}</span>
              </div>
              <span v-if="record.durationMs != null" :class="styles.recordMs">
                {{ record.durationMs < 1000 ? `${record.durationMs}ms` : `${(record.durationMs / 1000).toFixed(2)}s` }}
              </span>
            </div>
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
    <AppDialog
      v-model="hitlDialogVisible"
      :title="hitlAction === 'approve' ? '人工确认 — 继续' : '人工确认 — 拒绝'"
      :width="hitlDialogWidth"
      :show-fullscreen-btn="false"
      :close-on-click-modal="false"
    >
      <div v-if="waitingRecord" :class="styles.hitlNodeInfo">
        <AppIcon name="bell" :size="16" />
        <span>{{ waitingRecord.nodeName }}</span>
      </div>
      <div :class="styles.hitlPrompt">{{ hitlConfirmMessage }}</div>

      <HitlConfirmQuestions
        v-if="hitlQuestions.length > 0 && hitlAction === 'approve'"
        ref="hitlQuestionsRef"
        v-model:answers="hitlAnswers"
        :questions="hitlQuestions"
      />

      <el-input
        v-model="hitlComment"
        type="textarea"
        :rows="3"
        :placeholder="hitlAction === 'approve' ? '审批备注（可选）' : '拒绝原因（可选）'"
      />
      <template #footer>
        <el-button @click="hitlDialogVisible = false">取消</el-button>
        <el-button
          :type="hitlAction === 'approve' ? 'primary' : 'danger'"
          :loading="hitlSubmitting"
          :disabled="hitlAction === 'approve' && !canSubmitHitl"
          @click="confirmHitl"
        >
          {{ hitlAction === 'approve' ? '确认继续' : '确认拒绝' }}
        </el-button>
      </template>
    </AppDialog>
  </div>
</template>
