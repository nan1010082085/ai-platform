/**
 * Workflow Open API - 三方集成调用（X-Workflow-Key 鉴权）
 *
 * 与 agentWorkflowApi（平台内 JWT 调用）区分：本模块模拟三方调用 Open API，
 * 用 X-Workflow-Key 鉴权，不依赖 JWT。供集成测试 Playground 及三方集成参考。
 *
 * 端点：
 * - POST /api/ai/workflows/invoke/:slugOrId              触发执行
 * - GET  /api/ai/workflows/invoke/executions/:id         轮询执行结果
 * - POST /api/ai/workflows/invoke/executions/:id/resume  恢复 HITL 等待
 * - POST /api/ai/workflows/invoke/executions/:id/cancel  取消执行
 * - GET  /api/ai/workflows/invoke/executions             执行历史列表
 */
import { BASE_URL } from './aiApi/base'
import type { AgentWorkflowExecution } from '@/types/agentWorkflow'

export interface InvokeOpenApiInput {
  message: string
  [key: string]: unknown
}

export interface InvokeOpenApiResult {
  executionId: string
  workflowId: string
  workflowName: string
  status: string
  execution: AgentWorkflowExecution
}

export interface InvokeOpenApiResponse {
  success: boolean
  data?: InvokeOpenApiResult
  error?: { message: string; code?: string }
}

export interface InvokeExecutionResponse {
  success: boolean
  data?: AgentWorkflowExecution
  error?: { message: string; code?: string }
}

export interface InvokeOpenApiOpts {
  trigger?: 'manual' | 'webhook' | 'chat' | 'api'
  callbackUrl?: string
  callbackSecret?: string
}

export interface InvokeResumeOpts {
  approved: boolean
  comment?: string
  answers?: Record<string, string>
}

export interface InvokeExecutionHistoryItem {
  id: string
  status: string
  trigger: string
  startedAt: string
  durationMs: number | null
  message: string | null
}

export interface InvokeExecutionHistoryResponse {
  success: boolean
  data?: {
    items: InvokeExecutionHistoryItem[]
    total: number
    page: number
    pageSize: number
  }
  error?: { message: string; code?: string }
}

/** POST /api/ai/workflows/invoke/:slugOrId -- 三方调用入口，返回 202 + executionId */
export async function invokeWorkflowOpenApi(
  slugOrId: string,
  invokeKey: string,
  input: InvokeOpenApiInput,
  opts?: InvokeOpenApiOpts,
): Promise<InvokeOpenApiResponse> {
  const res = await fetch(`${BASE_URL}/ai/workflows/invoke/${encodeURIComponent(slugOrId)}`, {
    method: 'POST',
    headers: {
      'X-Workflow-Key': invokeKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      trigger: opts?.trigger ?? 'api',
      callbackUrl: opts?.callbackUrl,
      callbackSecret: opts?.callbackSecret,
    }),
  })
  return res.json() as Promise<InvokeOpenApiResponse>
}

/** GET /api/ai/workflows/invoke/executions/:executionId -- 三方轮询执行结果 */
export async function getInvokeExecutionOpenApi(
  executionId: string,
  invokeKey: string,
): Promise<InvokeExecutionResponse> {
  const res = await fetch(
    `${BASE_URL}/ai/workflows/invoke/executions/${encodeURIComponent(executionId)}`,
    { headers: { 'X-Workflow-Key': invokeKey } },
  )
  return res.json() as Promise<InvokeExecutionResponse>
}

/** POST /api/ai/workflows/invoke/executions/:executionId/resume -- 三方恢复 HITL 等待 */
export async function resumeInvokeOpenApi(
  executionId: string,
  invokeKey: string,
  opts: InvokeResumeOpts,
): Promise<InvokeExecutionResponse> {
  const res = await fetch(
    `${BASE_URL}/ai/workflows/invoke/executions/${encodeURIComponent(executionId)}/resume`,
    {
      method: 'POST',
      headers: {
        'X-Workflow-Key': invokeKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        approved: opts.approved,
        comment: opts.comment ?? '',
        answers: opts.answers ?? {},
      }),
    },
  )
  return res.json() as Promise<InvokeExecutionResponse>
}

/** POST /api/ai/workflows/invoke/executions/:executionId/cancel -- 三方取消执行 */
export async function cancelInvokeOpenApi(
  executionId: string,
  invokeKey: string,
  reason?: string,
): Promise<InvokeExecutionResponse> {
  const res = await fetch(
    `${BASE_URL}/ai/workflows/invoke/executions/${encodeURIComponent(executionId)}/cancel`,
    {
      method: 'POST',
      headers: {
        'X-Workflow-Key': invokeKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reason ? { reason } : {}),
    },
  )
  return res.json() as Promise<InvokeExecutionResponse>
}

/** GET /api/ai/workflows/invoke/executions -- 三方执行历史列表 */
export async function listInvokeExecutionsOpenApi(
  invokeKey: string,
  opts?: { page?: number; pageSize?: number },
): Promise<InvokeExecutionHistoryResponse> {
  const params = new URLSearchParams()
  if (opts?.page) params.set('page', String(opts.page))
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize))
  const qs = params.toString()
  const res = await fetch(
    `${BASE_URL}/ai/workflows/invoke/executions${qs ? `?${qs}` : ''}`,
    { headers: { 'X-Workflow-Key': invokeKey } },
  )
  return res.json() as Promise<InvokeExecutionHistoryResponse>
}
