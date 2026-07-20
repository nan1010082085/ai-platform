/**
 * AI 前端埋点与错误上报 — 复用 platform-shared telemetry
 *
 * 关键路径：发对话 / 选模板 / 发布工作流 / 执行失败 / 插件启用
 * server 端点未就绪时自动缓冲到 localStorage。
 */

import {
  track as sharedTrack,
  reportError as sharedReportError,
  flush,
  initTelemetry,
} from '@schema-platform/platform-shared'

export const AI_TELEMETRY_EVENTS = {
  CHAT_SEND: 'ai.chat.send',
  TEMPLATE_SELECT: 'ai.workflow.template_select',
  WORKFLOW_PUBLISH: 'ai.workflow.publish',
  WORKFLOW_EXECUTE_FAIL: 'ai.workflow.execute_fail',
  PLUGIN_ENABLE: 'ai.plugin.enable',
  WS_DISCONNECT: 'ai.ws.disconnect',
  WS_RETRY_FAIL: 'ai.ws.retry_fail',
} as const

let initialized = false
let onWindowError: ((event: ErrorEvent) => void) | null = null
let onUnhandledRejection: ((event: PromiseRejectionEvent) => void) | null = null

export function trackAi(name: string, properties?: Record<string, unknown>): void {
  sharedTrack(name, properties)
}

export function reportAiError(error: Error | string, context?: Record<string, unknown>): Promise<void> {
  return sharedReportError(error, context)
}

export function initAiTelemetry(): void {
  initTelemetry()

  if (typeof window === 'undefined') return
  if (initialized) return
  initialized = true

  onWindowError = (event) => {
    void reportAiError(event.error ?? event.message, {
      source: 'window.error',
      filename: event.filename,
      lineno: event.lineno,
    })
  }

  onUnhandledRejection = (event) => {
    const reason = event.reason
    void reportAiError(
      reason instanceof Error ? reason : String(reason),
      { source: 'unhandledrejection' },
    )
  }

  window.addEventListener('error', onWindowError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)
}

/** Remove global handlers (qiankun unmount / HMR). Safe to call repeatedly. */
export function disposeAiTelemetry(): void {
  if (typeof window === 'undefined' || !initialized) return
  if (onWindowError) window.removeEventListener('error', onWindowError)
  if (onUnhandledRejection) window.removeEventListener('unhandledrejection', onUnhandledRejection)
  onWindowError = null
  onUnhandledRejection = null
  initialized = false
}

export { flush }
