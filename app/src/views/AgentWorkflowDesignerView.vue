<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import { useAgentWorkflowDesignerStore } from '@/stores/agentWorkflowDesigner'
import {
  validateAgentWorkflowGraph,
  type AgentWorkflowVersionEntry,
} from '@/types/agentWorkflow'
import AgentWorkflowToolbar from '@/components/agent-workflow/AgentWorkflowToolbar.vue'
import AgentWorkflowPalette from '@/components/agent-workflow/AgentWorkflowPalette.vue'
import AgentWorkflowCanvas from '@/components/agent-workflow/AgentWorkflowCanvas.vue'
import AgentWorkflowPropertyPanel from '@/components/agent-workflow/AgentWorkflowPropertyPanel.vue'
import * as api from '@/api/agentWorkflowApi'
import { useAiStore } from '@/stores/ai'
import {
  fileToWorkflowPayload,
  pickWorkflowTestFile,
  workflowGraphNeedsUploadStream,
} from '@/utils/workflowFilePayload'
import styles from './AgentWorkflowDesignerView.module.scss'

const route = useRoute()
const router = useRouter()
const store = useAgentWorkflowDesignerStore()
const aiStore = useAiStore()
const executing = ref(false)
const publishing = ref(false)
const showLeft = ref(true)
const showRight = ref(true)
const publishedVersion = ref<string | null>(null)
const hasRunningExecution = ref(false)
const versions = ref<AgentWorkflowVersionEntry[]>([])
const versionLoading = ref(false)

const workflowId = () => route.params.id as string

async function load() {
  const id = workflowId()
  if (!id || id === 'undefined') {
    message.error('无效的工作流 ID')
    router.replace({ name: 'agent-workflows' })
    return
  }
  try {
    const data = await api.getWorkflow(id)
    store.workflowId = data.id
    store.workflowName = data.name
    store.workflowDescription = data.description ?? ''
    store.workflowSlug = data.slug ?? ''
    store.onCompleteWebhookUrl = data.onCompleteWebhook?.url ?? ''
    store.onCompleteWebhookSecret = data.onCompleteWebhook?.secret ?? ''
    publishedVersion.value = data.publishedVersion
    hasRunningExecution.value = data.hasRunningExecution
    store.loadGraph(data.draftGraph)
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
    router.replace({ name: 'agent-workflows' })
  }
}

async function onSave(): Promise<boolean> {
  store.saving = true
  try {
    const graph = store.getGraph()
    const issues = validateAgentWorkflowGraph(graph)
    const errors = issues.filter((i) => i.level === 'error')
    if (errors.length) {
      message.error(errors[0].message)
      return false
    }
    await api.updateWorkflow(store.workflowId ?? workflowId(), {
      name: store.workflowName,
      description: store.workflowDescription,
      slug: store.workflowSlug.trim() || undefined,
      onCompleteWebhook: store.onCompleteWebhookUrl.trim()
        ? {
            url: store.onCompleteWebhookUrl.trim(),
            secret: store.onCompleteWebhookSecret.trim() || undefined,
          }
        : null,
      draftGraph: graph,
    })
    store.dirty = false
    ElMessage.success('已保存')
    return true
  } catch (e) {
    message.error(e instanceof Error ? e.message : '保存失败')
    return false
  } finally {
    store.saving = false
  }
}

async function onPublish() {
  publishing.value = true
  try {
    const saved = await onSave()
    if (!saved) return
    await ElMessageBox.confirm('发布后将生成新版本，用于生产执行。', '发布工作流')
    const res = await api.publishWorkflow(workflowId())
    publishedVersion.value = res.version
    aiStore.updateAgentWorkflowId(workflowId())
    ElMessage.success(`已发布 v${res.version}，已同步到对话中的 Agent 编排`)
    await loadVersions()
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') {
      message.error(e instanceof Error ? e.message : '发布失败')
    }
  } finally {
    publishing.value = false
  }
}

async function onExecute() {
  executing.value = true
  try {
    const saved = await onSave()
    if (!saved) return

    const graph = store.getGraph()
    const input: Record<string, unknown> = { message: '手动测试执行' }

    if (workflowGraphNeedsUploadStream(graph)) {
      const file = await pickWorkflowTestFile()
      if (!file) {
        message.warning('该工作流需要上传文件，已取消测试执行')
        return
      }
      input.file = await fileToWorkflowPayload(file)
    }

    const exec = await api.executeWorkflow(workflowId(), input)
    router.push({ name: 'agent-execution-detail', params: { id: exec.id } })
  } catch (e) {
    message.error(e instanceof Error ? e.message : '执行失败')
  } finally {
    executing.value = false
  }
}

function onValidate() {
  const issues = validateAgentWorkflowGraph(store.getGraph())
  if (!issues.length) {
    ElMessage.success('校验通过')
    return
  }
  const errors = issues.filter((i) => i.level === 'error')
  const text = issues.map((i) => i.message).join('；')
  if (errors.length) ElMessage.error(text)
  else ElMessage.warning(text)
}

function onExecutions() {
  router.push({ name: 'agent-workflow-executions', params: { id: workflowId() } })
}

function onChatTest() {
  if (!publishedVersion.value) {
    message.warning('请先发布工作流，再在对话中测试')
    return
  }
  aiStore.updateAgentWorkflowId(workflowId())
  router.push({ name: 'chat', query: { workflowId: workflowId() } })
}

function onDeleteSelection() {
  if (store.selectedEdgeId) {
    store.removeEdge(store.selectedEdgeId)
    return
  }
  if (store.selectedNodeId) {
    store.removeNode(store.selectedNodeId)
  }
}

async function loadVersions() {
  versionLoading.value = true
  try {
    versions.value = await api.listWorkflowVersions(workflowId())
  } catch {
    versions.value = []
  } finally {
    versionLoading.value = false
  }
}

function formatVersionTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', { hour12: false })
}

function formatVersion(v: string): string {
  if (!v || v.length !== 14) return v
  return `${v.slice(0, 8)} ${v.slice(8, 10)}:${v.slice(10, 12)}:${v.slice(12, 14)}`
}

function onTitleUpdate(title: string) {
  store.workflowName = title
  store.dirty = true
}

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    void onSave()
  }
}

onMounted(() => {
  void load()
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  store.reset()
})
</script>

<template>
  <div :class="styles.designer">
    <AgentWorkflowToolbar
      :title="store.workflowName"
      :dirty="store.dirty"
      :saving="store.saving"
      :publishing="publishing"
      :executing="executing"
      :published-version="publishedVersion"
      :show-left-panel="showLeft"
      :show-right-panel="showRight"
      :selected-node-id="store.selectedNodeId"
      :selected-edge-id="store.selectedEdgeId"
      :has-running-execution="hasRunningExecution"
      :edge-line-style="store.edgeLineStyle"
      @update:title="onTitleUpdate"
      @save="onSave"
      @publish="onPublish"
      @execute="onExecute"
      @validate="onValidate"
      @executions="onExecutions"
      @chat-test="onChatTest"
      @delete-selection="onDeleteSelection"
      @update:edge-line-style="store.setEdgeLineStyle"
      @version-history="loadVersions"
      @toggle-left-panel="showLeft = !showLeft"
      @toggle-right-panel="showRight = !showRight"
    >
      <template #version-popover>
        <div :class="styles.versionPanel">
          <div :class="styles.versionHeader">
            <span :class="styles.versionTitle">版本历史</span>
            <el-button size="small" text @click="loadVersions">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
          <div v-if="versionLoading" :class="styles.versionLoading">加载中...</div>
          <div v-else-if="versions.length === 0" :class="styles.versionEmpty">暂无版本记录</div>
          <div v-else :class="styles.versionList">
            <div
              v-for="entry in versions"
              :key="entry.version"
              :class="[
                styles.versionItem,
                { [styles.versionItemCurrent]: entry.current },
              ]"
            >
              <div :class="styles.versionInfo">
                <span :class="styles.versionTime">v{{ formatVersion(entry.version) }}</span>
                <span :class="styles.versionMeta">{{ formatVersionTime(entry.createdAt) }}</span>
                <el-tag v-if="entry.published" size="small" type="success">已发布</el-tag>
                <el-tag v-else-if="entry.current" size="small">当前</el-tag>
              </div>
            </div>
          </div>
        </div>
      </template>
    </AgentWorkflowToolbar>

    <div :class="styles.body">
      <div :class="[styles.drawer, styles.drawerLeft, { [styles.drawerClosed]: !showLeft }]">
        <AgentWorkflowPalette />
      </div>
      <AgentWorkflowCanvas :disable-delete="executing || hasRunningExecution" />
      <div :class="[styles.drawer, styles.drawerRight, { [styles.drawerClosed]: !showRight }]">
        <AgentWorkflowPropertyPanel />
      </div>
    </div>
  </div>
</template>
