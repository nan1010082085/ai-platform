import type {
  AgentExecutionStatus,
  AgentWorkflowExecution,
} from '@schema-platform/ai-shared/agentWorkflow'

export type { AgentExecutionStatus, AgentWorkflowExecution }

export const WORKFLOW_KEY_HEADER = 'X-Workflow-Key'

export interface WorkflowClientOptions {
  /** API 根地址，如 https://platform.example.com */
  baseUrl: string
  /** 工作流调用密钥（发布时生成，请求头 X-Workflow-Key） */
  workflowKey: string
  /** 租户 ID，默认 000000 */
  tenantId?: string
  fetch?: typeof fetch
}

export type WorkflowTrigger = 'manual' | 'webhook' | 'chat' | 'api'

export interface ExecuteRequest {
  input?: Record<string, unknown>
  trigger?: WorkflowTrigger
  callbackUrl?: string
  callbackSecret?: string
}

export interface InvokeExecutionResponse {
  executionId: string
  workflowId: string
  workflowName: string
  status: string
  execution: AgentWorkflowExecution
}

export interface WorkflowStreamEvent {
  event: 'execution' | 'done' | 'error'
  data: unknown
}

export interface PollOptions {
  intervalMs?: number
  signal?: AbortSignal
}

export interface StreamOptions extends PollOptions {
  intervalMs?: number
}

export interface WaitOptions extends PollOptions {
  until?: AgentExecutionStatus[]
}

export class WorkflowClientError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'WorkflowClientError'
    this.code = code
    this.status = status
  }
}

const TERMINAL: AgentExecutionStatus[] = ['success', 'error', 'cancelled']

function trimBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

function joinUrl(baseUrl: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = trimBaseUrl(baseUrl)
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export class WorkflowClient {
  private readonly baseUrl: string
  private readonly workflowKey: string
  private readonly tenantId: string
  private readonly fetchFn: typeof fetch

  constructor(opts: WorkflowClientOptions) {
    this.baseUrl = trimBaseUrl(opts.baseUrl)
    this.workflowKey = opts.workflowKey.trim()
    this.tenantId = (opts.tenantId ?? '000000').trim()
    this.fetchFn = opts.fetch ?? globalThis.fetch
    if (!this.fetchFn) {
      throw new Error('[WorkflowClient] fetch is not available in this environment')
    }
    if (!this.workflowKey) {
      throw new WorkflowClientError('workflowKey is required', 'missing_workflow_key', 401)
    }
  }

  private invokeHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      [WORKFLOW_KEY_HEADER]: this.workflowKey,
      'X-Tenant-Id': this.tenantId,
      ...extra,
    }
  }

  private async request<T>(
    method: string,
    path: string,
    opts: { body?: unknown; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const res = await this.fetchFn(joinUrl(this.baseUrl, path), {
      method,
      headers: this.invokeHeaders(opts.headers),
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })

    const json = await res.json().catch(() => null) as {
      success?: boolean
      data?: T
      error?: { message?: string; code?: string }
    } | null

    if (!res.ok || !json?.success) {
      const message = json?.error?.message ?? res.statusText ?? 'Request failed'
      const code = json?.error?.code ?? 'request_failed'
      throw new WorkflowClientError(message, code, res.status)
    }

    return json.data as T
  }

  async executeBySlug(slug: string, req: ExecuteRequest = {}): Promise<AgentWorkflowExecution> {
    const normalized = slug.trim().toLowerCase()
    const data = await this.request<InvokeExecutionResponse>(
      'POST',
      `/api/ai/workflows/invoke/${encodeURIComponent(normalized)}`,
      {
        body: {
          input: req.input ?? {},
          trigger: req.trigger ?? 'api',
          callbackUrl: req.callbackUrl,
          callbackSecret: req.callbackSecret,
        },
      },
    )
    return data.execution
  }

  async executeById(workflowId: string, req: ExecuteRequest = {}): Promise<AgentWorkflowExecution> {
    const data = await this.request<InvokeExecutionResponse>(
      'POST',
      `/api/ai/workflows/invoke/${encodeURIComponent(workflowId)}`,
      {
        body: {
          input: req.input ?? {},
          trigger: req.trigger ?? 'api',
          callbackUrl: req.callbackUrl,
          callbackSecret: req.callbackSecret,
        },
      },
    )
    return data.execution
  }

  async getExecution(executionId: string): Promise<AgentWorkflowExecution> {
    return this.request<AgentWorkflowExecution>(
      'GET',
      `/api/ai/workflows/invoke/executions/${encodeURIComponent(executionId)}`,
    )
  }

  async poll(executionId: string, opts: PollOptions = {}): Promise<AgentWorkflowExecution> {
    const intervalMs = opts.intervalMs ?? 800
    while (true) {
      if (opts.signal?.aborted) {
        throw new WorkflowClientError('Polling aborted', 'aborted', 499)
      }
      const execution = await this.getExecution(executionId)
      if (TERMINAL.includes(execution.status)) return execution
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }

  async waitForCompletion(
    executionId: string,
    opts: WaitOptions = {},
  ): Promise<AgentWorkflowExecution> {
    const until = opts.until ?? TERMINAL
    const intervalMs = opts.intervalMs ?? 800
    while (true) {
      if (opts.signal?.aborted) {
        throw new WorkflowClientError('Wait aborted', 'aborted', 499)
      }
      const execution = await this.getExecution(executionId)
      if (until.includes(execution.status)) return execution
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }

  async *streamExecution(executionId: string, opts: StreamOptions = {}): AsyncGenerator<WorkflowStreamEvent> {
    const intervalMs = opts.intervalMs ?? 800
    let lastPayload = ''

    while (!opts.signal?.aborted) {
      const execution = await this.getExecution(executionId)
      const payload = JSON.stringify({
        status: execution.status,
        nodeRecords: execution.nodeRecords,
        streamingOutput: execution.streamingOutput ?? null,
        error: execution.error ?? null,
      })

      if (payload !== lastPayload) {
        lastPayload = payload
        yield { event: 'execution', data: execution }
      }

      if (TERMINAL.includes(execution.status)) {
        yield { event: 'done', data: { executionId, status: execution.status } }
        return
      }

      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }
}
