<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
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
import { useExecutionNodeStream } from '@/composables/useNodeStreaming'
import {
  resolveExecutionDetailBackTo,
} from '@/utils/executionNavigation'
import styles from './AgentExecutionDetailView.module.scss'

const route = useRoute()
const router = useRouter()
const store = useAgentWorkflowDesignerStore()
const execution = ref<AgentWorkflowExecution | null>(null)
const selectedRecord = ref<AgentNodeRecord | null>(null)
const activeTab = ref<'records' | 'streaming' | 'logs' | 'detail' | 'variables'>('records')
const panelOpen = ref(true)
const panelExpanded = ref(false)
const hitlDialogVisible = ref(false)
const hitlDialog = ref<InstanceType<typeof ExecutionHITLDialog> | null>(null)
const cancelling = ref(false)
const loadError = ref<string | null>(null)
let unsubscribeWorkflow: (() => void) | null = null

const TERMINAL_STATUSES = new Set(['success', 'error', 'waiting', 'cancelled'])

const executionId = () => route.params.id as string

/**
 * 从全局执行列表进入时带 ?from=global，返回应回到全部执行，而非单工作流列表。
 */
const backToExecutions = computed(() =>
  resolveExecutionDetailBackTo({
    fromGlobal: route.query.from === 'global',
    workflowId: execution.value?.workflowId,
  }),
)

const executionIdRef = computed(() => executionId())
const { stream: nodeStream } = useExecutionNodeStream(executionIdRef)

const tabOptions = [
  { label: '节点记录', value: 'records' },
  { label: '实时', value: 'streaming' },
  { label: '日志', value: 'logs' },
  { label: '节点详情', value: 'detail' },
  { label: '变量检视', value: 'variables' },
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
  try {
    await ElMessageBox.confirm('确定停止该执行？停止后不可继续当前运行。', '停止执行', {
      type: 'warning',
      confirmButtonText: '确认停止',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
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
  await bootstrap()
})

async function bootstrap() {
  loadError.value = null
  try {
    const exec = await api.getExecution(executionId())
    execution.value = exec
    startWorkflowWatch()
    await loadExecutionGraph(exec)
    await load()
    if (execution.value?.status === 'waiting') {
      openHitlDialog('approve')
    }
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : '加载执行记录失败'
    console.error('[exec] load failed', err)
  }
}

async function retryLoad() {
  await bootstrap()
}

onUnmounted(() => {
  stopWorkflowWatch()
  store.reset()
})

const durationLabel = computed(() => {
  const ms = execution.value?.durationMs
  if (ms == null) return '-'
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
})

/** 本次执行运行时摘要（排障不必另开监控页） */
const runtimeSummary = computed(() => {
  const ex = execution.value
  if (!ex) return null
  const records = ex.nodeRecords ?? []
  const failed = records.filter((r) => r.status === 'error')
  const slow = [...records]
    .filter((r) => typeof r.durationMs === 'number')
    .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))
    .slice(0, 3)
  return {
    status: ex.status,
    durationLabel: durationLabel.value,
    nodeCount: records.length,
    failedCount: failed.length,
    failedNames: failed.map((r) => r.nodeName).slice(0, 3),
    slowNodes: slow.map((r) => ({
      name: r.nodeName,
      ms: r.durationMs ?? 0,
    })),
  }
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

const variableOutputs = computed(() => {
  return (execution.value?.nodeRecords ?? [])
    .filter((r) => r.output !== undefined && r.output !== null)
    .map((r) => ({
      nodeId: r.nodeId,
      nodeName: r.nodeName,
      outputText: typeof r.output === 'string' ? r.output : JSON.stringify(r.output, null, 2),
    }))
})

function togglePanel() {
  panelOpen.value = !panelOpen.value
  if (!panelOpen.value) panelExpanded.value = false
}

function togglePanelExpand() {
  panelExpanded.value = !panelExpanded.value
}
</script>

<template>
  <div v-if="loadError" :class="styles.errorPage">
    <AppIcon name="warning-filled" :size="32" />
    <p>{{ loadError }}</p>
    <div :class="styles.errorActions">
      <el-button @click="router.push(backToExecutions)">返回列表</el-button>
      <el-button type="primary" @click="retryLoad">重试</el-button>
    </div>
  </div>
  <div v-else-if="execution" :class="styles.page">
    <!-- Toolbar -->
    <header :class="styles.toolbar">
      <div :class="styles.toolbarLeft">
        <button
          :class="styles.iconBtn"
          aria-label="返回执行记录"
          title="返回执行记录"
          @click="router.push(backToExecutions)"
        >
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
          :aria-label="panelOpen ? '收起底部面板' : '展开底部面板'"
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

    <div v-if="runtimeSummary" :class="styles.runtimeStrip" data-testid="runtime-summary">
      <span :class="styles.runtimeItem">
        本次耗时 <strong>{{ runtimeSummary.durationLabel }}</strong>
      </span>
      <span :class="styles.runtimeItem">
        节点 {{ runtimeSummary.nodeCount }}
      </span>
      <span
        :class="[
          styles.runtimeItem,
          runtimeSummary.failedCount > 0 ? styles.runtimeWarn : '',
        ]"
      >
        失败 {{ runtimeSummary.failedCount }}
        <template v-if="runtimeSummary.failedNames.length">
          （{{ runtimeSummary.failedNames.join('、') }}）
        </template>
      </span>
      <span
        v-if="runtimeSummary.slowNodes.length"
        :class="styles.runtimeItem"
      >
        最慢
        <template v-for="(n, i) in runtimeSummary.slowNodes" :key="n.name">
          <span v-if="i > 0"> · </span>{{ n.name }} {{ n.ms }}ms
        </template>
      </span>
    </div>

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
          :aria-label="panelExpanded ? '收起面板' : '展开面板'"
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

          <!-- 实时（节点级流式输出 + 节点事件） -->
          <template v-else-if="activeTab === 'streaming'">
            <div :class="styles.streamPanel">
              <!-- 活跃流式节点（per-node streamingOutputs，可同时多个） -->
              <template v-if="nodeStream.activeNodes.length > 0">
                <div v-for="node in nodeStream.activeNodes" :key="node.nodeId" :class="styles.streamBlock">
                  <div :class="styles.streamHeader">
                    <span :class="styles.streamNode">{{ node.nodeId }}</span>
                    <span :class="styles.streamType">{{ node.nodeType }}</span>
                    <span :class="styles.streamTime">{{ node.updatedAt }}</span>
                  </div>
                  <pre :class="styles.streamText">{{ node.text }}</pre>
                </div>
              </template>
              <div v-else :class="styles.empty">等待节点开始执行…</div>

              <!-- 节点事件统计 -->
              <div v-if="Object.keys(nodeStream.eventCounts).length > 0" :class="styles.streamStats">
                <span>事件统计：</span>
                <el-tag
                  v-for="(count, type) in nodeStream.eventCounts"
                  :key="type"
                  size="small"
                  :class="styles.streamTag"
                >
                  {{ type }} ×{{ count }}
                </el-tag>
              </div>

              <!-- 最近 node-event 事件流 -->
              <div v-if="nodeStream.nodeEvents.length > 0" :class="styles.streamEvents">
                <div :class="styles.streamEventsTitle">最近事件（{{ nodeStream.nodeEvents.length }}）</div>
                <div
                  v-for="(evt, idx) in nodeStream.nodeEvents.slice(-20).reverse()"
                  :key="idx"
                  :class="styles.streamEvent"
                >
                  <span :class="styles.streamEventType">{{ evt.eventType }}</span>
                  <span :class="styles.streamEventNode">{{ evt.nodeId ?? '' }}</span>
                  <span :class="styles.streamEventText">
                    {{ evt.text ?? (evt.toolName ? `${evt.toolName}(${String(evt.toolArgs ?? '').slice(0, 60)})` : '') }}
                  </span>
                </div>
              </div>
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
          <template v-else-if="activeTab === 'detail'">
            <div v-if="!selectedRecord" :class="styles.empty">选择节点记录查看输入输出</div>
            <AgentNodeExecutionDetail
              v-else
              :record="selectedRecord"
              :node-data="selectedNodeData"
              :expanded="panelExpanded"
            />
          </template>
          <!-- 变量检视 -->
          <template v-else>
            <div v-if="!variableOutputs.length" :class="styles.empty">暂无变量输出（等待节点执行完成）</div>
            <div v-else>
              <div v-for="item in variableOutputs" :key="item.nodeId" :class="styles.logEntry">
                <span :class="styles.logTime">{{ item.nodeId }}</span>
                <span :class="styles.logMsg">{{ item.nodeName }}</span>
                <pre style="margin: 4px 0 0; font-size: 12px; white-space: pre-wrap; word-break: break-all; color: var(--text-color-primary);">{{ item.outputText }}</pre>
              </div>
            </div>
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

