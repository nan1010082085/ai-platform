import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowClient, WorkflowClientError } from '../client.js'
import type { AgentWorkflowExecution } from '@schema-platform/ai-shared/agentWorkflow'

const BASE = 'https://api.test.local'
const KEY = 'sk_test_abc'

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

  it('executeBySlug async returns poll/stream URLs', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toBe(`${BASE}/api/ai/open/workflows/by-slug/my-flow/execute?async=true`)
      return jsonResponse({
        success: true,
        data: {
          executionId: 'exec-1',
          status: 'running',
          pollUrl: '/api/ai/open/workflow-executions/exec-1',
          streamUrl: '/api/ai/open/workflow-executions/exec-1/stream',
        },
      })
    })

    const client = new WorkflowClient({ baseUrl: BASE, apiKey: KEY, fetch: fetchMock })
    const result = await client.executeBySlug('my-flow', { async: true, input: { x: 1 } })

    expect(result).toMatchObject({
      executionId: 'exec-1',
      pollUrl: `${BASE}/api/ai/open/workflow-executions/exec-1`,
      streamUrl: `${BASE}/api/ai/open/workflow-executions/exec-1/stream`,
    })
  })

  it('getExecution throws WorkflowClientError on API error', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      success: false,
      error: { message: 'Execution not found', code: 'workflow_not_found' },
    }, 404))

    const client = new WorkflowClient({ baseUrl: BASE, apiKey: KEY, fetch: fetchMock })
    await expect(client.getExecution('missing')).rejects.toBeInstanceOf(WorkflowClientError)
  })

  it('waitForCompletion polls until terminal status', async () => {
    let calls = 0
    const fetchMock = vi.fn(async () => {
      calls += 1
      const data = calls < 2 ? runningExecution : doneExecution
      return jsonResponse({ success: true, data })
    })

    const client = new WorkflowClient({ baseUrl: BASE, apiKey: KEY, fetch: fetchMock })
    const result = await client.waitForCompletion('exec-1', { intervalMs: 1 })

    expect(result.status).toBe('success')
    expect(calls).toBeGreaterThanOrEqual(2)
  })

  it('resume sends input body', async () => {
    const fetchMock = vi.fn(async (_url, init?: RequestInit) => {
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual({ input: { approved: true } })
      return jsonResponse({ success: true, data: runningExecution })
    })

    const client = new WorkflowClient({ baseUrl: BASE, apiKey: KEY, fetch: fetchMock })
    await client.resume('exec-1', { approved: true })
  })
})
