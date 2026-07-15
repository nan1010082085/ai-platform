<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import FilterTabs from '@schema-platform/platform-shared/components/common/FilterTabs.vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import type {
  AgentWorkflowSummary,
  AgentWorkflowTemplateId,
  AgentWorkflowTemplateMeta,
} from '@/types/agentWorkflow'
import { AGENT_WORKFLOW_TEMPLATES } from '@/types/agentWorkflow'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import AgentWorkflowTemplatePreviewDialog from '@/components/agent-workflow/AgentWorkflowTemplatePreviewDialog.vue'
import WorkflowInvokeInfo from '@/components/WorkflowInvokeInfo.vue'
import * as api from '@/api/agentWorkflowApi'
import styles from './AgentWorkflowListView.module.scss'

const router = useRouter()
const loading = ref(false)
const workflows = ref<AgentWorkflowSummary[]>([])
const searchInput = ref('')
const activeTab = ref<ListTab>('all')
const sortBy = ref<'updated' | 'name'>('updated')
const publishingId = ref<string | null>(null)
const createDialogVisible = ref(false)
const createName = ref('')
const selectedTemplateId = ref<AgentWorkflowTemplateId>('blank')
const creating = ref(false)
const previewVisible = ref(false)
const previewTemplate = ref<AgentWorkflowTemplateMeta | null>(null)
const tryingTemplateId = ref<AgentWorkflowTemplateId | null>(null)
const expandedInvokeId = ref<string | null>(null)

const workflowTemplates = AGENT_WORKFLOW_TEMPLATES

const TEMPLATE_DEFAULT_NAMES: Record<AgentWorkflowTemplateId, string> = {
  blank: '我的工作流',
  'document-summary': '文档摘要编排',
  'doc-image-recognition': '文档图片识别',
  'intelligent-assistant': '智能助手问答',
  'contract-extract': '合同条款提取',
  'kb-faq': '知识库 FAQ 生成',
  'http-notify': 'HTTP 回调通知',
  'rag-ingest-qa': 'RAG 入库质检',
  'multi-doc-batch': '多文档批量处理',
  'smart-suggestions': '智能建议',
  'smart-action-proposals': '智能拟办',
  'image-text-generation': '图文生成',
  'ppt-generation': 'PPT 生成',
  'image-analysis': '图片智能分析',
  'chat-parity-assistant': '聊天对等助手',
  'requirement-gated-build': '需求门控构建',
}

type ListTab = 'all' | 'draft' | 'published' | 'templates'

const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '模板', value: 'templates' },
]

const TEMPLATE_ICONS: Record<AgentWorkflowTemplateId, string> = {
  blank: 'set-up',
  'document-summary': 'document',
  'doc-image-recognition': 'picture',
  'intelligent-assistant': 'chat-dot-round',
  'contract-extract': 'document-checked',
  'kb-faq': 'notebook',
  'http-notify': 'bell',
  'rag-ingest-qa': 'search',
  'multi-doc-batch': 'files',
  'smart-suggestions': 'magic-stick',
  'smart-action-proposals': 'finished',
  'image-text-generation': 'picture-outline',
  'ppt-generation': 'data-board',
  'image-analysis': 'view',
  'chat-parity-assistant': 'chat-line-round',
  'requirement-gated-build': 'key',
}

const TEMPLATE_CATEGORY_LABELS: Record<AgentWorkflowTemplateMeta['category'], string> = {
  general: '通用',
  document: '文档',
  assistant: '助手',
  integration: '集成',
  batch: '批处理',
}

const sortOptions = [
  { label: '最近更新', value: 'updated' },
  { label: '名称', value: 'name' },
]

async function load() {
  loading.value = true
  try {
    workflows.value = await api.listWorkflows()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function matchesSearch(w: AgentWorkflowSummary): boolean {
  const q = searchInput.value.trim().toLowerCase()
  if (!q) return true
  return w.name.toLowerCase().includes(q)
}

const isTemplatesTab = computed(() => activeTab.value === 'templates')

const systemTemplates = computed(() =>
  workflowTemplates.filter((tpl) => tpl.id !== 'blank'),
)

function matchesTemplateSearch(tpl: AgentWorkflowTemplateMeta): boolean {
  const q = searchInput.value.trim().toLowerCase()
  if (!q) return true
  return (
    tpl.name.toLowerCase().includes(q) ||
    tpl.description.toLowerCase().includes(q) ||
    TEMPLATE_CATEGORY_LABELS[tpl.category].includes(q)
  )
}

const filteredTemplates = computed(() =>
  systemTemplates.value.filter(matchesTemplateSearch),
)

const filteredWorkflows = computed(() => {
  let list = workflows.value
  if (activeTab.value !== 'all' && activeTab.value !== 'templates') {
    list = list.filter((w) => w.status === activeTab.value)
  }
  list = list.filter(matchesSearch)
  if (sortBy.value === 'name') {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'zh'))
  } else {
    list = [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }
  return list
})

const isEmpty = computed(
  () => !loading.value && !isTemplatesTab.value && workflows.value.length === 0,
)
const isNoResults = computed(() => {
  if (loading.value) return false
  if (isTemplatesTab.value) return filteredTemplates.value.length === 0
  return workflows.value.length > 0 && filteredWorkflows.value.length === 0
})

async function onCreate() {
  selectedTemplateId.value = 'blank'
  createName.value = TEMPLATE_DEFAULT_NAMES.blank
  createDialogVisible.value = true
}

function onTemplateSelect(id: AgentWorkflowTemplateId) {
  selectedTemplateId.value = id
  createName.value = TEMPLATE_DEFAULT_NAMES[id]
}

function onUseTemplate(id: AgentWorkflowTemplateId) {
  onTemplateSelect(id)
  createDialogVisible.value = true
}

function onPreviewTemplate(tpl: AgentWorkflowTemplateMeta) {
  previewTemplate.value = tpl
  previewVisible.value = true
}

function onPreviewUse(id: AgentWorkflowTemplateId) {
  onUseTemplate(id)
}

async function onTryTemplate(templateId: AgentWorkflowTemplateId) {
  if (tryingTemplateId.value) return
  tryingTemplateId.value = templateId
  try {
    const tpl = workflowTemplates.find((t) => t.id === templateId)
    const name = `试用-${TEMPLATE_DEFAULT_NAMES[templateId]}`
    const wf = await api.createWorkflow(name, tpl?.description ?? '', templateId)
    // 导航到对话页面并设置 workflowId
    router.push({ name: 'chat', query: { workflowId: wf.id } })
  } catch (e) {
    message.error(e instanceof Error ? e.message : '创建试用工作流失败')
  } finally {
    tryingTemplateId.value = null
  }
}

function onBrowseTemplates() {
  activeTab.value = 'templates'
}

async function confirmCreate() {
  const name = createName.value.trim()
  if (!name) {
    message.warning('请输入工作流名称')
    return
  }
  creating.value = true
  try {
    const tpl = workflowTemplates.find((t) => t.id === selectedTemplateId.value)
    const wf = await api.createWorkflow(
      name,
      tpl?.description ?? '',
      selectedTemplateId.value,
    )
    createDialogVisible.value = false
    router.push({ name: 'agent-workflow-designer', params: { id: wf.id } })
  } catch (e) {
    message.error(e instanceof Error ? e.message : '创建失败')
  } finally {
    creating.value = false
  }
}

function onEdit(id: string) {
  router.push({ name: 'agent-workflow-designer', params: { id } })
}

function onExecutions(id: string) {
  router.push({ name: 'agent-workflow-executions', params: { id } })
}

async function onPublish(id: string) {
  publishingId.value = id
  try {
    const res = await api.publishWorkflow(id)
    ElMessage.success(`已发布 v${res.version}`)
    await load()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '发布失败')
  } finally {
    publishingId.value = null
  }
}

async function onDelete(id: string) {
  try {
    await ElMessageBox.confirm('确定删除此工作流？删除后不可恢复。', '删除', { type: 'warning' })
  } catch {
    return
  }
  try {
    await api.deleteWorkflow(id)
    ElMessage.success('已删除')
    await load()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '删除失败')
  }
}

function toggleInvokeInfo(id: string): void {
  expandedInvokeId.value = expandedInvokeId.value === id ? null : id
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatVersion(v: string): string {
  if (!v || v.length !== 14) return v
  return `${v.slice(0, 8)}.${v.slice(8, 10)}${v.slice(10, 12)}`
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
            <h1>Agent 编排</h1>
            <p :class="styles.subtitle">可视化编排 AI 工作流</p>
          </div>
          <div :class="styles.headerActions">
            <el-button type="primary" @click="onCreate">
              <AppIcon name="plus" class="el-icon--left" :size="14" />新建
            </el-button>
          </div>
        </div>

        <!-- Filter bar -->
        <div :class="styles.toolbar">
          <FilterTabs v-model="activeTab" :options="filterTabs" />
          <div :class="styles.toolbarRight">
            <el-input
              v-model="searchInput"
              placeholder="搜索名称..."
              clearable
              :class="styles.search"
            >
              <template #prefix><AppIcon name="search" :size="14" /></template>
            </el-input>
            <el-dropdown
              v-if="!isTemplatesTab"
              @command="(cmd: string) => (sortBy = cmd as 'updated' | 'name')"
            >
              <el-button size="small">
                <AppIcon name="sort" class="el-icon--left" :size="14" />
                {{ sortOptions.find((s) => s.value === sortBy)?.label }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="s in sortOptions"
                    :key="s.value"
                    :command="s.value"
                  >
                    {{ s.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading && workflows.length === 0 && !isTemplatesTab" :class="styles.content">
        <div :class="styles.skeleton">
          <div v-for="i in 6" :key="i" :class="styles.skeletonCard">
            <div :class="styles.skeletonPreview" />
            <div :class="styles.skeletonTitle" />
            <div :class="styles.skeletonText" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="isEmpty" :class="styles.emptyState">
        <div :class="styles.emptyIcon">
          <AppIcon name="set-up" :size="64" />
        </div>
        <h2 :class="styles.emptyTitle">还没有 Agent 工作流</h2>
        <p :class="styles.emptyDesc">创建您的第一个工作流来开始编排 AI 节点</p>
        <div :class="styles.emptyActions">
          <el-button type="primary" size="large" @click="onBrowseTemplates">
            <AppIcon name="magic-stick" class="el-icon--left" :size="14" />浏览模板
          </el-button>
          <el-button size="large" @click="onCreate">
            <AppIcon name="plus" class="el-icon--left" :size="14" />空白工作流
          </el-button>
        </div>
      </div>

      <!-- Template library -->
      <div v-else-if="isTemplatesTab" :class="styles.content">
        <p :class="styles.templatesIntro">
          系统内置编排模板，选择后可一键创建到您的工作流列表，再编辑、发布与执行。
        </p>
        <div v-if="filteredTemplates.length === 0" :class="styles.noResults">
          <p>未找到匹配的模板</p>
          <el-button @click="searchInput = ''">清除搜索</el-button>
        </div>
        <div v-else :class="styles.templateCards">
          <div
            v-for="(tpl, idx) in filteredTemplates"
            :key="tpl.id"
            :class="styles.templateListCard"
            :style="{ animationDelay: `${idx * 0.04}s` }"
          >
            <div :class="styles.templateListPreview">
              <AppIcon :name="TEMPLATE_ICONS[tpl.id]" :size="36" />
            </div>
            <div :class="styles.templateListBody">
              <div :class="styles.templateListHead">
                <h3 :class="styles.templateListName">{{ tpl.name }}</h3>
                <el-tag size="small" type="info">
                  {{ TEMPLATE_CATEGORY_LABELS[tpl.category] }}
                </el-tag>
              </div>
              <p :class="styles.templateListDesc">{{ tpl.description }}</p>
            </div>
            <div :class="styles.templateListActions">
              <el-tooltip content="预览" placement="top" :show-after="300">
                <el-button size="small" text @click="onPreviewTemplate(tpl)">
                  <AppIcon name="view" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="使用此模板" placement="top" :show-after="300">
                <el-button size="small" text type="primary" @click="onUseTemplate(tpl.id)">
                  <AppIcon name="plus" />
                </el-button>
              </el-tooltip>
              <el-tooltip
                v-if="tpl.category === 'assistant' || tpl.category === 'document'"
                :content="tpl.category === 'assistant' ? '试用' : '在对话中体验'"
                placement="top"
                :show-after="300"
              >
                <el-button
                  size="small"
                  text
                  type="success"
                  :loading="tryingTemplateId === tpl.id"
                  @click="onTryTemplate(tpl.id)"
                >
                  <AppIcon name="chat-dot-round" />
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>

      <!-- No results -->
      <div v-else-if="isNoResults" :class="styles.noResults">
        <p>未找到匹配的工作流</p>
        <el-button @click="activeTab = 'all'; searchInput = ''">清除筛选</el-button>
      </div>

      <!-- Card grid -->
      <div v-else :class="styles.content">
        <div :class="styles.cards">
          <div
            v-for="(item, idx) in filteredWorkflows"
            :key="item.id"
            :class="styles.card"
            :style="{ animationDelay: `${idx * 0.04}s` }"
          >
            <div :class="styles.cardPreview" @click="onEdit(item.id)">
              <div :class="styles.cardPreviewInner">
                <AppIcon name="share" :size="32" />
              </div>
            </div>
            <div :class="styles.cardBody">
              <h3 :class="styles.cardName">{{ item.name }}</h3>
              <div :class="styles.cardMeta">
                <el-tag size="small" :type="item.status === 'published' ? 'success' : 'info'">
                  {{ item.status === 'published' ? '已发布' : '草稿' }}
                </el-tag>
                <span v-if="item.publishedVersion" :class="styles.cardVersion">
                  v{{ formatVersion(item.publishedVersion) }}
                </span>
                <span :class="styles.cardDate">{{ formatDate(item.updatedAt) }}</span>
              </div>
            </div>
            <div :class="styles.cardActions">
              <el-tooltip content="编辑" placement="top" :show-after="300">
                <el-button size="small" text type="primary" @click="onEdit(item.id)">
                  <AppIcon name="edit" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="执行记录" placement="top" :show-after="300">
                <el-button size="small" text @click="onExecutions(item.id)">
                  <AppIcon name="list" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="发布" placement="top" :show-after="300">
                <el-button
                  size="small"
                  text
                  type="success"
                  :loading="publishingId === item.id"
                  :disabled="publishingId !== null"
                  @click="onPublish(item.id)"
                >
                  <AppIcon name="promotion" />
                </el-button>
              </el-tooltip>
              <el-tooltip
                v-if="item.status === 'published'"
                :content="expandedInvokeId === item.id ? '收起调用信息' : '调用信息'"
                placement="top"
                :show-after="300"
              >
                <el-button
                  size="small"
                  text
                  :type="expandedInvokeId === item.id ? 'primary' : undefined"
                  @click="toggleInvokeInfo(item.id)"
                >
                  <AppIcon name="key" />
                </el-button>
              </el-tooltip>
              <el-tooltip
                :content="item.hasRunningExecution ? '执行中，不允许删除' : '删除'"
                placement="top"
                :show-after="300"
              >
                <span>
                  <el-button
                    size="small"
                    text
                    type="danger"
                    :disabled="item.hasRunningExecution"
                    @click="onDelete(item.id)"
                  >
                    <AppIcon name="delete" />
                  </el-button>
                </span>
              </el-tooltip>
            </div>
            <WorkflowInvokeInfo
              v-if="item.status === 'published' && expandedInvokeId === item.id"
              :workflow-id="item.id"
              :workflow-slug="item.slug"
            />
          </div>
        </div>
      </div>
    </div>

    <AppDialog
      v-model="createDialogVisible"
      title="新建 Agent 工作流"
      width="640px"
      :show-fullscreen-btn="false"
    >
      <div :class="styles.createForm">
        <label :class="styles.createLabel">名称</label>
        <el-input v-model="createName" placeholder="工作流名称" maxlength="64" />
      </div>
      <div :class="styles.createForm">
        <label :class="styles.createLabel">选择模板</label>
        <div :class="styles.templateGrid">
          <button
            v-for="tpl in workflowTemplates"
            :key="tpl.id"
            type="button"
            :class="[
              styles.templateCard,
              selectedTemplateId === tpl.id && styles.templateCardActive,
            ]"
            @click="onTemplateSelect(tpl.id)"
          >
            <span :class="styles.templateName">{{ tpl.name }}</span>
            <span :class="styles.templateDesc">{{ tpl.description }}</span>
          </button>
        </div>
      </div>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="confirmCreate">创建</el-button>
      </template>
    </AppDialog>

    <AgentWorkflowTemplatePreviewDialog
      v-model="previewVisible"
      :template="previewTemplate"
      @use="onPreviewUse"
    />
  </div>
</template>
