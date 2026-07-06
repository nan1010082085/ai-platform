/**
 * Agent 工作流编排 API
 */

import type {
  AgentWorkflowDetail,
  AgentWorkflowExecution,
  AgentWorkflowGraph,
  AgentWorkflowSummary,
  AgentWorkflowTemplateId,
  AgentWorkflowVersionDetail,
  AgentWorkflowVersionEntry,
} from '@/types/agentWorkflow'

import { redirectToLogin } from '@schema-platform/platform-shared/utils/authPaths'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'
const ACCESS_TOKEN_KEY = 'sfp_access_token'

let tokenProvider: (() => string | null) | null = null
let onUnauthorized: (() => void) | null = null

export function setAgentWorkflowTokenProvider(provider: () => string | null): void {
  tokenProvider = provider
}

export function setAgentWorkflowUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

function resolveToken(): string | null {
  return tokenProvider?.() || localStorage.getItem(ACCESS_TOKEN_KEY)
}

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: { message: string }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  }
  const token = resolveToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  let body: ApiResponse<T>
  try {
    body = (await response.json()) as ApiResponse<T>
  } catch {
    throw new Error(response.ok ? '响应解析失败' : `请求失败 (${response.status})，请确认 server 已启动`)
  }
  if (response.status === 401) {
    onUnauthorized?.()
    redirectToLogin()
    throw new Error('Authentication required')
  }
  if (!response.ok || !body.success) {
    throw new Error(body.error?.message ?? `请求失败 (${response.status})`)
  }
  return body.data
}

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
    body: JSON.stringify({ name, description, templateId }),
  })
}

export function getWorkflow(id: string): Promise<AgentWorkflowDetail> {
  return request(`/ai/workflows/${id}`)
}

export function updateWorkflow(
  id: string,
  patch: { name?: string; description?: string; draftGraph?: AgentWorkflowGraph },
): Promise<AgentWorkflowDetail> {
  return request(`/ai/workflows/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
}

export function deleteWorkflow(id: string): Promise<{ deleted: boolean }> {
  return request(`/ai/workflows/${id}`, { method: 'DELETE' })
}

export function publishWorkflow(id: string): Promise<{ publishId: string; version: string }> {
  return request(`/ai/workflows/${id}/publish`, { method: 'POST' })
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
): Promise<AgentWorkflowExecution> {
  return request(`/ai/workflows/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify({ input }),
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
    body: JSON.stringify({ input }),
  })
}

export function resumeExecution(
  id: string,
  input: Record<string, unknown> = {},
): Promise<AgentWorkflowExecution> {
  return request(`/ai/workflow-executions/${id}/resume`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  })
}

export function cancelExecution(
  id: string,
  reason?: string,
): Promise<AgentWorkflowExecution> {
  return request(`/ai/workflow-executions/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify(reason ? { reason } : {}),
  })
}
