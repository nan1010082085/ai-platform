/**
 * Workflow Template API - 工作流模板管理
 *
 * 对接 server /api/ai/workflow-templates：CRUD + 导入导出。
 * 模板存储在 DB，支持系统内置（builtin=true 不可删）与用户自建。
 */
import { request } from './base'

export type WorkflowTemplateCategory =
  | 'general' | 'document' | 'assistant' | 'integration'
  | 'batch' | 'customer-service' | 'audit'
  | 'hr' | 'finance' | 'operations'

export interface WorkflowTemplate {
  id: string
  templateId: string
  name: string
  description: string
  category: WorkflowTemplateCategory
  icon?: string
  tags?: string[]
  graph: Record<string, unknown>
  builtin: boolean
  /** 是否启用（管理面板可禁用） */
  enabled?: boolean
  createdBy: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface WorkflowTemplateInput {
  templateId: string
  name: string
  description?: string
  category?: WorkflowTemplateCategory
  icon?: string
  tags?: string[]
  graph: Record<string, unknown>
}

export interface WorkflowTemplateUpdate {
  name?: string
  description?: string
  category?: WorkflowTemplateCategory
  icon?: string
  tags?: string[]
  graph?: Record<string, unknown>
}

/** 模板导出 JSON 结构（含 version） */
export interface WorkflowTemplateExport {
  templateId: string
  name: string
  description: string
  category: WorkflowTemplateCategory
  icon?: string
  tags?: string[]
  graph: Record<string, unknown>
  version: number
}

export interface ListTemplatesParams {
  category?: string
  search?: string
  builtinOnly?: boolean
}

/**
 * 列出模板（支持分类/搜索过滤）。
 * 返回的列表不含 graph 大字段（列表页轻量加载），详情接口才返回完整 graph。
 */
export async function listTemplates(params?: ListTemplatesParams): Promise<WorkflowTemplate[]> {
  const query = new URLSearchParams()
  if (params?.category) query.set('category', params.category)
  if (params?.search) query.set('search', params.search)
  if (params?.builtinOnly) query.set('builtinOnly', 'true')
  const qs = query.toString()
  return request<WorkflowTemplate[]>(`/ai/workflow-templates${qs ? `?${qs}` : ''}`)
}

/** 获取模板详情（含完整 graph）。:id 参数为 templateId（kebab-case 标识） */
export async function getTemplate(templateId: string): Promise<WorkflowTemplate> {
  return request<WorkflowTemplate>(
    `/ai/workflow-templates/${encodeURIComponent(templateId)}`,
  )
}

/** 创建模板 */
export async function createTemplate(data: WorkflowTemplateInput): Promise<WorkflowTemplate> {
  return request<WorkflowTemplate>('/ai/workflow-templates', {
    method: 'POST',
    body: data,
  })
}

/** 更新模板。:id 参数为 templateId */
export async function updateTemplate(
  templateId: string,
  data: WorkflowTemplateUpdate,
): Promise<WorkflowTemplate> {
  return request<WorkflowTemplate>(
    `/ai/workflow-templates/${encodeURIComponent(templateId)}`,
    { method: 'PUT', body: data },
  )
}

/** 删除模板（内置不可删）。:id 参数为 templateId */
export async function deleteTemplate(templateId: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(
    `/ai/workflow-templates/${encodeURIComponent(templateId)}`,
    { method: 'DELETE' },
  )
}

/** 导出模板 JSON。:id 参数为 templateId */
export async function exportTemplate(templateId: string): Promise<WorkflowTemplateExport> {
  return request<WorkflowTemplateExport>(
    `/ai/workflow-templates/${encodeURIComponent(templateId)}/export`,
  )
}

/** 导入模板 JSON */
export async function importTemplate(data: WorkflowTemplateInput): Promise<WorkflowTemplate> {
  return request<WorkflowTemplate>('/ai/workflow-templates/import', {
    method: 'POST',
    body: data,
  })
}

/** 启用 / 禁用模板 */
export async function setTemplateEnabled(
  templateId: string,
  enabled: boolean,
): Promise<WorkflowTemplate> {
  return request<WorkflowTemplate>(`/ai/workflow-templates/${encodeURIComponent(templateId)}/enabled`, {
    method: 'PUT',
    body: { enabled },
  })
}

/** 租户市场列表 */
export async function listMarketplaceTemplates(params?: {
  category?: string
  search?: string
}): Promise<WorkflowTemplate[]> {
  const query = new URLSearchParams()
  if (params?.category) query.set('category', params.category)
  if (params?.search) query.set('search', params.search)
  const qs = query.toString()
  return request<WorkflowTemplate[]>(`/ai/workflow-templates/marketplace${qs ? `?${qs}` : ''}`)
}
