/**
 * apiKeyApi unit tests
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/shared/request', () => ({
  request: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

import { request } from '@/api/shared/request'
import {
  createApiKey,
  getApiKeys,
  updateApiKeyStatus,
  deleteApiKey,
  type ApiKeyItem,
} from '@/api/apiKeyApi'

const mockedRequest = vi.mocked(request)

const sampleKey: ApiKeyItem = {
  id: 'k1',
  name: 'My Key',
  key: 'sk-xxxxxxxxxxxxxxxx',
  tenantId: 't1',
  createdBy: 'u1',
  permissions: ['ai:invoke'],
  status: 'active',
  lastUsedAt: null,
  expiresAt: null,
  createdAt: '2026-07-21T00:00:00Z',
  updatedAt: '2026-07-21T00:00:00Z',
}

describe('apiKeyApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createApiKey POSTs payload', async () => {
    mockedRequest.mockResolvedValue(sampleKey)

    await createApiKey({ name: 'My Key', permissions: ['ai:invoke'] })
    expect(mockedRequest).toHaveBeenCalledWith('/keys', {
      method: 'POST',
      body: { name: 'My Key', permissions: ['ai:invoke'] },
    })
  })

  it('getApiKeys fetches without params', async () => {
    mockedRequest.mockResolvedValue({ items: [sampleKey], total: 1, page: 1, pageSize: 20, totalPages: 1 })

    await getApiKeys()
    expect(mockedRequest).toHaveBeenCalledWith('/keys')
  })

  it('getApiKeys builds query string from params', async () => {
    mockedRequest.mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 10, totalPages: 0 })

    await getApiKeys({ page: 2, pageSize: 10, status: 'disabled' })
    expect(mockedRequest).toHaveBeenCalledWith('/keys?page=2&pageSize=10&status=disabled')
  })

  it('getApiKeys omits falsy params', async () => {
    mockedRequest.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })

    await getApiKeys({ page: 0, pageSize: 0 })
    expect(mockedRequest).toHaveBeenCalledWith('/keys')
  })

  it('updateApiKeyStatus PATCHes status with encoded id', async () => {
    mockedRequest.mockResolvedValue({ ...sampleKey, status: 'disabled' })

    await updateApiKeyStatus('k1', 'disabled')
    expect(mockedRequest).toHaveBeenCalledWith('/keys/k1/status', {
      method: 'PATCH',
      body: { status: 'disabled' },
    })
  })

  it('updateApiKeyStatus encodes special chars in id', async () => {
    mockedRequest.mockResolvedValue(sampleKey)

    await updateApiKeyStatus('id/slash', 'active')
    expect(mockedRequest).toHaveBeenCalledWith('/keys/id%2Fslash/status', expect.objectContaining({ method: 'PATCH' }))
  })

  it('deleteApiKey sends DELETE with encoded id', async () => {
    mockedRequest.mockResolvedValue(undefined)

    await deleteApiKey('k1')
    expect(mockedRequest).toHaveBeenCalledWith('/keys/k1', { method: 'DELETE' })
  })
})
