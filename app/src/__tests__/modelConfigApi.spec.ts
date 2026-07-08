/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getModelConfigs,
  createModelConfig,
  updateModelConfig,
  deleteModelConfig,
  testModelConnection,
  setModelConfigTokenProvider,
} from '@/api/modelConfigApi'

const BASE_URL = '/schema-platform/api'

function mockFetch(response: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  })
}

describe('modelConfigApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch({ success: true, data: {} }))
    setModelConfigTokenProvider(() => 'test-token')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getModelConfigs sends GET request with query params', async () => {
    const mockData = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }
    vi.stubGlobal('fetch', mockFetch({ success: true, data: mockData }))

    const result = await getModelConfigs({ provider: 'deepseek', page: 1, pageSize: 20 })
    expect(result).toEqual(mockData)

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain(`${BASE_URL}/model-configs`)
    expect(url).toContain('provider=deepseek')
    expect(init.method).toBeUndefined() // GET is default
  })

  it('createModelConfig sends POST request', async () => {
    const mockItem = { id: 'c1', name: 'Test', provider: 'deepseek', model: 'test-model' }
    vi.stubGlobal('fetch', mockFetch({ success: true, data: mockItem }))

    const result = await createModelConfig({
      name: 'Test',
      provider: 'deepseek',
      model: 'test-model',
    })
    expect(result).toEqual(mockItem)

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain(`${BASE_URL}/model-configs`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      name: 'Test',
      provider: 'deepseek',
      model: 'test-model',
    })
  })

  it('updateModelConfig sends PUT request', async () => {
    const mockItem = { id: 'c1', name: 'Updated', provider: 'deepseek', model: 'test-model' }
    vi.stubGlobal('fetch', mockFetch({ success: true, data: mockItem }))

    const result = await updateModelConfig('c1', { name: 'Updated' })
    expect(result).toEqual(mockItem)

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain(`${BASE_URL}/model-configs/c1`)
    expect(init.method).toBe('PUT')
  })

  it('deleteModelConfig sends DELETE request', async () => {
    vi.stubGlobal('fetch', mockFetch({ success: true, data: null }))

    await deleteModelConfig('c1')

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain(`${BASE_URL}/model-configs/c1`)
    expect(init.method).toBe('DELETE')
  })

  it('testModelConnection sends POST request with message', async () => {
    const mockResult = { reply: 'OK', tokens: 5, model: 'test-model', provider: 'deepseek' }
    vi.stubGlobal('fetch', mockFetch({ success: true, data: mockResult }))

    const result = await testModelConnection('c1', 'Hello')
    expect(result).toEqual(mockResult)

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain(`${BASE_URL}/model-configs/c1/test`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ message: 'Hello' })
  })

  it('testModelConnection uses default message when not provided', async () => {
    vi.stubGlobal('fetch', mockFetch({
      success: true,
      data: { reply: 'OK', tokens: 3, model: 'm', provider: 'p' },
    }))

    await testModelConnection('c1')

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ message: 'Hello, respond with OK' })
  })

  it('throws ModelConfigApiError on non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetch({ error: { message: 'Not found' } }, false, 404))

    await expect(getModelConfigs()).rejects.toThrow()
  })

  it('throws ModelConfigApiError on API failure', async () => {
    vi.stubGlobal('fetch', mockFetch({ success: false, error: { message: 'Bad request' } }))

    await expect(getModelConfigs()).rejects.toThrow()
  })

  it('includes Authorization header with token', async () => {
    vi.stubGlobal('fetch', mockFetch({ success: true, data: { items: [], total: 0 } }))

    await getModelConfigs()

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token')
  })
})
