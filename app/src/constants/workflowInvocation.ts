/**
 * Agent Workflow 调用通道与执行触发方式（产品术语）
 *
 * - **画布入口节点**：manual-trigger / webhook-trigger，决定 DAG 从哪开始
 * - **执行触发方式 (trigger)**：记录在 execution 上，表示谁发起了这次运行
 */

import type { AgentWorkflowExecution } from '@/types/agentWorkflow'

export type ExecutionTrigger = AgentWorkflowExecution['trigger']

/** 执行记录上的 trigger 字段 → 中文 */
export const EXECUTION_TRIGGER_LABELS: Record<ExecutionTrigger, string> = {
  manual: '手动执行',
  webhook: 'Webhook',
  chat: 'AI 对话',
  api: 'API / 脚本',
}

export function getExecutionTriggerLabel(trigger: string | undefined): string {
  if (!trigger) return '未知'
  return EXECUTION_TRIGGER_LABELS[trigger as ExecutionTrigger] ?? trigger
}

/** 工作流级「调用通道」说明（只读，挂在工作流设置） */
export interface InvocationMethodInfo {
  id: string
  label: string
  description: string
}

export const INVOCATION_METHODS: InvocationMethodInfo[] = [
  {
    id: 'designer',
    label: '设计器测试',
    description: '在设计器点击「测试执行」，trigger 记为 manual',
  },
  {
    id: 'chat',
    label: 'AI 对话',
    description: '在 Chat 设置中选择已发布工作流后发送消息，trigger 记为 chat',
  },
  {
    id: 'webhook',
    label: 'Webhook',
    description: '外部系统 POST 到工作流 Webhook 地址，trigger 记为 webhook',
  },
  {
    id: 'api',
    label: '统一调用（入口 + Key）',
    description: 'POST /api/ai/workflows/invoke/{slug}，请求头 X-Workflow-Key，trigger 记为 api',
  },
  {
    id: 'jwt',
    label: '平台内 JWT',
    description: '设计器测试 / Chat 使用 JWT；所有者执行草稿或已发布版本',
  },
]
