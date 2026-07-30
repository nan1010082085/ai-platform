/**
 * workflowInvokeApi 单测：mock global.fetch，验证 Open API 调用契约
 * （URL / X-Workflow-Key 鉴权 / 请求体 / 响应解析 / slugOrId 编码）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invokeWorkflowOpenApi, getInvokeExecutionOpenApi } from '@/api/workflowInvokeApi'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

function mockJsonResponse(body: unknown) {
  return { json: async () => body }
}

describe('workflowInvokeApi.invokeWorkflowOpenApi', () => {
  it('用 X-Workflow-Key 调 POST /invoke/:slugOrId，body 含 input+trigger', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ success: true, data: { executionId: 'exec-1' } }))
    const res = await invokeWorkflowOpenApi('my-slug', 'wf_key123', { message: 'hi' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/ai/workflows/invoke/my-slug')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['X-Workflow-Key']).toBe('wf_key123')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    const body = JSON.parse(init.body as string)
    expect(body.input.message).toBe('hi')
    expect(body.trigger).toBe('api')
    expect(res.success).toBe(true)
    expect(res.data?.executionId).toBe('exec-1')
  })

  it('支持自定义 trigger + callbackUrl', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ success: true }))
    await invokeWorkflowOpenApi('s', 'k', { message: 'x' }, { trigger: 'webhook', callbackUrl: 'https://cb.example.com' })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    const body = JSON.parse(init.body as string)
    expect(body.trigger).toBe('webhook')
    expect(body.callbackUrl).toBe('https://cb.example.com')
  })

  it('slugOrId 被 encodeURIComponent 编码（含空格/斜杠）', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ success: true }))
    await invokeWorkflowOpenApi('my slug/特殊', 'k', { message: 'x' })
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain(encodeURIComponent('my slug/特殊'))
  })

  it('透传 error 响应', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ success: false, error: { message: 'invalid key', code: 'auth_failed' } }))
    const res = await invokeWorkflowOpenApi('s', 'bad', { message: 'x' })
    expect(res.success).toBe(false)
    expect(res.error?.code).toBe('auth_failed')
  })
})

describe('workflowInvokeApi.getInvokeExecutionOpenApi', () => {
  it('用 X-Workflow-Key 调 GET /invoke/executions/:id', async () => {
    fetchMock.mockResolvedValue(mockJsonResponse({ success: true, data: { id: 'exec-1', status: 'success' } }))
    const res = await getInvokeExecutionOpenApi('exec-1', 'wf_key123')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/ai/workflows/invoke/executions/exec-1')
    expect((init.headers as Record<string, string>)['X-Workflow-Key']).toBe('wf_key123')
    expect(res.success).toBe(true)
    expect(res.data?.status).toBe('success')
  })
})
