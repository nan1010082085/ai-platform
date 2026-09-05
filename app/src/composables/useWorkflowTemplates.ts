/**
 * useWorkflowTemplates - 工作流模板相关的状态和逻辑
 *
 * 合并内置 AGENT_WORKFLOW_TEMPLATES 与插件 Registry workflows（同 id 以插件为准）。
 */
import { ref, computed, type Ref } from 'vue'
import type {
  AgentWorkflowTemplateId,
  AgentWorkflowTemplateMeta,
  AgentWorkflowGraph,
} from '@/types/agentWorkflow'
import { AGENT_WORKFLOW_TEMPLATES } from '@/types/agentWorkflow'
import type { PluginWorkflowTemplateSummary } from '@/api/pluginApi'

/** @deprecated 优先读模板 meta.name / defaultName；保留作内置回退 */
export const TEMPLATE_DEFAULT_NAMES: Record<string, string> = Object.fromEntries(
  AGENT_WORKFLOW_TEMPLATES.map((t) => [t.id, t.name]),
)

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
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

/** @deprecated 优先读模板 icon 字段；保留作内置回退 */
export const TEMPLATE_ICONS: Record<string, string> = Object.fromEntries(
  AGENT_WORKFLOW_TEMPLATES.map((t) => [t.id, t.icon ?? 'document']),
)

export type WorkflowTemplateListItem = AgentWorkflowTemplateMeta & {
  /** 插件模板可携带完整 graph，供预览直渲 */
  graph?: AgentWorkflowGraph
  defaultName?: string
  source?: 'builtin' | 'plugin'
}

/**
 * 合并内置与插件模板列表（插件覆盖同 id）。
 */
export function mergeWorkflowTemplates(
  builtin: AgentWorkflowTemplateMeta[],
  plugin: PluginWorkflowTemplateSummary[],
): WorkflowTemplateListItem[] {
  const map = new Map<string, WorkflowTemplateListItem>()
  for (const tpl of builtin) {
    map.set(tpl.id, {
      ...tpl,
      source: 'builtin',
      defaultName: TEMPLATE_DEFAULT_NAMES[tpl.id] ?? tpl.name,
    })
  }
  for (const tpl of plugin) {
    map.set(tpl.id, {
      id: tpl.id as AgentWorkflowTemplateId,
      name: tpl.name,
      description: tpl.description,
      category: tpl.category as AgentWorkflowTemplateMeta['category'],
      icon: tpl.icon,
      tags: tpl.tags,
      defaultName: tpl.defaultName ?? tpl.name,
      graph: tpl.graph as AgentWorkflowGraph | undefined,
      source: 'plugin',
    })
  }
  return [...map.values()]
}

/**
 * 解析模板图标：meta.icon → 内置表 → 默认 document
 */
export function resolveTemplateIcon(tpl: { id: string; icon?: string }): string {
  return tpl.icon || TEMPLATE_ICONS[tpl.id] || 'document'
}

/**
 * 解析创建默认名
 */
export function resolveTemplateDefaultName(tpl: { id: string; name: string; defaultName?: string }): string {
  return tpl.defaultName || TEMPLATE_DEFAULT_NAMES[tpl.id] || tpl.name
}

export function useWorkflowTemplates(pluginWorkflows?: Ref<PluginWorkflowTemplateSummary[]>) {
  const mergedTemplates = computed(() =>
    mergeWorkflowTemplates(AGENT_WORKFLOW_TEMPLATES, pluginWorkflows?.value ?? []),
  )

  const workflowTemplates = computed(() => mergedTemplates.value)

  const systemTemplates = computed(() =>
    mergedTemplates.value.filter((tpl) => tpl.id !== 'blank'),
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

  function matchesTemplateSearch(tpl: WorkflowTemplateListItem, searchQuery: string): boolean {
    if (templateCategory.value !== 'all' && tpl.category !== templateCategory.value) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      tpl.name.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q)
    )
  }

  const filteredTemplates = ref<WorkflowTemplateListItem[]>([])

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
