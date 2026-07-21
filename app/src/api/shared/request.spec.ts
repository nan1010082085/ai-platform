/**
 * request.ts unit tests
 *
 * 覆盖核心 fetch 封装：信封解析、401 刷新重试、错误提取、token/header 注入。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@schema-platform/platform-shared/utils/authPaths', () => ({
  redirectToLogin: vi.fn(),
}))

import {
  request,
  ApiError,
  setBaseUrl,
  setTokenProvider,
  setTokenRefreshHandler,
  setUnauthorizedHandler,
  notifyUnauthorized,
  attemptTokenRefresh,
  buildHeaders,
} from '@/api/shared/request'
import { redirectToLogin } from '@schema-platform/platform-shared/utils/authPaths'

function mockResponse(body: unknown, init: { ok?: boolean; status?: number; statusText?: string } = {}): Response {
  const ok = init.ok ?? true
  const status = init.status ?? 200
  return {
    ok,
    status,
    statusText: init.statusText ?? '',
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response
}

describe('request', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    setBaseUrl('/api')
    setTokenProvider(() => 'test-token')
    setTokenRefreshHandler(null as never)
    setUnauthorizedHandler(null)
  })

  it('unwraps { success, data } envelope on success', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ success: true, data: { id: 1, name: 'foo' } }))

    const result = await request<{ id: number; name: string }>('/items')
    expect(result).toEqual({ id: 1, name: 'foo' })
  })

  it('returns raw JSON when raw option is set', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ not: 'an envelope' }))

    const result = await request<{ not: string }>('/debug', { raw: true })
    expect(result).toEqual({ not: 'an envelope' })
  })

  it('sets Content-Type and stringifies body for POST', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ success: true, data: {} }))

    await request('/items', { method: 'POST', body: { name: 'foo' } })

    const [url, init] = vi.mocked(fetch).mock.calls[0]!
    expect(url).toBe('/api/items')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ name: 'foo' }))
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('preserves caller-provided Content-Type', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ success: true, data: {} }))

    await request('/items', { method: 'POST', body: 'plain', headers: { 'Content-Type': 'text/plain' } })

    const init = vi.mocked(fetch).mock.calls[0]![1] as RequestInit
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('text/plain')
  })

  it('does not set Content-Type when body is undefined', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ success: true, data: {} }))

    await request('/items', { method: 'GET' })

    const init = vi.mocked(fetch).mock.calls[0]![1] as RequestInit
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('injects Authorization header from token provider', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ success: true, data: {} }))

    await request('/items')

    const init = vi.mocked(fetch).mock.calls[0]![1] as RequestInit
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token')
  })

  it('omits Authorization when no token available', async () => {
    setTokenProvider(() => null)
    vi.mocked(fetch).mockResolvedValue(mockResponse({ success: true, data: {} }))

    await request('/items')

    const init = vi.mocked(fetch).mock.calls[0]![1] as RequestInit
    expect((init.headers as Record<string, string>)['Authorization']).toBeUndefined()
  })

  it('throws ApiError on 401 without refresh handler', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse({ error: { message: 'Unauthorized' } }, { ok: false, status: 401 }))

    await expect(request('/items')).rejects.toMatchObject({ status: 401 })
    expect(redirectToLogin).toHaveBeenCalled()
  })

  it('retries once on 401 when refresh handler succeeds', async () => {
    let refreshCalled = false
    setTokenRefreshHandler(async () => {
      refreshCalled = true
      return true
    })
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockResponse({ error: { message: 'expired' } }, { ok: false, status: 401 }))
      .mockResolvedValueOnce(mockResponse({ success: true, data: { ok: true } }))

    const result = await request('/items')
    expect(refreshCalled).toBe(true)
    expect(result).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not retry when refresh handler returns false', async () => {
    setTokenRefreshHandler(async () => false)
    vi.mocked(fetch).mockResolvedValue(mockResponse({ error: { message: 'expired' } }, { ok: false, status: 401 }))

    await expect(request('/items')).rejects.toMatchObject({ status: 401 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('extracts error message from envelope error object', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ error: { message: 'Not found', code: 'NOT_FOUND', details: { field: 'id' } } }, { ok: false, status: 404, statusText: 'Not Found' }),
    )

    try {
      await request('/items/999')
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const e = err as ApiError
      expect(e.message).toBe('Not found')
      expect(e.status).toBe(404)
      expect(e.code).toBe('NOT_FOUND')
      expect(e.details).toEqual({ field: 'id' })
    }
  })

  it('extracts error from plain string error shape', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ error: 'Something went wrong' }, { ok: false, status: 500, statusText: 'Internal Server Error' }),
    )

    try {
      await request('/items')
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).message).toBe('Something went wrong')
    }
  })

  it('falls back to status text on non-JSON error body', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => { throw new SyntaxError('invalid json') },
      text: async () => '<html>Bad Gateway</html>',
    } as Response)

    try {
      await request('/items')
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).status).toBe(502)
      expect((err as ApiError).message).toContain('502')
    }
  })

  it('throws ApiError when OK response body is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => { throw new SyntaxError('invalid json') },
      text: async () => 'plain text',
    } as Response)

    await expect(request('/items')).rejects.toMatchObject({ name: 'ApiError' })
  })

  it('throws ApiError when envelope success is false', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ success: false, error: { message: 'Validation failed', code: 'VALIDATION' } }, { ok: true, status: 200 }),
    )

    try {
      await request('/items')
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).message).toBe('Validation failed')
      expect((err as ApiError).code).toBe('VALIDATION')
    }
  })

  it('uses default error message when envelope has no error message', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ success: false }, { ok: true, status: 200 }),
    )

    try {
      await request('/items')
      expect.fail('should have thrown')
    } catch (err) {
      expect((err as ApiError).message).toBe('Request failed')
    }
  })

  it('setBaseUrl changes URL prefix', async () => {
    setBaseUrl('/custom-api')
    vi.mocked(fetch).mockResolvedValue(mockResponse({ success: true, data: {} }))

    await request('/items')

    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe('/custom-api/items')
  })

  it('buildHeaders returns auth headers with extras', () => {
    setTokenProvider(() => 'abc')
    const headers = buildHeaders({ 'X-Custom': 'yes' })
    expect(headers['Authorization']).toBe('Bearer abc')
    expect(headers['X-Custom']).toBe('yes')
  })

  it('notifyUnauthorized invokes registered handler', () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    notifyUnauthorized()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('notifyUnauthorized is safe when no handler registered', () => {
    setUnauthorizedHandler(null)
    expect(() => notifyUnauthorized()).not.toThrow()
  })

  it('attemptTokenRefresh returns false when no handler registered', async () => {
    setTokenRefreshHandler(null as never)
    const result = await attemptTokenRefresh()
    expect(result).toBe(false)
  })

  it('attemptTokenRefresh returns false when handler throws', async () => {
    setTokenRefreshHandler(async () => { throw new Error('refresh failed') })
    const result = await attemptTokenRefresh()
    expect(result).toBe(false)
  })
})
