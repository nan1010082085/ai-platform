/**
 * HITL (Human-in-the-Loop) 管理 Store
 *
 * 职责：传统 workflow 中断确认、人工干预管理。
 *
 * Chat UI 唯一正式路径：pendingInterrupt（server 侧 workflow 引擎暂停节点）。
 *
 * 智能体中断 API 已隔离到 `hitl.agent.poc.ts`（@poc — 未接线）。
 * 待 M7（server executor + interrupt HTTP）再接线；禁止 Chat 消费。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PendingInterrupt } from '@/types'

export const useHITLStore = defineStore('hitl', () => {
  // ---- State ----

  /** 传统 workflow HITL 中断（Chat 正式路径） */
  const pendingInterrupt = ref<PendingInterrupt | null>(null)

  // ---- Computed ----

  /** 是否有传统 HITL 待处理中断（仅 pendingInterrupt，不含 agent POC 队列） */
  const hasPendingInterrupt = computed(() => pendingInterrupt.value !== null)

  // ---- Actions ----

  function setInterrupt(interrupt: PendingInterrupt): void {
    pendingInterrupt.value = interrupt
  }

  function clearInterrupt(): void {
    pendingInterrupt.value = null
  }

  return {
    // state
    pendingInterrupt,
    // computed
    hasPendingInterrupt,
    // actions
    setInterrupt,
    clearInterrupt,
  }
})
