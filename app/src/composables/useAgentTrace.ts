/**
 * useAgentTrace — 管理 harness 轨迹状态
 *
 * 功能：
 * - 管理轨迹数据
 * - 提供刷新方法
 * - 支持实时更新（通过 SSE）
 */

import { ref, onUnmounted, type Ref } from 'vue'
import {
  fetchHarnessTrace,
  subscribeHarnessEvents,
  type HarnessSessionEvent,
  type AgentNodeTrace,
} from '@/api/harness'

export interface UseAgentTraceOptions {
  /** 自动刷新间隔（ms），0 表示不自动刷新 */
  autoRefreshInterval?: number
}

export function useAgentTrace(options: UseAgentTraceOptions = {}) {
  const { autoRefreshInterval = 0 } = options

  const trace: Ref<AgentNodeTrace | null> = ref(null)
  const loading = ref(false)
  const error: Ref<string | null> = ref(null)
  const asOfSeq = ref(-1)
  const liveEvents: Ref<HarnessSessionEvent[]> = ref([])

  let unsubscribe: (() => void) | null = null
  let refreshTimer: ReturnType<typeof setInterval> | null = null
  let currentSessionId: string | null = null

  /**
   * 刷新轨迹数据
   */
  async function refreshTrace(sessionId: string): Promise<void> {
    if (!sessionId) return

    loading.value = true
    error.value = null

    try {
      const resp = await fetchHarnessTrace(sessionId)
      trace.value = resp.trace
      asOfSeq.value = resp.asOfSeq
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      console.error('[useAgentTrace] Failed to fetch trace:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 订阅实时事件
   */
  async function subscribeEvents(sessionId: string): Promise<void> {
    // 清理之前的订阅
    disposeSubscription()

    try {
      unsubscribe = await subscribeHarnessEvents(sessionId, (events) => {
        liveEvents.value = [...liveEvents.value, ...events]
        // 收到新事件时自动刷新轨迹
        refreshTrace(sessionId).catch(() => {})
      })
    } catch (err) {
      console.error('[useAgentTrace] Failed to subscribe events:', err)
    }
  }

  /**
   * 开始跟踪一个会话
   */
  async function startTracking(sessionId: string): Promise<void> {
    currentSessionId = sessionId
    liveEvents.value = []
    trace.value = null
    asOfSeq.value = -1

    // 获取初始轨迹
    await refreshTrace(sessionId)

    // 订阅实时事件
    await subscribeEvents(sessionId)

    // 设置自动刷新
    if (autoRefreshInterval > 0) {
      stopAutoRefresh()
      refreshTimer = setInterval(() => {
        if (currentSessionId) {
          refreshTrace(currentSessionId).catch(() => {})
        }
      }, autoRefreshInterval)
    }
  }

  /**
   * 停止跟踪
   */
  function stopTracking(): void {
    disposeSubscription()
    stopAutoRefresh()
    currentSessionId = null
    trace.value = null
    asOfSeq.value = -1
    liveEvents.value = []
    error.value = null
  }

  /**
   * 清理订阅
   */
  function disposeSubscription(): void {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  /**
   * 停止自动刷新
   */
  function stopAutoRefresh(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  // 组件卸载时清理
  onUnmounted(() => {
    stopTracking()
  })

  return {
    /** 轨迹数据 */
    trace,
    /** 加载状态 */
    loading,
    /** 错误信息 */
    error,
    /** 当前序列号 */
    asOfSeq,
    /** 实时事件列表 */
    liveEvents,
    /** 开始跟踪会话 */
    startTracking,
    /** 停止跟踪 */
    stopTracking,
    /** 手动刷新轨迹 */
    refreshTrace: () => currentSessionId ? refreshTrace(currentSessionId) : Promise.resolve(),
  }
}