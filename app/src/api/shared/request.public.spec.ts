/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('request public option', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('public:true 时 401 不跳登录，直接抛错', async () => {
    const redirectToLogin = vi.fn()
    vi.doMock('@schema-platform/platform-shared/utils/authPaths', () => ({
      redirectToLogin,
    }))

    const fetchMock = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'Authentication required' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { request, ApiError } = await import('@/api/shared/request')
    await expect(request('/ai/conversations/shared/x', { public: true })).rejects.toBeInstanceOf(ApiError)
    expect(redirectToLogin).not.toHaveBeenCalled()
  })
})
