/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getConversations, deleteConversation, publish, searchConversations, AiApiError } from '@/api/aiApi'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AiApiError', () => {
  it('stores status and message', () => {
    const err = new AiApiError('not found', 404)
    expect(err.message).toBe('not found')
    expect(err.status).toBe(404)
    expect(err.name).toBe('AiApiError')
  })
})

describe('getConversations', () => {
  it('returns data from response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { items: [{ id: '1', title: 'test' }], total: 1, page: 1, pageSize: 20, totalPages: 1 } }),
    })

    const result = await getConversations()
    expect(result).toEqual([{ id: '1', title: 'test' }])
  })

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Error',
      json: () => Promise.resolve({ success: false, error: { message: 'db error' } }),
    })

    await expect(getConversations()).rejects.toThrow('db error')
  })
})

describe('deleteConversation', () => {
  it('sends DELETE request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })

    await deleteConversation('conv-1')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/ai/conversations/conv-1'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('publish', () => {
  it('sends publish request and returns data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: 's1', publishId: 'p1' } }),
    })

    const result = await publish({
      conversationId: 'conv-1',
      type: 'schema',
      payload: [{ id: '1', type: 'input' }],
    })

    expect(result).toEqual({ id: 's1', publishId: 'p1' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/ai/publish'),
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('searchConversations', () => {
  it('sends search params and returns data', async () => {
    const mockData = {
      conversations: [{ id: '1', title: 'test' }],
      total: 1,
      page: 1,
      pageSize: 20,
    }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockData }),
    })

    const result = await searchConversations({ keyword: 'test' })
    expect(result).toEqual(mockData)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('keyword=test'),
      expect.any(Object),
    )
  })

  it('sends all params when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { conversations: [], total: 0, page: 2, pageSize: 10 } }),
    })

    await searchConversations({
      keyword: 'hello',
      startDate: '2026-01-01',
      endDate: '2026-06-01',
      source: 'editor',
      page: 2,
      pageSize: 10,
    })

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('keyword=hello')
    expect(calledUrl).toContain('source=editor')
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('pageSize=10')
  })

  it('omits empty params', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { conversations: [], total: 0, page: 1, pageSize: 20 } }),
    })

    await searchConversations({})
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/ai/conversations/search'),
      expect.any(Object),
    )
  })

  it('throws on error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Error',
      json: () => Promise.resolve({ success: false, error: { message: 'search failed' } }),
    })

    await expect(searchConversations({ keyword: 'test' })).rejects.toThrow('search failed')
  })
})
