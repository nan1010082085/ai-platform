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
  'blank': '空白工作流',
  'document-summary': '文档摘要',
  'doc-image-recognition': '文档 / 图片识别',
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
  'chat-parity-assistant': '智能助手 v2',
  'requirement-gated-build': '需求门控构建',
  'cs-ticket-triage': '客服工单智能分流',
  'cs-kb-reply': '客服知识库回复',
  'cs-sentiment-escalate': '情绪检测与升级',
  'excel-report': 'Excel 报表洞察',
  'multi-doc-compare': '多文档对比',
  'structured-extract': '结构化字段提取',
  'webhook-batch-dispatch': '批量任务分发',
  'content-compliance': '内容合规审查',
  'contract-risk-tag': '合同风险标注',
  'faq-quality-check': 'FAQ 质检',
  'multimodal-image-text': '图文批量生成',
  'multimodal-video-promo': '视频营销生成',
  'resume-screening': '简历筛选',
  'expense-audit': '报销单审核',
  'feedback-analysis': '客户反馈分析',
  'memory-assistant': '记忆增强助手',
  'medical-record-extract': '病历结构化提取',
  'education-homework-grading': '作业批改',
  'manufacturing-quality-report': '质检报告生成',
  'legal-case-summary': '案件摘要提取',
  'government-petition-classify': '政务诉求分类',
  'retail-inventory-forecast': '库存补货预测',
  'finance-loan-review': '贷款风险评估',
  'energy-consumption-report': '能耗分析报告',
  'vote-decision': '团队投票决策',
  'multimodal-llm-analyze': '多模态图文分析',
  'smart-form-search': '智能表单检索',
  'scheduled-report': '定时数据报告',
  'code-execute-demo': '代码执行演示',
  'switch-demo': '条件分支演示',
  'parallel-team-demo': '并行团队分析',
  'dashboard-assist': 'Dashboard Assist',
  'handoff-demo': '会话交接演示',
  'form-query-demo': '表单查询演示',
}


export const TEMPLATE_CATEGORY_LABELS: Record<AgentWorkflowTemplateMeta['category'], string> = {
  general: '通用',
  document: '文档',
  assistant: '助手',
  integration: '集成',
  batch: '批处理',
  'customer-service': '客服',
  audit: '审计',
  hr: 'HR',
  finance: '财务',
  operations: '运营',
  medical: '医疗',
  education: '教育',
  manufacturing: '制造',
  legal: '法律',
  government: '政务',
  retail: '零售',
  energy: '能源',
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
}export const TEMPLATE_ICONS: Record<AgentWorkflowTemplateId, string> = {
  'blank': 'set-up',
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
  'excel-report': 'data-line',
  'multi-doc-compare': 'document',
  'structured-extract': 'edit',
  'webhook-batch-dispatch': 'connection',
  'content-compliance': 'warning-filled',
  'contract-risk-tag': 'warning',
  'faq-quality-check': 'circle-check',
  'multimodal-image-text': 'picture',
  'multimodal-video-promo': 'video-camera',
  'resume-screening': 'user',
  'expense-audit': 'credit-card',
  'feedback-analysis': 'chat-line-round',
  'memory-assistant': 'data-board',
  'medical-record-extract': 'document',
  'education-homework-grading': 'edit',
  'manufacturing-quality-report': 'data-analysis',
  'legal-case-summary': 'document-checked',
  'government-petition-classify': 'message',
  'retail-inventory-forecast': 'data-line',
  'finance-loan-review': 'credit-card',
  'energy-consumption-report': 'data-line',
  'vote-decision': 'circle-check',
  'multimodal-llm-analyze': 'view',
  'smart-form-search': 'search',
  'scheduled-report': 'alarm-clock',
  'code-execute-demo': 'document',
  'switch-demo': 'share',
  'parallel-team-demo': 'user',
  'dashboard-assist': 'data-board',
  'handoff-demo': 'switch',
  'form-query-demo': 'search',
}
