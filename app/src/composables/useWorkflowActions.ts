/**
 * useWorkflowActions - 工作流操作相关的状态和逻辑
 *
 * 从 AgentWorkflowListView.vue 提取，减少主文件行数。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from '@schema-platform/platform-shared/utils/message'
import { trackAi, AI_TELEMETRY_EVENTS } from '@/utils/telemetry'
import type {
  AgentWorkflowSummary,
  AgentWorkflowTemplateId,
  AgentWorkflowTemplateMeta,
} from '@/types/agentWorkflow'
import * as api from '@/api/agentWorkflowApi'
import { TEMPLATE_DEFAULT_NAMES } from './useWorkflowTemplates'

export function useWorkflowActions() {
  const router = useRouter()
  const loading = ref(false)
  const workflows = ref<AgentWorkflowSummary[]>([])
  const publishingId = ref<string | null>(null)
  const createDialogVisible = ref(false)
  const createName = ref('')
  const selectedTemplateId = ref<AgentWorkflowTemplateId>('blank')
  const creating = ref(false)
  const previewVisible = ref(false)
  const previewTemplate = ref<AgentWorkflowTemplateMeta | null>(null)
  const tryingTemplateId = ref<AgentWorkflowTemplateId | null>(null)
  const expandedInvokeId = ref<string | null>(null)

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

  function onCreate() {
    selectedTemplateId.value = 'blank'
    createName.value = TEMPLATE_DEFAULT_NAMES.blank
    createDialogVisible.value = true
  }

  function onTemplateSelect(id: AgentWorkflowTemplateId) {
    trackAi(AI_TELEMETRY_EVENTS.TEMPLATE_SELECT, { templateId: id })
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
      const name = `试用-${TEMPLATE_DEFAULT_NAMES[templateId]}`
      const wf = await api.createWorkflow(name, '', templateId)
      await api.publishWorkflow(wf.id)
      router.push({ name: 'chat', query: { workflowId: wf.id } })
    } catch (e) {
      message.error(e instanceof Error ? e.message : '创建试用工作流失败')
    } finally {
      tryingTemplateId.value = null
    }
  }

  function onBrowseTemplates(activeTab: { value: string }) {
    activeTab.value = 'templates'
  }

  async function onExport(id: string) {
    try {
      await api.exportWorkflow(id)
      trackAi(AI_TELEMETRY_EVENTS.WORKFLOW_EXPORT, { workflowId: id })
      message.success('已导出')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '导出失败')
    }
  }

  async function onImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const result = await api.importWorkflow(file)
        trackAi(AI_TELEMETRY_EVENTS.WORKFLOW_IMPORT, { workflowId: result.id, name: result.name })
        message.success(`已导入「${result.name}」`)
        await load()
      } catch (e) {
        message.error(e instanceof Error ? e.message : '导入失败，请检查文件格式')
      }
    }
    input.click()
  }

  async function confirmCreate(workflowTemplates: AgentWorkflowTemplateMeta[]) {
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

  async function onDelete(wf: AgentWorkflowSummary) {
    try {
      await api.deleteWorkflow(wf.id)
      message.success('已删除')
      await load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  async function onPublish(wf: AgentWorkflowSummary) {
    publishingId.value = wf.id
    try {
      await api.publishWorkflow(wf.id)
      message.success('已发布')
      await load()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '发布失败')
    } finally {
      publishingId.value = null
    }
  }

  return {
    loading,
    workflows,
    publishingId,
    createDialogVisible,
    createName,
    selectedTemplateId,
    creating,
    previewVisible,
    previewTemplate,
    tryingTemplateId,
    expandedInvokeId,
    load,
    onCreate,
    onTemplateSelect,
    onUseTemplate,
    onPreviewTemplate,
    onPreviewUse,
    onTryTemplate,
    onBrowseTemplates,
    onExport,
    onImport,
    confirmCreate,
    onEdit,
    onDelete,
    onPublish,
  }
}
