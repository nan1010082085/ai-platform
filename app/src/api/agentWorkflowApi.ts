/**
 * Agent 工作流编排 API
 * 使用共享 request 模块，无重复基础设施代码。
 */

import type {
  AgentWorkflowDetail,
  AgentWorkflowExecution,
  AgentWorkflowGraph,
  AgentWorkflowPublishResult,
  AgentWorkflowSummary,
  AgentWorkflowTemplateId,
  AgentWorkflowVersionDetail,
  AgentWorkflowVersionEntry,
} from '@/types/agentWorkflow'

import { request } from '@/api/shared/request'

export function listWorkflows(): Promise<AgentWorkflowSummary[]> {
  return request('/ai/workflows')
}

export function createWorkflow(
  name: string,
  description = '',
  templateId?: AgentWorkflowTemplateId,
): Promise<AgentWorkflowSummary> {
  return request('/ai/workflows', {
    method: 'POST',
    body: { name, description, templateId },
  })
}

export function getWorkflow(id: string): Promise<AgentWorkflowDetail> {
  return request(`/ai/workflows/${id}`)
}

export function updateWorkflow(
  id: string,
  patch: {
    name?: string
    description?: string
    slug?: string
    onCompleteWebhook?: { url: string; secret?: string } | null
    draftGraph?: AgentWorkflowGraph
    routingKeywords?: string[]
  },
): Promise<AgentWorkflowDetail> {
  return request(`/ai/workflows/${id}`, {
    method: 'PUT',
    body: patch,
  })
}

export function deleteWorkflow(id: string): Promise<{ deleted: boolean }> {
  return request(`/ai/workflows/${id}`, { method: 'DELETE' })
}

/** 导出工作流为 JSON DSL */
export async function exportWorkflow(id: string): Promise<void> {
  const { fetchRaw } = await import('@/api/aiApi')
  const res = await fetchRaw(`/schema-platform/api/ai/workflows/${id}/export`)
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = disposition.match(/filename="?(.+?)"?$/)
  const filename = match ? match[1] : `workflow-${id}.json`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** 从 JSON 文件导入工作流 */
export async function importWorkflow(file: File): Promise<{ id: string; name: string }> {
  const text = await file.text()
  const data = JSON.parse(text)
  return request('/ai/workflows/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function publishWorkflow(id: string): Promise<AgentWorkflowPublishResult> {
  return request(`/ai/workflows/${id}/publish`, { method: 'POST' })
}

export function rotateWorkflowInvokeKey(id: string): Promise<{
  invokeKey: string
  invokeKeyMasked: string
  invokePath: string | null
}> {
  return request(`/ai/workflows/${id}/rotate-invoke-key`, { method: 'POST' })
}

export function listWorkflowVersions(id: string): Promise<AgentWorkflowVersionEntry[]> {
  return request(`/ai/workflows/${id}/versions`)
}

export function getWorkflowVersion(
  id: string,
  version: string,
): Promise<AgentWorkflowVersionDetail> {
  return request(`/ai/workflows/${id}/versions/${version}`)
}

export function executeWorkflow(
  id: string,
  input: Record<string, unknown> = {},
  opts?: { trigger?: 'manual' | 'webhook' | 'chat' | 'api' },
): Promise<AgentWorkflowExecution> {
  return request(`/ai/workflows/${id}/execute`, {
    method: 'POST',
    body: { input, trigger: opts?.trigger },
  })
}

export function listExecutions(opts?: {
  workflowId?: string
  page?: number
  pageSize?: number
}): Promise<{ items: AgentWorkflowExecution[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams()
  if (opts?.workflowId) params.set('workflowId', opts.workflowId)
  if (opts?.page) params.set('page', String(opts.page))
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize))
  const qs = params.toString()
  return request(`/ai/workflow-executions${qs ? `?${qs}` : ''}`)
}

export function getExecution(id: string): Promise<AgentWorkflowExecution> {
  return request(`/ai/workflow-executions/${id}`)
}

export function continueExecution(
  id: string,
  input: Record<string, unknown> = {},
): Promise<AgentWorkflowExecution> {
  return request(`/ai/workflow-executions/${id}/continue`, {
    method: 'POST',
    body: { input },
  })
}

export function resumeExecution(
  id: string,
  input: Record<string, unknown> = {},
): Promise<AgentWorkflowExecution> {
  return request(`/ai/workflow-executions/${id}/resume`, {
    method: 'POST',
    body: { input },
  })
}

export function cancelExecution(
  id: string,
  reason?: string,
): Promise<AgentWorkflowExecution> {
  return request(`/ai/workflow-executions/${id}/cancel`, {
    method: 'POST',
    body: reason ? { reason } : {},
  })
}

export interface WorkflowRouteMatch {
  id: string
  name: string
  slug: string | null
  description: string
  score: number
  matchedKeywords: string[]
}

/** 按消息匹配已发布工作流的 routingKeywords（chat 意图建议） */
export function matchWorkflowByMessage(message: string): Promise<{ matched: WorkflowRouteMatch[] }> {
  return request('/ai/debug/route-workflow', {
    method: 'POST',
    body: { message },
    raw: true,
  })
}
