/**
 * @poc — DSH 智能体中断 API
 *
 * 待 M7（server executor + harness interrupt HTTP）再接线。
 * 禁止 Chat UI / stream 消费此模块。
 *
 * 保留实现：M7 接线时直接使用，无需重写。
 *
 * M7 接线前置：
 * - server：autonomous-agent executor + 中断事件（nodeId/sessionId/subagentId）
 * - harness：continue + interrupt HTTP
 * - 前端：执行详情优先接线，再考虑 Chat
 */

import { ref, computed } from 'vue'

/** DSH 智能体中断（harness continuable subagent 语义） */
export interface PendingAgentInterrupt {
  /** harness 会话 ID */
  sessionId: string
  /** 工作流节点 ID（关联到设计器中的 autonomous-agent 节点） */
  nodeId: string
  /** 节点显示名称 */
  nodeName: string
  /** 中断原因/消息（agent 请求人工确认的内容） */
  message: string
  /** 中断时 agent 的中间输出（如有） */
  agentOutput?: string
  /** agent 请求的具体问题列表 */
  questions?: Array<{ id: string; question: string; options?: string[] }>
  /** 中断时间戳 */
  interruptedAt: number
  /** 关联的 subagent durable id（用于 interrupt_agent 终止） */
  subagentId?: string
}

/** @poc — 仅供测试/M7 接线参考，不暴露给业务 */
export function createAgentInterruptState() {
  const pendingAgentInterrupts = ref<PendingAgentInterrupt[]>([])

  const oldestAgentInterrupt = computed(() =>
    pendingAgentInterrupts.value.length > 0 ? pendingAgentInterrupts.value[0] : null,
  )

  function registerAgentInterrupt(interrupt: PendingAgentInterrupt): void {
    const existing = pendingAgentInterrupts.value.findIndex((i) => i.nodeId === interrupt.nodeId)
    if (existing >= 0) {
      pendingAgentInterrupts.value[existing] = interrupt
    } else {
      pendingAgentInterrupts.value.push(interrupt)
    }
  }

  function approveAgentInterrupt(nodeId: string, userReply?: string): {
    sessionId: string
    userReply: string
  } | null {
    const idx = pendingAgentInterrupts.value.findIndex((i) => i.nodeId === nodeId)
    if (idx < 0) return null
    const interrupt = pendingAgentInterrupts.value[idx]
    pendingAgentInterrupts.value.splice(idx, 1)
    return {
      sessionId: interrupt.sessionId,
      userReply: userReply ?? 'approved',
    }
  }

  function rejectAgentInterrupt(nodeId: string): {
    sessionId: string
    subagentId?: string
  } | null {
    const idx = pendingAgentInterrupts.value.findIndex((i) => i.nodeId === nodeId)
    if (idx < 0) return null
    const interrupt = pendingAgentInterrupts.value[idx]
    pendingAgentInterrupts.value.splice(idx, 1)
    return {
      sessionId: interrupt.sessionId,
      subagentId: interrupt.subagentId,
    }
  }

  function clearAgentInterrupt(nodeId: string): void {
    const idx = pendingAgentInterrupts.value.findIndex((i) => i.nodeId === nodeId)
    if (idx >= 0) pendingAgentInterrupts.value.splice(idx, 1)
  }

  function clearAllAgentInterrupts(): void {
    pendingAgentInterrupts.value = []
  }

  return {
    pendingAgentInterrupts,
    oldestAgentInterrupt,
    registerAgentInterrupt,
    approveAgentInterrupt,
    rejectAgentInterrupt,
    clearAgentInterrupt,
    clearAllAgentInterrupts,
  }
}
