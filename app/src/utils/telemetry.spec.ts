import { beforeEach, describe, expect, it, vi } from 'vitest'

const track = vi.fn()
const reportError = vi.fn().mockResolvedValue(undefined)
const initTelemetry = vi.fn()
const flush = vi.fn()

vi.mock('@schema-platform/platform-shared', () => ({
  track,
  reportError,
  initTelemetry,
  flush,
}))

describe('ai telemetry', () => {
  beforeEach(() => {
    vi.resetModules()
    track.mockClear()
    reportError.mockClear()
    initTelemetry.mockClear()
  })

  it('trackAi forwards to shared track', async () => {
    const { trackAi, AI_TELEMETRY_EVENTS } = await import('@/utils/telemetry')
    trackAi(AI_TELEMETRY_EVENTS.CHAT_SEND, { conversationId: 'c1' })
    expect(track).toHaveBeenCalledWith('ai.chat.send', { conversationId: 'c1' })
  })

  it('reportAiError forwards to shared reportError', async () => {
    const { reportAiError } = await import('@/utils/telemetry')
    await reportAiError(new Error('boom'), { where: 'test' })
    expect(reportError).toHaveBeenCalled()
  })

  it('initAiTelemetry calls initTelemetry and registers global handlers once', async () => {
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const { initAiTelemetry, disposeAiTelemetry } = await import('@/utils/telemetry')
    initAiTelemetry()
    initAiTelemetry()
    expect(initTelemetry).toHaveBeenCalledTimes(2)
    expect(addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
    expect(addEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
    const errorCalls = addEventListener.mock.calls.filter((c) => c[0] === 'error')
    expect(errorCalls).toHaveLength(1)
    disposeAiTelemetry()
    expect(removeEventListener).toHaveBeenCalledWith('error', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
  })
})
