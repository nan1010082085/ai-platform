/**
 * 行动方案类型定义
 */

// ---- Action Proposal ----

export interface ActionItem {
  id: string
  type: 'create_schema' | 'modify_schema' | 'create_flow' | 'modify_flow' | 'create_widget' | 'modify_widget' | 'delete_widget' | 'custom'
  title: string
  description: string
  target?: string
  changes?: Record<string, unknown>
  selected?: boolean
}

export interface ActionProposal {
  id: string
  title: string
  description: string
  actionItems: ActionItem[]
  status?: ProposalStatus
}

export type ProposalStatus = 'pending' | 'approved' | 'rejected'
