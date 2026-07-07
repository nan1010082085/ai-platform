import type {
  AgentExecutionStatus,
  AgentWorkflowExecution,
} from '@schema-platform/ai-shared/agentWorkflow'

export type { AgentExecutionStatus, AgentWorkflowExecution }

export interface WorkflowClientOptions {
  /** API 根地址，如 https://api.example.com */
  baseUrl: string
  /** sk_live_xxx 或 sk_test_xxx */
  apiKey: string
  fetch?: typeof fetch
}

export interface ExecuteRequest {
  input?: Record<string, unknown>
  async?: boolean
  version?: string
  idempotencyKey?: string
  callbackUrl?: string
  callbackSecret?: string
}

export interface ExecuteAsyncResult {
  executionId: string
  status: AgentExecutionStatus
  pollUrl: string
  streamUrl: string
}

export interface WorkflowStreamEvent {
  event: 'execution' | 'done' | 'error'
  data: unknown
}

export interface PollOptions {
  intervalMs?: number
  signal?: AbortSignal
}

export interface WaitOptions extends PollOptions {
  /** 终态：success | error | cancelled */
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

async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ event: string; data: string }> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sep = buffer.indexOf('\n\n')
    while (sep !== -1) {
      const block = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)

      let event = 'message'
      const dataLines: string[] = []
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
      }
      if (dataLines.length) {
        yield { event, data: dataLines.join('\n') }
      }
      sep = buffer.indexOf('\n\n')
    }
  }
}

export class WorkflowClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly fetchFn: typeof fetch

  constructor(opts: WorkflowClientOptions) {
    this.baseUrl = trimBaseUrl(opts.baseUrl)
    this.apiKey = opts.apiKey
    this.fetchFn = opts.fetch ?? globalThis.fetch
    if (!this.fetchFn) {
      throw new Error('[WorkflowClient] fetch is not available in this environment')
    }
  }

  private authHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
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
      headers: this.authHeaders(opts.headers),
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

  async executeById(workflowId: string, req: ExecuteRequest = {}): Promise<AgentWorkflowExecution | ExecuteAsyncResult> {
    return this.execute(`/api/ai/open/workflows/${encodeURIComponent(workflowId)}/execute`, req)
  }

  async executeBySlug(slug: string, req: ExecuteRequest = {}): Promise<AgentWorkflowExecution | ExecuteAsyncResult> {
    return this.execute(
      `/api/ai/open/workflows/by-slug/${encodeURIComponent(slug.trim().toLowerCase())}/execute`,
      req,
    )
  }

  private async execute(
    path: string,
    req: ExecuteRequest,
  ): Promise<AgentWorkflowExecution | ExecuteAsyncResult> {
    const query = new URLSearchParams()
    if (req.async) query.set('async', 'true')
    if (req.version) query.set('version', req.version)
    const qs = query.toString()
    const url = qs ? `${path}?${qs}` : path

    const headers: Record<string, string> = {}
    if (req.idempotencyKey) headers['Idempotency-Key'] = req.idempotencyKey

    const data = await this.request<AgentWorkflowExecution | ExecuteAsyncResult>('POST', url, {
      headers,
      body: {
        input: req.input ?? {},
        callbackUrl: req.callbackUrl,
        callbackSecret: req.callbackSecret,
      },
    })

    if (req.async) {
      const asyncData = data as ExecuteAsyncResult
      return {
        ...asyncData,
        pollUrl: joinUrl(this.baseUrl, asyncData.pollUrl),
        streamUrl: joinUrl(this.baseUrl, asyncData.streamUrl),
      }
    }
    return data as AgentWorkflowExecution
  }

  async getExecution(executionId: string): Promise<AgentWorkflowExecution> {
    return this.request<AgentWorkflowExecution>(
      'GET',
      `/api/ai/open/workflow-executions/${encodeURIComponent(executionId)}`,
    )
  }

  async poll(
    executionId: string,
    opts: PollOptions = {},
  ): Promise<AgentWorkflowExecution> {
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

  async *streamExecution(executionId: string, signal?: AbortSignal): AsyncGenerator<WorkflowStreamEvent> {
    const res = await this.fetchFn(
      joinUrl(this.baseUrl, `/api/ai/open/workflow-executions/${encodeURIComponent(executionId)}/stream`),
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal,
      },
    )

    if (!res.ok || !res.body) {
      throw new WorkflowClientError(
        res.statusText || 'Stream failed',
        'stream_failed',
        res.status,
      )
    }

    for await (const chunk of parseSseStream(res.body)) {
      let parsed: unknown = chunk.data
      try {
        parsed = JSON.parse(chunk.data)
      } catch { /* keep raw string */ }

      const event = chunk.event as WorkflowStreamEvent['event']
      yield { event, data: parsed }

      if (event === 'done' || event === 'error') break
    }
  }

  async resume(executionId: string, input: Record<string, unknown> = {}): Promise<AgentWorkflowExecution> {
    return this.request<AgentWorkflowExecution>(
      'POST',
      `/api/ai/open/workflow-executions/${encodeURIComponent(executionId)}/resume`,
      { body: { input } },
    )
  }

  async cancel(executionId: string, reason?: string): Promise<AgentWorkflowExecution> {
    return this.request<AgentWorkflowExecution>(
      'POST',
      `/api/ai/open/workflow-executions/${encodeURIComponent(executionId)}/cancel`,
      { body: reason ? { reason } : {} },
    )
  }
}
