/**
 * useActionProposals — 行动方案管理 Composable
 *
 * 管理行动方案的生命周期：待审批 → 已批准/已拒绝。
 * 支持单项选择、全部选择、部分审批、行内编辑。
 */

import { ref, computed, type Ref } from 'vue'
import type { ActionItem, ActionProposal, ProposalStatus } from '@/types'

/** 单个方案的内部状态 */
interface ProposalState {
  status: ProposalStatus
  selectedIds: Set<string>
  /** 行内编辑产生的变更（itemId → 部分字段） */
  modifiedItems: Map<string, Partial<ActionItem>>
}

/** 审批结果事件 */
export interface ProposalApprovalEvent {
  proposalId: string
  selectedItems: ActionItem[]
  modifiedItems: Map<string, Partial<ActionItem>>
}

/** 拒绝结果事件 */
export interface ProposalRejectionEvent {
  proposalId: string
  reason?: string
}

export function useActionProposals() {
  /** 所有方案的原始数据 */
  const proposals = ref<Map<string, ActionProposal>>(new Map())

  /** 方案状态映射 */
  const states = ref<Map<string, ProposalState>>(new Map())

  // ---- 内部辅助 ----

  function ensureState(proposalId: string): ProposalState {
    if (!states.value.has(proposalId)) {
      const proposal = proposals.value.get(proposalId)
      const initialIds = new Set(proposal?.actionItems.map((item) => item.id) ?? [])
      states.value.set(proposalId, {
        status: 'pending',
        selectedIds: initialIds,
        modifiedItems: new Map(),
      })
    }
    return states.value.get(proposalId)!
  }

  // ---- 公开 API ----

  /** 注册一个新方案 */
  function addProposal(proposal: ActionProposal): void {
    proposals.value.set(proposal.id, proposal)
    // 初始化状态
    states.value.set(proposal.id, {
      status: 'pending',
      selectedIds: new Set(proposal.actionItems.map((item) => item.id)),
      modifiedItems: new Map(),
    })
  }

  /** 移除方案 */
  function removeProposal(proposalId: string): void {
    proposals.value.delete(proposalId)
    states.value.delete(proposalId)
  }

  /** 获取方案状态 */
  function getStatus(proposalId: string): ProposalStatus {
    return ensureState(proposalId).status
  }

  /** 获取方案的原始数据 */
  function getProposal(proposalId: string): ActionProposal | undefined {
    return proposals.value.get(proposalId)
  }

  /** 获取已选中的项 ID */
  function getSelectedIds(proposalId: string): Set<string> {
    return ensureState(proposalId).selectedIds
  }

  /** 切换单项选中状态 */
  function toggleItem(proposalId: string, itemId: string): void {
    const state = ensureState(proposalId)
    if (state.status !== 'pending') return
    if (state.selectedIds.has(itemId)) {
      state.selectedIds.delete(itemId)
    } else {
      state.selectedIds.add(itemId)
    }
  }

  /** 全选 / 取消全选 */
  function toggleAll(proposalId: string): void {
    const state = ensureState(proposalId)
    if (state.status !== 'pending') return
    const proposal = proposals.value.get(proposalId)
    if (!proposal) return

    const allIds = proposal.actionItems.map((item) => item.id)
    const allSelected = allIds.length > 0 && allIds.every((id) => state.selectedIds.has(id))

    if (allSelected) {
      state.selectedIds.clear()
    } else {
      state.selectedIds = new Set(allIds)
    }
  }

  /** 行内编辑：记录字段变更 */
  function modifyItem(proposalId: string, itemId: string, changes: Partial<ActionItem>): void {
    const state = ensureState(proposalId)
    if (state.status !== 'pending') return

    const existing = state.modifiedItems.get(itemId) ?? {}
    state.modifiedItems.set(itemId, { ...existing, ...changes })
  }

  /**
   * 获取合并后的行动项（原始数据 + 行内编辑变更）
   */
  function getMergedItems(proposalId: string): ActionItem[] {
    const proposal = proposals.value.get(proposalId)
    if (!proposal) return []
    const state = ensureState(proposalId)

    return proposal.actionItems.map((item) => {
      const changes = state.modifiedItems.get(item.id)
      return changes ? { ...item, ...changes } : item
    })
  }

  /**
   * 获取合并后的已选中行动项
   */
  function getSelectedItems(proposalId: string): ActionItem[] {
    const state = ensureState(proposalId)
    const allItems = getMergedItems(proposalId)
    return allItems.filter((item) => state.selectedIds.has(item.id))
  }

  /** 已选中数量 */
  function getSelectedCount(proposalId: string): number {
    return ensureState(proposalId).selectedIds.size
  }

  /** 总数 */
  function getTotalCount(proposalId: string): number {
    return proposals.value.get(proposalId)?.actionItems.length ?? 0
  }

  /** 是否全选 */
  function isAllSelected(proposalId: string): boolean {
    const total = getTotalCount(proposalId)
    const selected = getSelectedCount(proposalId)
    return total > 0 && selected === total
  }

  /**
   * 批准方案（部分审批：仅批准已选中的项）
   * @returns 审批事件，供调用方发送到后端
   */
  function approveProposal(proposalId: string): ProposalApprovalEvent | null {
    const state = ensureState(proposalId)
    if (state.status !== 'pending') return null
    if (state.selectedIds.size === 0) return null

    state.status = 'approved'
    return {
      proposalId,
      selectedItems: getSelectedItems(proposalId),
      modifiedItems: new Map(state.modifiedItems),
    }
  }

  /**
   * 拒绝方案
   * @returns 拒绝事件
   */
  function rejectProposal(proposalId: string, reason?: string): ProposalRejectionEvent | null {
    const state = ensureState(proposalId)
    if (state.status !== 'pending') return null

    state.status = 'rejected'
    return { proposalId, reason }
  }

  /** 重置方案为待审批状态 */
  function resetProposal(proposalId: string): void {
    const proposal = proposals.value.get(proposalId)
    if (!proposal) return
    states.value.set(proposalId, {
      status: 'pending',
      selectedIds: new Set(proposal.actionItems.map((item) => item.id)),
      modifiedItems: new Map(),
    })
  }

  /** 清除所有方案 */
  function clearAll(): void {
    proposals.value.clear()
    states.value.clear()
  }

  /** 获取所有待审批方案 ID */
  const pendingProposalIds = computed<string[]>(() => {
    const ids: string[] = []
    for (const [id, state] of states.value) {
      if (state.status === 'pending') ids.push(id)
    }
    return ids
  })

  return {
    /** 注册新方案 */
    addProposal,
    /** 移除方案 */
    removeProposal,
    /** 获取方案状态 */
    getStatus,
    /** 获取原始方案数据 */
    getProposal,
    /** 获取已选中项 ID */
    getSelectedIds,
    /** 切换单项 */
    toggleItem,
    /** 全选/取消全选 */
    toggleAll,
    /** 行内编辑 */
    modifyItem,
    /** 获取合并后的全部行动项 */
    getMergedItems,
    /** 获取合并后的已选中行动项 */
    getSelectedItems,
    /** 已选中数量 */
    getSelectedCount,
    /** 总数量 */
    getTotalCount,
    /** 是否全选 */
    isAllSelected,
    /** 批准方案 */
    approveProposal,
    /** 拒绝方案 */
    rejectProposal,
    /** 重置方案 */
    resetProposal,
    /** 清除所有 */
    clearAll,
    /** 待审批方案 ID 列表 */
    pendingProposalIds,
  }
}
