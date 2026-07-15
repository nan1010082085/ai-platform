import {
  emitWorkflowSubscribe,
  emitWorkflowUnsubscribe,
  onWorkflowEvent,
  onWorkflowError,
  isConnected,
  connect,
} from '@schema-platform/platform-shared/socket'
import type { AgentWorkflowExecution } from '@/types/agentWorkflow'

const TERMINAL_STATUSES = new Set(['success', 'error', 'waiting', 'cancelled'])

const WORKFLOW_WAIT_TIMEOUT_MS = 10 * 60 * 1000

function ensureSocketConnected(): void {
  if (!isConnected()) {
    connect()
  }
}

/**
 * 订阅单次执行的 workflow:event（不等待终态）。用于执行详情页等。
 */
export function subscribeWorkflowExecution(
  executionId: string,
  onUpdate: (execution: AgentWorkflowExecution) => void,
): () => void {
  ensureSocketConnected()

  const offEvent = onWorkflowEvent((event) => {
    if (event.executionId !== executionId) return
    onUpdate(event.execution as unknown as AgentWorkflowExecution)
  })

  const offError = onWorkflowError((err) => {
    if (err.executionId && err.executionId !== executionId) return
    console.warn('[workflow] subscribe error:', err.message)
  })

  emitWorkflowSubscribe({ executionId })

  return () => {
    offEvent()
    offError()
    emitWorkflowUnsubscribe({ executionId })
  }
}

/**
 * 订阅多个 running 执行，状态变更时回调；终态自动取消订阅。
 */
export function watchRunningWorkflowExecutions(
  getExecutionIds: () => string[],
  onUpdate: (execution: AgentWorkflowExecution) => void,
): () => void {
  ensureSocketConnected()
  const active = new Map<string, () => void>()

  function sync() {
    const wanted = new Set(getExecutionIds())

    for (const [id, unsub] of active) {
      if (!wanted.has(id)) {
        unsub()
        active.delete(id)
      }
    }

    for (const id of wanted) {
      if (active.has(id)) continue
      const unsub = subscribeWorkflowExecution(id, (execution) => {
        onUpdate(execution)
        if (TERMINAL_STATUSES.has(execution.status)) {
          unsub()
          active.delete(id)
        }
      })
      active.set(id, unsub)
    }
  }

  sync()

  return () => {
    for (const unsub of active.values()) unsub()
    active.clear()
  }
}

/**
 * 通过 WebSocket 等待工作流执行到达终态，替代 REST 轮询。
 */
export function waitForWorkflowExecution(
  executionId: string,
  isAborted: () => boolean,
  onProgress?: (execution: AgentWorkflowExecution) => void,
): Promise<AgentWorkflowExecution> {
  ensureSocketConnected()

  return new Promise((resolve, reject) => {
    let settled = false
    let abortTimer: ReturnType<typeof setInterval> | null = null
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (abortTimer) clearInterval(abortTimer)
      if (timeoutTimer) clearTimeout(timeoutTimer)
      offEvent()
      offError()
      emitWorkflowUnsubscribe({ executionId })
    }

    const finish = (execution: AgentWorkflowExecution) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(execution)
    }

    const fail = (message: string) => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error(message))
    }

    const offEvent = onWorkflowEvent((event) => {
      if (event.executionId !== executionId) return
      const execution = event.execution as unknown as AgentWorkflowExecution
      onProgress?.(execution)
      if (TERMINAL_STATUSES.has(execution.status)) {
        finish(execution)
      }
    })

    const offError = onWorkflowError((err) => {
      if (err.executionId && err.executionId !== executionId) return
      fail(err.message || '工作流订阅失败')
    })

    abortTimer = setInterval(() => {
      if (isAborted()) {
        fail('已停止生成')
      }
    }, 200)

    timeoutTimer = setTimeout(() => {
      fail('工作流执行超时')
    }, WORKFLOW_WAIT_TIMEOUT_MS)

    emitWorkflowSubscribe({ executionId })
  })
}
