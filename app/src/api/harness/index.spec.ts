/**
 * harness API 客户端单测（M6 v1）：端点拼接、鉴权头、错误暴露。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  startHarnessSession,
  sendHarnessMessage,
  fetchHarnessTrace,
  subscribeHarnessEvents,
} from './index'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

/** 最小 EventSource mock：捕获 url、onmessage 与 close */
class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  onmessage: ((message: MessageEvent) => void) | null = null
  closed = false
  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }
  close(): void {
    this.closed = true
  }
  emit(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent)
  }
}
vi.stubGlobal('EventSource', MockEventSource)

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  MockEventSource.instances.length = 0
})

describe('harness api client', () => {
  it('startHarnessSession POST 空体并返回 sessionId', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ sessionId: 'session-x' }))
    const id = await startHarnessSession()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/session/start')
    expect(init.method).toBe('POST')
    expect(init.headers.authorization).toBe('Bearer poc-token')
    expect(id).toBe('session-x')
  })

  it('sendHarnessMessage POST content 并返回 outcome', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ text: 'done', reason: { kind: 'completed' } }))
    const outcome = await sendHarnessMessage('session-x', 'hello')
    expect(String(fetchMock.mock.calls[0][0])).toContain('/session/session-x/message')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ content: 'hello' })
    expect(outcome.reason?.kind).toBe('completed')
  })

  it('fetchHarnessTrace GET 并返回投影', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      sessionId: 'session-x',
      asOfSeq: 12,
      trace: { turns: [], toolCalls: [], messages: [] },
    }))
    const resp = await fetchHarnessTrace('session-x')
    expect(String(fetchMock.mock.calls[0][0])).toContain('/session/session-x/trace')
    expect(resp.asOfSeq).toBe(12)
  })

  it('非 2xx 显式抛错并携带服务端信息', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'unknown session: x' }, 404))
    await expect(fetchHarnessTrace('x')).rejects.toThrow(/404/)
  })

  it('subscribeHarnessEvents 先签票据再经 EventSource 订阅，事件帧回调并退订关闭', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ticket: 'ticket-1' }))
    const received: string[][] = []
    const off = await subscribeHarnessEvents('session-x', (events) => {
      received.push(events.map((e) => e.type))
    })
    // 第一次 fetch 是票据签发（Bearer），EventSource 用 ticket 连接
    expect(String(fetchMock.mock.calls[0][0])).toContain('/session/session-x/events-ticket')
    const source = MockEventSource.instances[0]
    expect(source.url).toContain('/session/session-x/events?ticket=ticket-1')

    source.emit({ type: 'hello', sessionId: 'session-x' })
    expect(received).toHaveLength(0) // hello 帧不回调

    source.emit({ type: 'events', sessionId: 'session-x', events: [{ seq: 1, type: 'turn/start', data: {} }] })
    expect(received).toEqual([['turn/start']])

    off()
    expect(source.closed).toBe(true)
  })
})
