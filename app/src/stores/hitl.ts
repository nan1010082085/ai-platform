/**
 * HITL (Human-in-the-Loop) 管理 Store
 *
 * 职责：中断确认、人工干预管理
 *
 * 两类中断：
 * 1. 传统 workflow HITL（pendingInterrupt）：server 侧 workflow 引擎暂停节点
 * 2. DSH 智能体中断（pendingAgentInterrupt）：harness continuable subagent 等待人工审批
 *
 * DSH 语义映射：
 * - harness subagent interrupt → pendingAgentInterrupt（含 subagentId + sessionId）
 * - 用户 approve → sendHarnessMessage 继续 / 用户 reject → interrupt_agent 终止
 * - 对应设计文档 §5.6 "等待人工审批的节点即一个挂起的 continuable subagent"
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PendingInterrupt } from '@/types'

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

export const useHITLStore = defineStore('hitl', () => {
  // ---- State ----

  /** 传统 workflow HITL 中断 */
  const pendingInterrupt = ref<PendingInterrupt | null>(null)

  /** DSH 智能体中断队列（一个 workflow 可能有多个 agent 节点同时等待） */
  const pendingAgentInterrupts = ref<PendingAgentInterrupt[]>([])

  // ---- Computed ----

  /** 是否有任何待处理中断 */
  const hasPendingInterrupt = computed(() =>
    pendingInterrupt.value !== null || pendingAgentInterrupts.value.length > 0,
  )

  /** 最紧急的 agent 中断（先进先出） */
  const oldestAgentInterrupt = computed(() =>
    pendingAgentInterrupts.value.length > 0 ? pendingAgentInterrupts.value[0] : null,
  )

  // ---- Actions（传统 HITL）----

  function setInterrupt(interrupt: PendingInterrupt): void {
    pendingInterrupt.value = interrupt
  }

  function clearInterrupt(): void {
    pendingInterrupt.value = null
  }

  // ---- Actions（DSH 智能体中断）----

  /** 注册一个 agent 中断（harness 事件流推送到前端时调用） */
  function registerAgentInterrupt(interrupt: PendingAgentInterrupt): void {
    // 去重：同 nodeId 不重复注册
    const existing = pendingAgentInterrupts.value.findIndex((i) => i.nodeId === interrupt.nodeId)
    if (existing >= 0) {
      pendingAgentInterrupts.value[existing] = interrupt
    } else {
      pendingAgentInterrupts.value.push(interrupt)
    }
  }

  /** 批准 agent 中断（用户确认，agent 继续执行） */
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

  /** 拒绝 agent 中断（终止 agent 执行） */
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

  /** 清除指定节点的 agent 中断（节点执行完成/取消时清理） */
  function clearAgentInterrupt(nodeId: string): void {
    const idx = pendingAgentInterrupts.value.findIndex((i) => i.nodeId === nodeId)
    if (idx >= 0) pendingAgentInterrupts.value.splice(idx, 1)
  }

  /** 清除所有 agent 中断（workflow 执行结束时清理） */
  function clearAllAgentInterrupts(): void {
    pendingAgentInterrupts.value = []
  }

  return {
    // state
    pendingInterrupt,
    pendingAgentInterrupts,
    // computed
    hasPendingInterrupt,
    oldestAgentInterrupt,
    // actions — 传统 HITL
    setInterrupt,
    clearInterrupt,
    // actions — DSH 智能体中断
    registerAgentInterrupt,
    approveAgentInterrupt,
    rejectAgentInterrupt,
    clearAgentInterrupt,
    clearAllAgentInterrupts,
  }
})
