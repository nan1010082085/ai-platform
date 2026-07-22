<script setup lang="ts">
/**
 * WorkflowDebugView - 工作流调用调试界面
 *
 * 独立于 chat 的 workflow 调用测试：自定义输入、看节点级执行轨迹、复跑。
 * 草稿（未发布）也可测，走 JWT execute（trigger='manual'）。
 *
 * 与 RoutingDebugView 并列：路由调试测"消息->专家"匹配；本界面测"input->workflow"节点流转。
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import NodeTraceList, { NODE_STATUS_TAG_TYPE, NODE_STATUS_LABELS } from '@/components/agent-workflow/NodeTraceList.vue'
import AgentNodeExecutionDetail from '@/components/agent-workflow/AgentNodeExecutionDetail.vue'
import * as api from '@/api/agentWorkflowApi'
import {
  workflowGraphNeedsUploadStream,
  pickWorkflowTestFile,
  fileToWorkflowPayload,
} from '@/utils/workflowFilePayload'
import { subscribeWorkflowExecution } from '@/composables/useWorkflowExecutionStream'
import type {
  AgentNodeRecord,
  AgentWorkflowDetail,
  AgentWorkflowExecution,
  AgentWorkflowNodeData,
} from '@/types/agentWorkflow'
import { resolveErrorText } from '@/constants/errorCodes'
import styles from './WorkflowDebugView.module.scss'

const route = useRoute()
const workflowId = computed(() => route.params.id as string)

const workflow = ref<AgentWorkflowDetail | null>(null)
const loadingWorkflow = ref(true)

const message = ref('')
const needsFile = computed(() =>
  workflow.value ? workflowGraphNeedsUploadStream(workflow.value.graph) : false,
)
const pendingFile = ref<File | null>(null)

const executing = ref(false)
const execution = ref<AgentWorkflowExecution | null>(null)
const selectedRecord = ref<AgentNodeRecord | null>(null)

const history = ref<Array<{ message: string; executionId: string; status: string; timestamp: Date }>>([])

let unsubscribe: (() => void) | null = null

const selectedNodeData = computed<AgentWorkflowNodeData | null>(() => {
  if (!selectedRecord.value || !workflow.value) return null
  const node = workflow.value.graph.nodes.find((n) => n.id === selectedRecord.value!.nodeId)
  return (node?.data as AgentWorkflowNodeData | undefined) ?? null
})

async function loadWorkflow() {
  loadingWorkflow.value = true
  try {
    workflow.value = await api.getWorkflow(workflowId.value)
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '加载工作流失败'))
  } finally {
    loadingWorkflow.value = false
  }
}

async function runTest() {
  if (!message.value.trim() && !pendingFile.value) {
    ElMessage.warning('请输入测试消息')
    return
  }
  executing.value = true
  execution.value = null
  selectedRecord.value = null
  try {
    const input: Record<string, unknown> = { message: message.value.trim() }
    if (needsFile.value) {
      const file = pendingFile.value ?? await pickWorkflowTestFile()
      if (!file) {
        ElMessage.warning('该工作流需要上传文件')
        return
      }
      input.file = await fileToWorkflowPayload(file)
    }
    const exec = await api.executeWorkflow(workflowId.value, input, { trigger: 'manual' })
    execution.value = exec
    pendingFile.value = null
    history.value.unshift({
      message: message.value.trim(),
      executionId: exec.id,
      status: exec.status,
      timestamp: new Date(),
    })
    if (history.value.length > 20) history.value = history.value.slice(0, 20)
    subscribeExecution(exec.id)
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '执行失败'))
  } finally {
    executing.value = false
  }
}

function subscribeExecution(executionId: string) {
  unsubscribe?.()
  unsubscribe = subscribeWorkflowExecution(executionId, (updated) => {
    execution.value = updated
    if (selectedRecord.value) {
      const refreshed = updated.nodeRecords.find((r) => r.nodeId === selectedRecord.value!.nodeId)
      if (refreshed) selectedRecord.value = refreshed
    }
    if (['success', 'error', 'cancelled'].includes(updated.status)) {
      unsubscribe?.()
      unsubscribe = null
    }
  })
}

function selectRecord(record: AgentNodeRecord) {
  selectedRecord.value = record
}

function loadFromHistory(item: { executionId: string }) {
  routeToExecution(item.executionId)
}

async function routeToExecution(executionId: string) {
  unsubscribe?.()
  unsubscribe = null
  try {
    execution.value = await api.getExecution(executionId)
    selectedRecord.value =
      execution.value.nodeRecords[execution.value.nodeRecords.length - 1] ?? null
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '加载执行记录失败'))
  }
}

function clearHistory() {
  history.value = []
}

onMounted(() => {
  loadWorkflow()
})

onUnmounted(() => {
  unsubscribe?.()
})
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.scroll">
      <PageHeader
        title="工作流调试"
        :subtitle="workflow ? `「${workflow.name}」自定义输入并查看节点级执行轨迹` : '加载工作流中...'"
      >
        <template #actions>
          <el-button :loading="loadingWorkflow" @click="loadWorkflow">
            <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
            刷新
          </el-button>
        </template>
      </PageHeader>

      <div v-loading="loadingWorkflow" :class="styles.content">
        <div :class="styles.leftCol">
          <!-- 输入区 -->
          <div :class="styles.inputCard">
            <h3 :class="styles.cardTitle">测试输入</h3>
            <el-input
              v-model="message"
              type="textarea"
              :rows="4"
              placeholder="输入测试消息，例如：帮我创建一个请假表单"
              @keydown.ctrl.enter="runTest"
            />
            <div v-if="needsFile" :class="styles.fileRow">
              <el-button size="small" @click="pickWorkflowTestFile().then((f) => (pendingFile = f))">
                <AppIcon name="upload" :size="14" style="margin-right: 4px" />
                {{ pendingFile ? pendingFile.name : '选择文件' }}
              </el-button>
              <span v-if="pendingFile" :class="styles.fileHint">已选择</span>
            </div>
            <div :class="styles.inputActions">
              <span :class="styles.hint">Ctrl + Enter 执行</span>
              <el-button type="primary" :loading="executing" @click="runTest">
                <AppIcon name="video-play" :size="14" style="margin-right: 4px" />
                执行
              </el-button>
            </div>
          </div>

          <!-- 测试历史 -->
          <div v-if="history.length" :class="styles.historyCard">
            <div :class="styles.historyHeader">
              <h3 :class="styles.cardTitle">测试历史</h3>
              <el-button link type="primary" size="small" @click="clearHistory">清空</el-button>
            </div>
            <div :class="styles.historyList}>
              <div
                v-for="(item, i) in history"
                :key="i"
                :class="styles.historyItem"
                @click="loadFromHistory(item)"
              >
                <div :class="styles.historyMessage">{{ item.message || '(文件测试)' }}</div>
                <div :class="styles.historyMeta">
                  <el-tag size="small" :type="NODE_STATUS_TAG_TYPE[item.status] ?? 'info'">
                    {{ NODE_STATUS_LABELS[item.status] ?? item.status }}
                  </el-tag>
                  <span :class="styles.historyTime">{{ item.timestamp.toLocaleTimeString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 执行轨迹区 -->
        <div :class="styles.rightCol">
          <div :class="styles.traceCard">
            <div :class="styles.traceHeader}>
              <h3 :class="styles.cardTitle">执行轨迹</h3>
              <el-tag
                v-if="execution"
                size="small"
                :type="NODE_STATUS_TAG_TYPE[execution.status] ?? 'info'"
              >
                {{ NODE_STATUS_LABELS[execution.status] ?? execution.status }}
              </el-tag>
            </div>

            <div v-if="!execution" :class="styles.empty">
              <AppIcon name="video-play" :size="36" :class="styles.emptyIcon" />
              <p>点击「执行」开始测试工作流</p>
            </div>

            <template v-else>
              <div :class="styles.traceBody">
                <div :class="styles.traceList}>
                  <NodeTraceList
                    :records="execution.nodeRecords"
                    :selected-node-id="selectedRecord?.nodeId"
                    @select="selectRecord"
                  />
                </div>
                <div :class="styles.traceDetail">
                  <div v-if="!selectedRecord" :class="styles.empty">选择节点查看输入输出</div>
                  <AgentNodeExecutionDetail
                    v-else
                    :record="selectedRecord"
                    :node-data="selectedNodeData"
                    :expanded="true"
                  />
                </div>
              </div>
              <div v-if="execution.error" :class="styles.errorBar">
                <AppIcon name="warning-filled" :size="14" />
                <span>{{ execution.error }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
