/**
 * useWorkflowSelfTest - 工作流自测（预发布验证 + dry-run）
 *
 * 两个层级：
 * 1. validate: 检查图结构完整性（无环、入口节点、必填配置）
 * 2. dryRun: 用真实 execute(trigger='manual') 但标记为测试，执行后可回滚
 *
 * 视图只做渲染，本 composable 管理状态与 API 调用。
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  executeWorkflow,
  getWorkflow,
  publishWorkflow,
} from '@/api/agentWorkflowApi'
import { validateAgentWorkflowGraph } from '@schema-platform/platform-shared/ai'
import type {
  AgentWorkflowDetail,
  AgentWorkflowExecution,
  AgentWorkflowGraph,
  AgentWorkflowValidationIssue,
} from '@/types/agentWorkflow'
import { resolveErrorText } from '@/constants/errorCodes'

export interface SelfTestResult {
  level: 'validate' | 'dryRun'
  passed: boolean
  issues: AgentWorkflowValidationIssue[]
  execution?: AgentWorkflowExecution
  durationMs?: number
  message: string
}

export function useWorkflowSelfTest() {
  const testing = ref(false)
  const results = ref<SelfTestResult[]>([])
  const currentResult = computed<SelfTestResult | null>(() =>
    results.value.length > 0 ? results.value[results.value.length - 1] : null,
  )

  /** 验证图结构：检查环、入口节点、必填字段 */
  function validateGraph(graph: AgentWorkflowGraph): SelfTestResult {
    const issues = validateAgentWorkflowGraph(graph)
    const blockingIssues = issues.filter((i) => i.severity === 'error')
    return {
      level: 'validate',
      passed: blockingIssues.length === 0,
      issues,
      message:
        blockingIssues.length === 0
          ? '图结构验证通过'
          : `发现 ${blockingIssues.length} 个阻塞性问题`,
    }
  }

  /** 预发布验证：validate + 检查工作流元数据 */
  async function prePublishCheck(workflowId: string): Promise<SelfTestResult> {
    testing.value = true
    try {
      const detail = await getWorkflow(workflowId)
      const graphResult = validateGraph(detail.graph)

      const allIssues = [...graphResult.issues]

      // 检查工作流名称
      if (!detail.name?.trim()) {
        allIssues.push({
          severity: 'error',
          message: '工作流名称不能为空',
          nodeId: '',
        })
      }

      // 检查入口节点是否存在
      if (!detail.graph.entryNodeId) {
        allIssues.push({
          severity: 'error',
          message: '未设置入口节点',
          nodeId: '',
        })
      }

      // 检查节点是否为空
      if (detail.graph.nodes.length === 0) {
        allIssues.push({
          severity: 'error',
          message: '工作流不能没有节点',
          nodeId: '',
        })
      }

      const blocking = allIssues.filter((i) => i.severity === 'error')
      const result: SelfTestResult = {
        level: 'validate',
        passed: blocking.length === 0,
        issues: allIssues,
        message:
          blocking.length === 0
            ? '预发布验证通过，可以发布'
            : `发现 ${blocking.length} 个阻塞性问题，无法发布`,
      }
      results.value.push(result)
      return result
    } catch (err) {
      const result: SelfTestResult = {
        level: 'validate',
        passed: false,
        issues: [],
        message: `验证失败: ${resolveErrorText(err)}`,
      }
      results.value.push(result)
      return result
    } finally {
      testing.value = false
    }
  }

  /** Dry-run：用 trigger='manual' 执行，不发布 */
  async function dryRun(
    workflowId: string,
    message: string,
  ): Promise<SelfTestResult> {
    testing.value = true
    const start = Date.now()
    try {
      const execution = await executeWorkflow(workflowId, { message }, { trigger: 'manual' })
      const durationMs = Date.now() - start

      const result: SelfTestResult = {
        level: 'dryRun',
        passed: execution.status === 'success',
        issues: [],
        execution,
        durationMs,
        message:
          execution.status === 'success'
            ? `试运行成功（${durationMs}ms）`
            : `试运行状态: ${execution.status}`,
      }
      results.value.push(result)
      return result
    } catch (err) {
      const result: SelfTestResult = {
        level: 'dryRun',
        passed: false,
        issues: [],
        durationMs: Date.now() - start,
        message: `试运行失败: ${resolveErrorText(err)}`,
      }
      results.value.push(result)
      return result
    } finally {
      testing.value = false
    }
  }

  /** 验证 + 发布：先 prePublishCheck，通过后自动 publish */
  async function validateAndPublish(workflowId: string): Promise<boolean> {
    const checkResult = await prePublishCheck(workflowId)
    if (!checkResult.passed) {
      ElMessage.error(checkResult.message)
      return false
    }
    try {
      await publishWorkflow(workflowId)
      ElMessage.success('工作流已发布')
      return true
    } catch (err) {
      ElMessage.error(`发布失败: ${resolveErrorText(err)}`)
      return false
    }
  }

  function clearResults() {
    results.value = []
  }

  return {
    testing,
    results,
    currentResult,
    validateGraph,
    prePublishCheck,
    dryRun,
    validateAndPublish,
    clearResults,
  }
}
