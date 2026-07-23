/**
 * useWorkflowTemplates - 工作流模板相关的状态和逻辑
 *
 * 从 AgentWorkflowListView.vue 提取，减少主文件行数。
 */
import { ref, computed } from 'vue'
import type {
  AgentWorkflowTemplateId,
  AgentWorkflowTemplateMeta,
} from '@/types/agentWorkflow'
import { AGENT_WORKFLOW_TEMPLATES } from '@/types/agentWorkflow'

export const TEMPLATE_DEFAULT_NAMES: Record<AgentWorkflowTemplateId, string> = {
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
  'cs-ticket-triage': '客服工单智能分流',
  'cs-kb-reply': '客服知识库回复',
  'cs-sentiment-escalate': '情绪检测与升级',
}

export const TEMPLATE_ICONS: Record<AgentWorkflowTemplateId, string> = {
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
  'cs-ticket-triage': 'message',
  'cs-kb-reply': 'chat-dot-round',
  'cs-sentiment-escalate': 'warning',
}

export const TEMPLATE_CATEGORY_LABELS: Record<AgentWorkflowTemplateMeta['category'], string> = {
  general: '通用',
  document: '文档',
  assistant: '助手',
  integration: '集成',
  batch: '批处理',
  'customer-service': '客服',
}

export function useWorkflowTemplates() {
  const workflowTemplates = AGENT_WORKFLOW_TEMPLATES

  const systemTemplates = computed(() =>
    workflowTemplates.filter((tpl) => tpl.id !== 'blank'),
  )

  const templateCategory = ref<'all' | AgentWorkflowTemplateMeta['category']>('all')

  const templateCategoryOptions = computed(() => {
    const counts = new Map<string, number>()
    for (const tpl of systemTemplates.value) {
      counts.set(tpl.category, (counts.get(tpl.category) ?? 0) + 1)
    }
    const opts: Array<{ value: string; label: string }> = [{ value: 'all', label: '全部' }]
    for (const [cat, label] of Object.entries(TEMPLATE_CATEGORY_LABELS)) {
      if (counts.has(cat)) opts.push({ value: cat, label: `${label} (${counts.get(cat)})` })
    }
    return opts
  })

  function matchesTemplateSearch(tpl: AgentWorkflowTemplateMeta, searchQuery: string): boolean {
    if (templateCategory.value !== 'all' && tpl.category !== templateCategory.value) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      tpl.name.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q)
    )
  }

  const filteredTemplates = ref<AgentWorkflowTemplateMeta[]>([])

  function updateFilteredTemplates(searchQuery: string) {
    filteredTemplates.value = systemTemplates.value.filter((tpl) =>
      matchesTemplateSearch(tpl, searchQuery),
    )
  }

  return {
    workflowTemplates,
    systemTemplates,
    templateCategory,
    templateCategoryOptions,
    filteredTemplates,
    updateFilteredTemplates,
    matchesTemplateSearch,
  }
}
