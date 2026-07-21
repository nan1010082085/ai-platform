/**
 * modelApi unit tests
 *
 * 覆盖 Model CRUD + test + getDefaultModel，mock request 层。
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
  listModels,
  getModel,
  createModel,
  updateModel,
  deleteModel,
  testModel,
  getDefaultModel,
  type Model,
  type CreateModelPayload,
  type UpdateModelPayload,
} from '@/api/modelApi'

const mockedRequest = vi.mocked(request)

const sampleModel: Model = {
  id: 'm1',
  name: 'DeepSeek V4 Flash',
  providerId: 'p1',
  model: 'deepseek-v4-flash',
  parameters: { temperature: 0.7, maxTokens: 4096 },
  capabilities: ['chat'],
  isDefault: true,
  isActive: true,
  createdAt: '2026-07-21T00:00:00Z',
  updatedAt: '2026-07-21T00:00:00Z',
}

describe('modelApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listModels fetches all models without filter', async () => {
    mockedRequest.mockResolvedValue([sampleModel])

    const result = await listModels()
    expect(result).toEqual([sampleModel])
    expect(mockedRequest).toHaveBeenCalledWith('/models')
  })

  it('listModels appends providerId query param when provided', async () => {
    mockedRequest.mockResolvedValue([sampleModel])

    await listModels('p1')
    expect(mockedRequest).toHaveBeenCalledWith('/models?providerId=p1')
  })

  it('getModel finds model by id from list', async () => {
    mockedRequest.mockResolvedValue([sampleModel, { ...sampleModel, id: 'm2' }])

    const result = await getModel('m2')
    expect(result.id).toBe('m2')
  })

  it('getModel throws ApiError when model not found', async () => {
    mockedRequest.mockResolvedValue([sampleModel])

    await expect(getModel('nonexistent')).rejects.toMatchObject({ status: 404 })
  })

  it('createModel POSTs payload', async () => {
    const payload: CreateModelPayload = {
      name: 'DALL-E 3',
      providerId: 'p2',
      model: 'dall-e-3',
      capabilities: ['image', 'chat'],
      isDefault: false,
    }
    mockedRequest.mockResolvedValue({ ...sampleModel, ...payload, id: 'm3' })

    const result = await createModel(payload)
    expect(result.model).toBe('dall-e-3')
    expect(mockedRequest).toHaveBeenCalledWith('/models', { method: 'POST', body: payload })
  })

  it('updateModel PUTs payload with encoded id', async () => {
    const payload: UpdateModelPayload = { capabilities: ['image'] }
    mockedRequest.mockResolvedValue({ ...sampleModel, capabilities: ['image'] })

    await updateModel('m1', payload)
    expect(mockedRequest).toHaveBeenCalledWith('/models/m1', { method: 'PUT', body: payload })
  })

  it('updateModel encodes special characters in id', async () => {
    mockedRequest.mockResolvedValue(sampleModel)

    await updateModel('id with space', { isActive: false })
    expect(mockedRequest).toHaveBeenCalledWith('/models/id%20with%20space', expect.objectContaining({ method: 'PUT' }))
  })

  it('deleteModel sends DELETE with encoded id', async () => {
    mockedRequest.mockResolvedValue(undefined)

    await deleteModel('m1')
    expect(mockedRequest).toHaveBeenCalledWith('/models/m1', { method: 'DELETE' })
  })

  it('testModel POSTs default message when none provided', async () => {
    const reply = { reply: 'OK', tokens: 5, model: 'deepseek-v4-flash', provider: 'deepseek' }
    mockedRequest.mockResolvedValue(reply)

    const result = await testModel('m1')
    expect(result).toEqual(reply)
    expect(mockedRequest).toHaveBeenCalledWith('/models/m1/test', {
      method: 'POST',
      body: { message: 'Hello, respond with OK' },
    })
  })

  it('testModel POSTs custom message when provided', async () => {
    mockedRequest.mockResolvedValue({ reply: 'hi', tokens: 1, model: 'm', provider: 'p' })

    await testModel('m1', 'ping')
    expect(mockedRequest).toHaveBeenCalledWith('/models/m1/test', {
      method: 'POST',
      body: { message: 'ping' },
    })
  })

  it('getDefaultModel returns isDefault model', async () => {
    const nonDefault = { ...sampleModel, id: 'm2', isDefault: false }
    mockedRequest.mockResolvedValue([nonDefault, sampleModel])

    const result = await getDefaultModel()
    expect(result).not.toBeNull()
    expect(result!.isDefault).toBe(true)
  })

  it('getDefaultModel returns null when no default exists', async () => {
    mockedRequest.mockResolvedValue([{ ...sampleModel, isDefault: false }])

    const result = await getDefaultModel()
    expect(result).toBeNull()
  })
})
