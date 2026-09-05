<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
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
import { createTemplate } from '@/api/aiApi/workflowTemplate'
import { useAiStore } from '@/stores/ai'
import { useWorkflowSelfTest } from '@/composables/useWorkflowSelfTest'
import { validateObjectId } from '@/utils/objectId'
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

// ── 自测 ──
const {
  testing: selfTesting,
  currentResult: selfTestResult,
  validateGraph,
  prePublishCheck,
  dryRun,
  validateAndPublish,
} = useWorkflowSelfTest()

const showSelfTestDialog = ref(false)
const dryRunMessage = ref('')
const dryRunResult = ref<string | null>(null)

const workflowId = () => route.params.id as string

async function load() {
  const id = workflowId()
  const validation = validateObjectId(id, '工作流 ID')
  if (!validation.valid) {
    message.error(validation.error)
    router.replace({ name: 'agent-workflows' })
    return
  }
  try {
    const data = await api.getWorkflow(validation.id)
    store.workflowId = data.id
    store.workflowName = data.name
    store.workflowDescription = data.description ?? ''
    store.workflowSlug = data.slug ?? ''
    store.workflowRoutingKeywords = data.routingKeywords ?? []
    store.onCompleteWebhookUrl = data.onCompleteWebhook?.url ?? ''
    store.onCompleteWebhookSecret = data.onCompleteWebhook?.secret ?? ''
    store.invokeKeyMasked = data.invokeKeyMasked ?? ''
    store.invokePath = data.invokePath ?? ''
    store.invokeKeyPlain = ''
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
    const fanInWarn = issues.find(
      (i) => i.level === 'warning' && i.message.includes('请使用「合流」'),
    )
    if (fanInWarn) {
      message.warning(fanInWarn.message)
    }
    const id = store.workflowId ?? workflowId()
    const validation = validateObjectId(id, '工作流 ID')
    if (!validation.valid) {
      message.error(validation.error)
      return false
    }
    await api.updateWorkflow(validation.id, {
      name: store.workflowName,
      description: store.workflowDescription,
      slug: store.workflowSlug.trim() || undefined,
      routingKeywords: store.workflowRoutingKeywords,
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

/**
 * 将当前草稿图另存为用户模板（写入 workflow-templates）。
 */
async function onSaveAsTemplate(): Promise<void> {
  const graph = store.getGraph()
  const issues = validateAgentWorkflowGraph(graph)
  const errors = issues.filter((i) => i.level === 'error')
  if (errors.length) {
    message.error(errors[0].message)
    return
  }
  try {
    const { value } = await ElMessageBox.prompt('模板显示名称', '另存为模板', {
      inputValue: `${store.workflowName || '未命名'}（模板）`,
      confirmButtonText: '保存',
      cancelButtonText: '取消',
    })
    const name = String(value ?? '').trim()
    if (!name) return
    const slug = `user-${Date.now().toString(36)}`
    await createTemplate({
      templateId: slug,
      name,
      description: store.workflowDescription || '',
      category: 'general',
      graph: graph as unknown as Record<string, unknown>,
    })
    ElMessage.success('已另存为模板，可在模板管理中查看')
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    message.error(e instanceof Error ? e.message : '另存为模板失败')
  }
}

async function onPublish() {
  publishing.value = true
  try {
    const saved = await onSave()
    if (!saved) return
    await ElMessageBox.confirm('发布后将生成新版本，用于生产执行。', '发布工作流')
    const id = workflowId()
    const validation = validateObjectId(id, '工作流 ID')
    if (!validation.valid) {
      message.error(validation.error)
      return
    }
    // 使用 validateAndPublish：先预发布验证，通过后自动发布
    const ok = await validateAndPublish(validation.id)
    if (ok) {
      const res = await api.getWorkflow(validation.id)
      publishedVersion.value = res.publishedVersion
      if (res.slug) store.workflowSlug = res.slug
      if (res.invokeKeyMasked) store.invokeKeyMasked = res.invokeKeyMasked
      if (res.invokePath) store.invokePath = res.invokePath
      aiStore.updateAgentWorkflowId(validation.id)
      ElMessage.success(`已发布 v${res.publishedVersion}，已同步到对话中的工作流`)
      await loadVersions()
    }
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') {
      message.error(e instanceof Error ? e.message : '发布失败')
    }
  } finally {
    publishing.value = false
  }
}

async function onDebug() {
  executing.value = true
  try {
    const saved = await onSave()
    if (!saved) return
    router.push({ name: 'workflow-debug', params: { id: workflowId() } })
  } catch (e) {
    message.error(e instanceof Error ? e.message : '跳转调试失败')
  } finally {
    executing.value = false
  }
}

function onValidate() {
  const result = validateGraph(store.getGraph())
  if (result.passed) {
    ElMessage.success('校验通过')
    return
  }
  const errors = result.issues.filter((i) => i.severity === 'error')
  const text = result.issues.map((i) => `${i.severity === 'error' ? '❌' : '⚠️'} ${i.message}`).join('\n')
  if (errors.length) ElMessage.error({ message: text, duration: 5000 })
  else ElMessage.warning({ message: text, duration: 5000 })
}

async function onDryRun() {
  showSelfTestDialog.value = true
  dryRunResult.value = null
}

async function executeDryRun() {
  const id = workflowId()
  const validation = validateObjectId(id, '工作流 ID')
  if (!validation.valid) {
    message.error(validation.error)
    return
  }
  const saved = await onSave()
  if (!saved) return
  const result = await dryRun(validation.id, dryRunMessage.value || '你好')
  dryRunResult.value = result.message
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

const versionsLoadError = ref<string | null>(null)

async function loadVersions() {
  versionLoading.value = true
  versionsLoadError.value = null
  try {
    versions.value = await api.listWorkflowVersions(workflowId())
  } catch (e) {
    versions.value = []
    versionsLoadError.value = e instanceof Error ? e.message : '加载版本历史失败'
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
      @save-as-template="onSaveAsTemplate"
      @publish="onPublish"
      @debug="onDebug"
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
              <AppIcon name="refresh" :size="14" />
            </el-button>
          </div>
          <div v-if="versionLoading" :class="styles.versionLoading">加载中...</div>
          <div v-else-if="versionsLoadError" :class="styles.versionEmpty">{{ versionsLoadError }}</div>
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

    <!-- 试运行对话框 -->
    <el-dialog v-model="showSelfTestDialog" title="试运行 (Dry Run)" width="500px">
      <el-input
        v-model="dryRunMessage"
        type="textarea"
        :rows="3"
        placeholder="输入测试消息（默认：你好）"
      />
      <div v-if="dryRunResult" style="margin-top: 12px;">
        <el-alert
          :type="dryRunResult.includes('成功') ? 'success' : 'warning'"
          :title="dryRunResult"
          :closable="false"
          show-icon
        />
      </div>
      <template #footer>
        <el-button @click="showSelfTestDialog = false">关闭</el-button>
        <el-button type="primary" :loading="selfTesting" @click="executeDryRun">
          <AppIcon name="video-play" :size="14" />
          执行试运行
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
