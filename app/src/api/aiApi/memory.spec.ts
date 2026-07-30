/**
 * memory.ts API 单测：长程记忆 recall/write/list/delete。
 * mock ./base 的 request，验证调用参数（含默认值 namespace=all/limit=5/importance=0.5）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }))

vi.mock('./base', () => ({ request: requestMock }))

import { recallMemory, writeMemory, listMemory, deleteMemory } from './memory'

describe('memory API', () => {
  beforeEach(() => {
    requestMock.mockReset()
  })

  it('recallMemory: POST /ai/memory/recall，默认 namespace=all/limit=5', async () => {
    requestMock.mockResolvedValue([])
    await recallMemory({ query: '偏好' })
    expect(requestMock).toHaveBeenCalledWith('/ai/memory/recall', {
      method: 'POST',
      body: { query: '偏好', userId: undefined, namespace: 'all', limit: 5 },
    })
  })

  it('recallMemory: 自定义 namespace/limit/userId', async () => {
    requestMock.mockResolvedValue([])
    await recallMemory({ query: 'q', namespace: 'fact', limit: 10, userId: 'u1' })
    expect(requestMock).toHaveBeenCalledWith('/ai/memory/recall', {
      method: 'POST',
      body: { query: 'q', userId: 'u1', namespace: 'fact', limit: 10 },
    })
  })

  it('writeMemory: POST /ai/memory，默认 importance=0.5', async () => {
    requestMock.mockResolvedValue({ id: 'm1' })
    await writeMemory({ content: '喜欢深色', namespace: 'preference' })
    expect(requestMock).toHaveBeenCalledWith('/ai/memory', {
      method: 'POST',
      body: {
        content: '喜欢深色', userId: undefined, namespace: 'preference',
        importance: 0.5, source: undefined,
      },
    })
  })

  it('writeMemory: 自定义 importance/source', async () => {
    requestMock.mockResolvedValue({ id: 'm1' })
    await writeMemory({
      content: 'c', namespace: 'event', importance: 0.9,
      source: { conversationId: 'c1', messageId: 'm1' },
    })
    expect(requestMock).toHaveBeenCalledWith('/ai/memory', {
      method: 'POST',
      body: {
        content: 'c', userId: undefined, namespace: 'event', importance: 0.9,
        source: { conversationId: 'c1', messageId: 'm1' },
      },
    })
  })

  it('listMemory: GET /ai/memory?userId=', async () => {
    requestMock.mockResolvedValue([])
    await listMemory('u1')
    expect(requestMock).toHaveBeenCalledWith('/ai/memory?userId=u1')
  })

  it('deleteMemory: DELETE /ai/memory/:id', async () => {
    requestMock.mockResolvedValue({ id: 'm1', deleted: true })
    await deleteMemory('m1')
    expect(requestMock).toHaveBeenCalledWith('/ai/memory/m1', { method: 'DELETE' })
  })

  it('deleteMemory: id 编码特殊字符', async () => {
    requestMock.mockResolvedValue({ id: 'a b', deleted: true })
    await deleteMemory('a b')
    expect(requestMock).toHaveBeenCalledWith('/ai/memory/a%20b', { method: 'DELETE' })
  })
})
