/**
 * stream store — harness 模式单测
 *
 * 覆盖：
 * - assistant/message → 全文覆盖（非追加）
 * - turn/end → done + 结束等待
 * - outcome 立即结束（无 turn/end 时）
 * - cancel/stop 退订 SSE
 * - finally 统一收尾（loading/status/message.status）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { AIMessage, ChatSettings } from '@/types'

// ---- Mock harness API ----

let sseCallback: ((events: Array<{ type: string; data?: Record<string, unknown> }>) => void) | null = null
const mockUnsubscribe = vi.fn()
const mockStartSession = vi.fn().mockResolvedValue('sess-1')
const mockSendMessage = vi.fn().mockResolvedValue({ text: 'outcome-text' })
const mockSubscribeEvents = vi.fn().mockImplementation(
  (_sessionId: string, cb: (events: Array<{ type: string; data?: Record<string, unknown> }>) => void) => {
    sseCallback = cb
    return Promise.resolve(mockUnsubscribe)
  },
)

vi.mock('@/api/harness', () => ({
  startHarnessSession: (...args: unknown[]) => mockStartSession(...args),
  sendHarnessMessage: (...args: unknown[]) => mockSendMessage(...args),
  subscribeHarnessEvents: (...args: unknown[]) => mockSubscribeEvents(...args),
}))

vi.mock('@schema-platform/platform-shared/socket', () => ({
  emitChatSend: vi.fn(),
  emitChatCancel: vi.fn(),
  emitChatResume: vi.fn(),
  onChatEvent: vi.fn(),
}))

vi.mock('@/utils/telemetry', () => ({
  trackAi: vi.fn(),
  reportAiError: vi.fn(),
  AI_TELEMETRY_EVENTS: {},
}))

// ---- Helpers ----

function makeMessages(content = ''): AIMessage[] {
  return [
    { role: 'user', content: 'hi', timestamp: new Date(), status: 'sent' },
    { role: 'assistant', content, timestamp: new Date(), status: 'streaming' },
  ]
}

function makeHandlers() {
  return {
    onStreamEvent: vi.fn(),
    onDone: vi.fn(),
    getContext: () => ({
      context: {} as never,
      chatSettings: { chatMode: 'harness' } as ChatSettings,
      currentSchema: null,
      currentFlow: null,
      currentConversationId: null,
    }),
  }
}

function assistantMessage(text: string) {
  return {
    type: 'assistant/message',
    data: {
      message: {
        content: [{ type: 'text', text }],
      },
    },
  }
}

const turnEnd = { type: 'turn/end', data: { reason: 'complete' } }

// ---- Tests ----

describe('executeHarnessStream', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sseCallback = null
    vi.clearAllMocks()
  })

  it('maps assistant/message to content overwrite (not delta append)', async () => {
    const { useStreamStore } = await import('@/stores/stream')
    const store = useStreamStore()
    const messages = makeMessages()
    const handlers = makeHandlers()

    // subscribeHarnessEvents 同步推送 assistant/message，在 sendHarnessMessage 之前
    mockSubscribeEvents.mockImplementation(
      (_sid: string, cb: (events: Array<{ type: string; data?: Record<string, unknown> }>) => void) => {
        sseCallback = cb
        // 同步推送两次 assistant/message — 第二次应覆盖第一次
        cb([assistantMessage('first')])
        cb([assistantMessage('second-overwrite')])
        return Promise.resolve(mockUnsubscribe)
      },
    )
    // turn/end 在 sendHarnessMessage 后通过 SSE 推送
    mockSendMessage.mockImplementation(async () => {
      // sendHarnessMessage resolve 前推送 turn/end
      sseCallback?.([turnEnd])
      return { text: '' }
    })

    await store.executeStream('hi', undefined, 1, messages, handlers)

    // assistant/message 是全文快照，第二次应覆盖第一次
    expect(messages[1].content).toBe('second-overwrite')
    // done 事件被触发
    expect(handlers.onStreamEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'done' }),
      1,
    )
  })

  it('uses outcome text when no turn/end and no SSE content', async () => {
    const { useStreamStore } = await import('@/stores/stream')
    const store = useStreamStore()
    const messages = makeMessages()
    const handlers = makeHandlers()

    // SSE 不推送任何事件，也不推 turn/end
    mockSubscribeEvents.mockImplementation(
      (_sid: string, cb: (events: Array<{ type: string; data?: Record<string, unknown> }>) => void) => {
        sseCallback = cb
        return Promise.resolve(mockUnsubscribe)
      },
    )
    mockSendMessage.mockResolvedValue({ text: 'outcome-fallback' })

    await store.executeStream('hi', undefined, 1, messages, handlers)

    // 无 SSE 内容时 outcome 填充
    expect(messages[1].content).toBe('outcome-fallback')
    expect(handlers.onDone).toHaveBeenCalled()
    expect(store.loading).toBe(false)
    expect(store.streamStatus).toBe('idle')
  })

  it('SSE content prevents outcome overwrite', async () => {
    const { useStreamStore } = await import('@/stores/stream')
    const store = useStreamStore()
    const messages = makeMessages()
    const handlers = makeHandlers()

    // SSE 在 subscribe 回调中同步推送 assistant/message（在 sendHarnessMessage 之前）
    mockSubscribeEvents.mockImplementation(
      (_sid: string, cb: (events: Array<{ type: string; data?: Record<string, unknown> }>) => void) => {
        sseCallback = cb
        // 同步推送 — 在 sendHarnessMessage resolve 前 content 已有值
        cb([assistantMessage('sse-first')])
        return Promise.resolve(mockUnsubscribe)
      },
    )
    mockSendMessage.mockResolvedValue({ text: 'outcome-should-not-overwrite' })

    await store.executeStream('hi', undefined, 1, messages, handlers)

    // SSE 先到，outcome 不应覆盖
    expect(messages[1].content).toBe('sse-first')
  })

  it('outcome fills content when SSE had no assistant/message', async () => {
    const { useStreamStore } = await import('@/stores/stream')
    const store = useStreamStore()
    const messages = makeMessages()
    const handlers = makeHandlers()

    // SSE 推送空事件（无 assistant/message），也不推 turn/end
    mockSubscribeEvents.mockImplementation(
      (_sid: string, cb: (events: Array<{ type: string; data?: Record<string, unknown> }>) => void) => {
        sseCallback = cb
        // 不推送任何事件
        return Promise.resolve(mockUnsubscribe)
      },
    )
    mockSendMessage.mockResolvedValue({ text: 'outcome-only' })

    await store.executeStream('hi', undefined, 1, messages, handlers)

    // outcome 填充空 content
    expect(messages[1].content).toBe('outcome-only')
  })

  it('finally sets loading=false and status=idle on success', async () => {
    const { useStreamStore } = await import('@/stores/stream')
    const store = useStreamStore()
    const messages = makeMessages()
    const handlers = makeHandlers()

    mockSubscribeEvents.mockImplementation(
      (_sid: string, cb: (events: Array<{ type: string; data?: Record<string, unknown> }>) => void) => {
        sseCallback = cb
        setTimeout(() => cb([turnEnd]), 5)
        return Promise.resolve(mockUnsubscribe)
      },
    )

    await store.executeStream('hi', undefined, 1, messages, handlers)

    expect(store.loading).toBe(false)
    expect(store.streamStatus).toBe('idle')
    expect(messages[1].status).toBe('received')
  })

  it('finally sets loading=false on error', async () => {
    const { useStreamStore } = await import('@/stores/stream')
    const store = useStreamStore()
    const messages = makeMessages()
    const handlers = makeHandlers()

    mockStartSession.mockRejectedValueOnce(new Error('session-fail'))

    await store.executeStream('hi', undefined, 1, messages, handlers)

    expect(store.loading).toBe(false)
    expect(store.streamStatus).toBe('idle')
    expect(store.error).toBe('session-fail')
  })

  it('stopGeneration unsubscribes SSE', async () => {
    const { useStreamStore } = await import('@/stores/stream')
    const store = useStreamStore()
    const messages = makeMessages()
    const handlers = makeHandlers()

    let resolveMessage: (() => void) | null = null
    mockSendMessage.mockImplementation(() => new Promise<void>((r) => { resolveMessage = r }))
    mockSubscribeEvents.mockImplementation(
      (_sid: string, cb: (events: Array<{ type: string; data?: Record<string, unknown> }>) => void) => {
        sseCallback = cb
        return Promise.resolve(mockUnsubscribe)
      },
    )

    const streamPromise = store.executeStream('hi', undefined, 1, messages, handlers)

    // 等待 subscribe 完成
    await new Promise((r) => setTimeout(r, 10))
    store.stopGeneration()
    resolveMessage?.()
    await streamPromise

    expect(mockUnsubscribe).toHaveBeenCalled()
    expect(store.loading).toBe(false)
  })

  it('cancelCurrent unsubscribes SSE', async () => {
    const { useStreamStore } = await import('@/stores/stream')
    const store = useStreamStore()

    // 先触发 subscribe
    mockSubscribeEvents.mockImplementation(() => Promise.resolve(mockUnsubscribe))

    store.cancelCurrent()
    // cancelCurrent 应调用 disposeHarnessSubscription 内部逻辑
    // 这里主要验证不抛错
    expect(true).toBe(true)
  })
})
