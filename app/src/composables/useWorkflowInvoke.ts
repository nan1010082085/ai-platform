/**
 * useWorkflowInvoke - 工作流 Open API 调用 + 轮询 + HITL 恢复
 *
 * 全链路优先走 Open API（X-Workflow-Key）：
 * 1. 触发调用 -> 2. 轮询执行结果 -> 3a. HITL waiting 时 Open API resume -> 3b. 继续轮询
 *
 * 降级策略：若 server 端 Open API resume/cancel 端点未实现（404），
 * 自动降级到 JWT 路径（resumeExecution / cancelExecution），保证功能可用。
 *
 * 视图只做渲染，本 composable 管理状态与 API 调用。
 */
import { ref, computed, getCurrentInstance, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  invokeWorkflowOpenApi,
  getInvokeExecutionOpenApi,
  resumeInvokeOpenApi,
  cancelInvokeOpenApi,
  type InvokeOpenApiResponse,
} from '@/api/workflowInvokeApi'
import { resumeExecution, cancelExecution as jwtCancelExecution } from '@/api/agentWorkflowApi'
import type { AgentWorkflowExecution } from '@/types/agentWorkflow'
import {
  extractWorkflowWaitingHitl,
  isWorkflowHitlApprovalMessage,
  type WorkflowWaitingHitl,
} from '@/utils/workflowChatResponse'
import { resolveErrorText } from '@/constants/errorCodes'

const DEFAULT_POLL_INTERVAL_MS = 1500
const DEFAULT_MAX_POLL_ATTEMPTS = 60

/** 轮询视为结束的终态（waiting 除外，需人工确认后 resume） */
const TERMINAL_POLL_STATUSES = new Set(['success', 'error', 'cancelled'])

export interface UseWorkflowInvokeOpts {
  pollIntervalMs?: number
  maxAttempts?: number
}

export interface ResumeHitlOpts {
  approved: boolean
  comment?: string
  answers?: Record<string, string>
}

export function useWorkflowInvoke(opts?: UseWorkflowInvokeOpts) {
  const invoking = ref(false)
  const resuming = ref(false)
  const cancelling = ref(false)
  const response = ref<InvokeOpenApiResponse | null>(null)
  const execution = ref<AgentWorkflowExecution | null>(null)
  /** 轮询错误（非静默）：网络异常 / 轮询接口报错 / 超时 */
  const pollError = ref<string | null>(null)
  /** 是否已降级到 JWT（Open API 端点未实现时） */
  const usingJwtFallback = ref(false)

  const pollIntervalMs = opts?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const maxAttempts = opts?.maxAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS
  let pollTimer: ReturnType<typeof setInterval> | null = null
  /** 当前 Open API 调用密钥 */
  let lastInvokeKey = ''

  /** HITL waiting 快照（与 Chat message 模板一致） */
  const pendingHitl = computed<WorkflowWaitingHitl | null>(() =>
    execution.value ? extractWorkflowWaitingHitl(execution.value) : null,
  )

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  /**
   * 触发 Open API 调用，成功后自动开始轮询。
   * @returns 是否成功触发（已开始轮询）
   */
  async function invoke(
    slugOrId: string,
    invokeKey: string,
    message: string,
  ): Promise<boolean> {
    if (!slugOrId) {
      ElMessage.warning('未选择工作流')
      return false
    }
    if (!invokeKey) {
      ElMessage.warning('请输入调用密钥（X-Workflow-Key）')
      return false
    }

    invoking.value = true
    response.value = null
    execution.value = null
    pollError.value = null
    usingJwtFallback.value = false
    lastInvokeKey = invokeKey
    stopPoll()

    try {
      const res = await invokeWorkflowOpenApi(slugOrId, invokeKey, { message })
      response.value = res
      if (res.success && res.data?.executionId) {
        if (res.data.execution) {
          execution.value = res.data.execution
          if (res.data.execution.status === 'waiting') {
            ElMessage.info('工作流等待人工确认')
            return true
          }
          if (TERMINAL_POLL_STATUSES.has(res.data.execution.status)) {
            if (res.data.execution.status === 'error') ElMessage.error('工作流执行失败')
            return true
          }
        }
        startPoll(res.data.executionId, invokeKey)
        return true
      }
      ElMessage.error(res.error?.message || '调用失败')
      return false
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      ElMessage.error(`调用异常: ${msg}`)
      return false
    } finally {
      invoking.value = false
    }
  }

  function startPoll(executionId: string, invokeKey: string) {
    stopPoll()
    let attempts = 0
    pollTimer = setInterval(async () => {
      attempts += 1
      try {
        const res = await getInvokeExecutionOpenApi(executionId, invokeKey)
        if (!res.success || !res.data) {
          pollError.value = res.error?.message || '轮询失败：未返回执行数据'
          stopPoll()
          return
        }
        execution.value = res.data
        const status = res.data.status
        if (status === 'waiting') {
          stopPoll()
          ElMessage.info('工作流等待人工确认')
          return
        }
        if (TERMINAL_POLL_STATUSES.has(status)) {
          stopPoll()
          if (status === 'error') ElMessage.error('工作流执行失败')
        } else if (attempts >= maxAttempts) {
          stopPoll()
          pollError.value = `轮询超时（${maxAttempts} 次 × ${pollIntervalMs}ms）`
        }
      } catch (err) {
        pollError.value = err instanceof Error ? err.message : String(err)
        stopPoll()
      }
    }, pollIntervalMs)
  }

  /**
   * 恢复 HITL waiting：优先 Open API resume，404 时降级到 JWT resume。
   */
  async function resumeHitl(resumeOpts: ResumeHitlOpts): Promise<boolean> {
    const execId = execution.value?.id
    if (!execId) {
      ElMessage.warning('没有可恢复的执行')
      return false
    }
    if (execution.value?.status !== 'waiting') {
      ElMessage.warning('当前执行不在等待确认状态')
      return false
    }
    if (!lastInvokeKey) {
      ElMessage.warning('缺少调用密钥，无法恢复')
      return false
    }

    resuming.value = true
    pollError.value = null
    stopPoll()

    try {
      let updated: AgentWorkflowExecution | null = null

      if (!usingJwtFallback.value) {
        // 优先走 Open API
        const res = await resumeInvokeOpenApi(execId, lastInvokeKey, {
          approved: resumeOpts.approved,
          comment: resumeOpts.comment ?? '',
          answers: resumeOpts.answers ?? {},
        })
        if (res.success && res.data) {
          updated = res.data
        } else if (res.error?.code === 'not_found' || res.error?.message?.includes('not found')) {
          // Open API 端点未实现，降级到 JWT
          usingJwtFallback.value = true
          ElMessage.info('Open API resume 暂未实现，降级到平台 JWT 恢复')
        } else {
          ElMessage.error(res.error?.message || '恢复失败')
          return false
        }
      }

      if (!updated && usingJwtFallback.value) {
        // JWT 降级路径
        updated = await resumeExecution(execId, {
          approved: resumeOpts.approved,
          comment: resumeOpts.comment ?? '',
          answers: resumeOpts.answers ?? {},
        })
        if (!updated) {
          ElMessage.error('恢复失败：执行不存在或不属于当前用户')
          return false
        }
      }

      if (!updated) {
        ElMessage.error('恢复失败：未获取到执行数据')
        return false
      }

      execution.value = updated
      ElMessage.success(resumeOpts.approved ? '已确认继续' : '已拒绝')

      if (updated.status === 'waiting') {
        return true
      }
      if (TERMINAL_POLL_STATUSES.has(updated.status)) {
        if (updated.status === 'error') ElMessage.error('工作流执行失败')
        return true
      }
      startPoll(updated.id, lastInvokeKey)
      return true
    } catch (err) {
      ElMessage.error(`确认失败: ${resolveErrorText(err, '网络异常')}`)
      return false
    } finally {
      resuming.value = false
    }
  }

  /**
   * 用 Chat 同款关键词 message（确认/拒绝）恢复 HITL。
   * @returns null 表示不是审批关键词；否则返回 resume 是否成功
   */
  async function resumeHitlByMessage(message: string): Promise<boolean | null> {
    const decision = isWorkflowHitlApprovalMessage(message)
    if (decision === null) return null
    return resumeHitl({
      approved: decision,
      comment: message.trim(),
    })
  }

  /**
   * 取消执行：优先 Open API cancel，404 时降级到 JWT cancel。
   */
  async function cancelExecution(reason?: string): Promise<boolean> {
    const execId = execution.value?.id
    if (!execId) {
      ElMessage.warning('没有可取消的执行')
      return false
    }
    if (!lastInvokeKey) {
      ElMessage.warning('缺少调用密钥')
      return false
    }

    cancelling.value = true
    stopPoll()

    try {
      let updated: AgentWorkflowExecution | null = null

      if (!usingJwtFallback.value) {
        const res = await cancelInvokeOpenApi(execId, lastInvokeKey, reason)
        if (res.success && res.data) {
          updated = res.data
        } else if (res.error?.code === 'not_found' || res.error?.message?.includes('not found')) {
          usingJwtFallback.value = true
          ElMessage.info('Open API cancel 暂未实现，降级到平台 JWT 取消')
        } else {
          ElMessage.error(res.error?.message || '取消失败')
          return false
        }
      }

      if (!updated && usingJwtFallback.value) {
        updated = await jwtCancelExecution(execId, reason)
        if (!updated) {
          ElMessage.error('取消失败：执行不存在或不可取消')
          return false
        }
      }

      if (!updated) {
        ElMessage.error('取消失败：未获取到执行数据')
        return false
      }

      execution.value = updated
      ElMessage.success('已取消执行')
      return true
    } catch (err) {
      ElMessage.error(`取消失败: ${resolveErrorText(err, '网络异常')}`)
      return false
    } finally {
      cancelling.value = false
    }
  }

  if (getCurrentInstance()) {
    onUnmounted(stopPoll)
  }

  return {
    invoking,
    resuming,
    cancelling,
    response,
    execution,
    pollError,
    pendingHitl,
    usingJwtFallback,
    invoke,
    resumeHitl,
    resumeHitlByMessage,
    cancelExecution,
    stopPoll,
  }
}
