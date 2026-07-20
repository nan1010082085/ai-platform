/**
 * blobRequest unit tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/shared/request'

vi.mock('@schema-platform/platform-shared/utils/authPaths', () => ({
  redirectToLogin: vi.fn(),
}))

vi.mock('@/api/shared/request', async () => {
  const actual = await vi.importActual<typeof import('@/api/shared/request')>('@/api/shared/request')
  return {
    ...actual,
    buildHeaders: vi.fn((extra?: Record<string, string>) => ({
      Authorization: 'Bearer test-token',
      ...extra,
    })),
  }
})

import { requestBlob, uploadBlob, triggerBlobDownload } from '@/api/shared/blobRequest'
import { redirectToLogin } from '@schema-platform/platform-shared/utils/authPaths'

describe('blobRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('requestBlob returns blob on success', async () => {
    const blob = new Blob(['hello'])
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => blob,
    } as Response)

    const result = await requestBlob('/ai/documents/1/file')
    expect(result).toBe(blob)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/ai/documents/1/file'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('requestBlob throws ApiError on failure', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ error: { message: 'missing' } }),
    } as Response)

    await expect(requestBlob('/ai/documents/missing/file')).rejects.toMatchObject({
      message: 'missing',
      status: 404,
    } satisfies Partial<ApiError>)
  })

  it('requestBlob redirects on 401 and notifies unauthorized handler', async () => {
    const { setUnauthorizedHandler } = await import('@/api/shared/request')
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({}),
    } as Response)

    await expect(requestBlob('/ai/documents/1/file')).rejects.toThrow('Authentication required')
    expect(onUnauthorized).toHaveBeenCalled()
    expect(redirectToLogin).toHaveBeenCalled()
    setUnauthorizedHandler(() => {})
  })

  it('uploadBlob unwraps success envelope', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { id: 'doc-1' } }),
    } as Response)

    const form = new FormData()
    form.append('file', new File(['x'], 'a.txt'))
    const result = await uploadBlob<{ id: string }>('/ai/documents/upload', form)
    expect(result).toEqual({ id: 'doc-1' })
  })

  it('uploadBlob throws when success=false', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: false, error: { message: 'bad file' } }),
    } as Response)

    await expect(uploadBlob('/ai/rag/upload', new FormData())).rejects.toThrow('bad file')
  })

  it('triggerBlobDownload creates object URL and clicks anchor', () => {
    const revoke = vi.fn()
    const create = vi.fn(() => 'blob:mock')
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.fn()
    const origCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click } as unknown as HTMLAnchorElement
      }
      return origCreate(tag)
    })

    triggerBlobDownload(new Blob(['x']), 'out.md')
    expect(create).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith('blob:mock')
  })
})
