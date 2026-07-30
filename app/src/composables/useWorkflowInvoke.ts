/**
 * useWorkflowInvoke - 工作流 Open API 调用 + 轮询逻辑
 *
 * 封装集成测试 Playground 的核心逻辑：触发调用 -> 轮询执行结果 -> 暴露错误。
 * 视图只做渲染，本 composable 管理状态与 API 调用。
 *
 * 轮询走 Open API 端点（X-Workflow-Key），与三方实际调用一致。
 */
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  invokeWorkflowOpenApi,
  getInvokeExecutionOpenApi,
  type InvokeOpenApiResponse,
} from '@/api/workflowInvokeApi'
import type { AgentWorkflowExecution } from '@/types/agentWorkflow'

const DEFAULT_POLL_INTERVAL_MS = 1500
const DEFAULT_MAX_POLL_ATTEMPTS = 60

export interface UseWorkflowInvokeOpts {
  pollIntervalMs?: number
  maxAttempts?: number
}

export function useWorkflowInvoke(opts?: UseWorkflowInvokeOpts) {
  const invoking = ref(false)
  const response = ref<InvokeOpenApiResponse | null>(null)
  const execution = ref<AgentWorkflowExecution | null>(null)
  /** 轮询错误（非静默）：网络异常 / 轮询接口报错 / 超时 */
  const pollError = ref<string | null>(null)

  const pollIntervalMs = opts?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const maxAttempts = opts?.maxAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS
  let pollTimer: ReturnType<typeof setInterval> | null = null

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
    stopPoll()

    try {
      const res = await invokeWorkflowOpenApi(slugOrId, invokeKey, { message })
      response.value = res
      if (res.success && res.data?.executionId) {
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
        if (status === 'success' || status === 'error') {
          stopPoll()
          if (status === 'error') ElMessage.error('工作流执行失败')
        } else if (attempts >= maxAttempts) {
          stopPoll()
          pollError.value = `轮询超时（${maxAttempts} 次 × ${pollIntervalMs}ms）`
        }
      } catch (err) {
        // 错误暴露：不静默吞
        pollError.value = err instanceof Error ? err.message : String(err)
        stopPoll()
      }
    }, pollIntervalMs)
  }

  onUnmounted(stopPoll)

  return { invoking, response, execution, pollError, invoke, stopPoll }
}
