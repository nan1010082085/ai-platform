/**
 * providerApi unit tests
 *
 * 覆盖 Provider CRUD + test + remote-models + sync + listProvidersWithModels 聚合。
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
  listProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  testProvider,
  listRemoteModels,
  syncProviderModels,
  listProvidersWithModels,
  type Provider,
  type CreateProviderPayload,
  type UpdateProviderPayload,
  type Model,
} from '@/api/providerApi'

const mockedRequest = vi.mocked(request)

const sampleProvider: Provider = {
  id: 'p1',
  name: 'DeepSeek',
  type: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  isActive: true,
  createdAt: '2026-07-21T00:00:00Z',
  updatedAt: '2026-07-21T00:00:00Z',
}

const sampleModel: Model = {
  id: 'm1',
  name: 'DeepSeek V4 Flash',
  providerId: 'p1',
  model: 'deepseek-v4-flash',
  parameters: { temperature: 0.7 },
  capabilities: ['chat'],
  isDefault: true,
  isActive: true,
  createdAt: '2026-07-21T00:00:00Z',
  updatedAt: '2026-07-21T00:00:00Z',
}

describe('providerApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listProviders fetches /providers', async () => {
    mockedRequest.mockResolvedValue([sampleProvider])

    const result = await listProviders()
    expect(result).toEqual([sampleProvider])
    expect(mockedRequest).toHaveBeenCalledWith('/providers')
  })

  it('getProvider fetches by encoded id', async () => {
    mockedRequest.mockResolvedValue({ ...sampleProvider, apiKey: '****' })

    await getProvider('p1')
    expect(mockedRequest).toHaveBeenCalledWith('/providers/p1')
  })

  it('createProvider POSTs payload', async () => {
    const payload: CreateProviderPayload = {
      name: 'OpenAI',
      type: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-xxx',
    }
    mockedRequest.mockResolvedValue({ ...sampleProvider, ...payload, id: 'p2' })

    await createProvider(payload)
    expect(mockedRequest).toHaveBeenCalledWith('/providers', { method: 'POST', body: payload })
  })

  it('updateProvider PUTs payload with encoded id', async () => {
    const payload: UpdateProviderPayload = { isActive: false }
    mockedRequest.mockResolvedValue({ ...sampleProvider, isActive: false })

    await updateProvider('p1', payload)
    expect(mockedRequest).toHaveBeenCalledWith('/providers/p1', { method: 'PUT', body: payload })
  })

  it('deleteProvider sends DELETE', async () => {
    mockedRequest.mockResolvedValue(undefined)

    await deleteProvider('p1')
    expect(mockedRequest).toHaveBeenCalledWith('/providers/p1', { method: 'DELETE' })
  })

  it('testProvider POSTs default message', async () => {
    mockedRequest.mockResolvedValue({ reply: 'OK', tokens: 5, model: 'deepseek-v4-flash', provider: 'deepseek' })

    await testProvider('p1')
    expect(mockedRequest).toHaveBeenCalledWith('/providers/p1/test', {
      method: 'POST',
      body: { message: 'Hello, respond with OK' },
    })
  })

  it('testProvider POSTs custom message', async () => {
    mockedRequest.mockResolvedValue({ reply: 'hi', tokens: 1, model: 'm', provider: 'p' })

    await testProvider('p1', 'ping me')
    expect(mockedRequest).toHaveBeenCalledWith('/providers/p1/test', {
      method: 'POST',
      body: { message: 'ping me' },
    })
  })

  it('listRemoteModels fetches by encoded id', async () => {
    const remoteModels = [{ id: 'gpt-4o', name: 'GPT-4o' }]
    mockedRequest.mockResolvedValue(remoteModels)

    const result = await listRemoteModels('p1')
    expect(result).toEqual(remoteModels)
    expect(mockedRequest).toHaveBeenCalledWith('/providers/p1/remote-models')
  })

  it('syncProviderModels POSTs modelIds', async () => {
    mockedRequest.mockResolvedValue({ synced: 3, skipped: 1 })

    await syncProviderModels('p1', ['gpt-4o', 'gpt-4o-mini'])
    expect(mockedRequest).toHaveBeenCalledWith('/providers/p1/sync-models', {
      method: 'POST',
      body: { modelIds: ['gpt-4o', 'gpt-4o-mini'] },
    })
  })

  it('syncProviderModels sends null modelIds when not provided', async () => {
    mockedRequest.mockResolvedValue({ synced: 5, skipped: 0 })

    await syncProviderModels('p1')
    expect(mockedRequest).toHaveBeenCalledWith('/providers/p1/sync-models', {
      method: 'POST',
      body: { modelIds: undefined },
    })
  })

  it('listProvidersWithModels aggregates models by provider', async () => {
    const provider2 = { ...sampleProvider, id: 'p2', name: 'Mimo' }
    const model1 = { ...sampleModel, providerId: 'p1' }
    const model2 = { ...sampleModel, id: 'm2', providerId: 'p1', isDefault: false }
    const model3 = { ...sampleModel, id: 'm3', providerId: 'p2', model: 'mimo-v2.5' }

    mockedRequest
      .mockResolvedValueOnce([sampleProvider, provider2]) // listProviders
      .mockResolvedValueOnce([model1, model2, model3])    // request<Model[]>('/models')

    const result = await listProvidersWithModels()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('p1')
    expect(result[0].models).toHaveLength(2)
    expect(result[1].id).toBe('p2')
    expect(result[1].models).toHaveLength(1)
    expect(result[1].models[0].model).toBe('mimo-v2.5')
  })

  it('listProvidersWithModels handles provider with no models', async () => {
    mockedRequest
      .mockResolvedValueOnce([sampleProvider])
      .mockResolvedValueOnce([])

    const result = await listProvidersWithModels()
    expect(result).toHaveLength(1)
    expect(result[0].models).toEqual([])
  })
})
