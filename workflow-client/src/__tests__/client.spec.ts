import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowClient, WorkflowClientError, WORKFLOW_KEY_HEADER, API_KEY_HEADER } from '../client.js'
import type { AgentWorkflowExecution } from '@schema-platform/ai-shared/agentWorkflow'

const BASE = 'https://api.test.local'
const WORKFLOW_KEY = 'wf_test_invoke_key_abc123'
const API_KEY = 'sk-abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const runningExecution: AgentWorkflowExecution = {
  id: 'exec-1',
  workflowId: 'wf-1',
  workflowName: 'Test',
  versionId: null,
  version: '20260707000000',
  status: 'running',
  trigger: 'api',
  startedAt: new Date().toISOString(),
  nodeRecords: [],
}

const doneExecution: AgentWorkflowExecution = {
  ...runningExecution,
  status: 'success',
  finishedAt: new Date().toISOString(),
  durationMs: 100,
}

describe('WorkflowClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('executeBySlug uses invoke endpoint with X-Workflow-Key', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe(`${BASE}/api/ai/workflows/invoke/my-flow`)
      const headers = init?.headers as Record<string, string>
      expect(headers[WORKFLOW_KEY_HEADER]).toBe(WORKFLOW_KEY)
      expect(headers['X-Tenant-Id']).toBe('000000')
      return jsonResponse({
        success: true,
        data: {
          executionId: 'exec-1',
          workflowId: 'wf-1',
          workflowName: 'Test',
          status: 'running',
          execution: runningExecution,
        },
      })
    })

    const client = new WorkflowClient({ baseUrl: BASE, workflowKey: WORKFLOW_KEY, fetch: fetchMock })
    const result = await client.executeBySlug('my-flow', { input: { x: 1 }, trigger: 'api' })
    expect(result.id).toBe('exec-1')
  })

  it('executeById uses invoke endpoint with workflow id', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toBe(`${BASE}/api/ai/workflows/invoke/wf-1`)
      return jsonResponse({
        success: true,
        data: {
          executionId: 'exec-1',
          workflowId: 'wf-1',
          workflowName: 'Test',
          status: 'running',
          execution: runningExecution,
        },
      })
    })

    const client = new WorkflowClient({ baseUrl: BASE, workflowKey: WORKFLOW_KEY, fetch: fetchMock })
    await client.executeById('wf-1', { trigger: 'manual' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('getExecution throws WorkflowClientError on API error', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      success: false,
      error: { message: 'Execution not found', code: 'execution_not_found' },
    }, 404))

    const client = new WorkflowClient({ baseUrl: BASE, workflowKey: WORKFLOW_KEY, fetch: fetchMock })
    await expect(client.getExecution('missing')).rejects.toBeInstanceOf(WorkflowClientError)
  })

  it('waitForCompletion polls until terminal status', async () => {
    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls += 1
      const data = calls < 2 ? runningExecution : doneExecution
      return jsonResponse({ success: true, data })
    })

    const client = new WorkflowClient({ baseUrl: BASE, workflowKey: WORKFLOW_KEY, fetch: fetchMock })
    const result = await client.waitForCompletion('exec-1', { intervalMs: 1 })
    expect(result.status).toBe('success')
    expect(calls).toBeGreaterThanOrEqual(2)
  })

  it('streamExecution yields poll-based execution updates', async () => {
    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls += 1
      const data = calls < 2 ? runningExecution : doneExecution
      return jsonResponse({ success: true, data })
    })

    const client = new WorkflowClient({ baseUrl: BASE, workflowKey: WORKFLOW_KEY, fetch: fetchMock })
    const events: string[] = []
    for await (const evt of client.streamExecution('exec-1', { intervalMs: 1 })) {
      events.push(evt.event)
      if (evt.event === 'done') break
    }
    expect(events).toContain('execution')
    expect(events).toContain('done')
  })

  it('requires workflowKey at construction', () => {
    expect(() => new WorkflowClient({ baseUrl: BASE, workflowKey: '' })).toThrow(WorkflowClientError)
  })

  it('constructs with apiKey and sends X-API-Key header', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe(`${BASE}/api/ai/workflows/invoke/my-flow`)
      const headers = init?.headers as Record<string, string>
      expect(headers[API_KEY_HEADER]).toBe(API_KEY)
      expect(headers[WORKFLOW_KEY_HEADER]).toBeUndefined()
      expect(headers['X-Tenant-Id']).toBe('000000')
      return jsonResponse({
        success: true,
        data: {
          executionId: 'exec-1',
          workflowId: 'wf-1',
          workflowName: 'Test',
          status: 'running',
          execution: runningExecution,
        },
      })
    })

    const client = new WorkflowClient({ baseUrl: BASE, apiKey: API_KEY, fetch: fetchMock })
    const result = await client.executeBySlug('my-flow', { input: { x: 1 } })
    expect(result.id).toBe('exec-1')
  })

  it('throws when both workflowKey and apiKey are provided', () => {
    expect(
      () => new WorkflowClient({ baseUrl: BASE, workflowKey: WORKFLOW_KEY, apiKey: API_KEY }),
    ).toThrow(WorkflowClientError)
  })

  it('throws when neither workflowKey nor apiKey is provided', () => {
    expect(
      () => new WorkflowClient({ baseUrl: BASE }),
    ).toThrow(WorkflowClientError)
  })
})
