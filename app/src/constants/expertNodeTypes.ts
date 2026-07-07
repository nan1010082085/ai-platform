/**
 * 专家 Agent 节点 — 意图识别 + 插件专家。
 */

import type { AgentNodeType, AgentWorkflowNodeData } from '@/types/agentWorkflow'

export type ExpertAgentKind = 'editor' | 'flow' | 'page' | 'general'

export const EXPERT_NODE_TYPES = ['agent-intent'] as const

export type ExpertNodeType = (typeof EXPERT_NODE_TYPES)[number]

export interface ExpertNodeTypeMeta {
  label: string
  icon: string
  description: string
  color: string
  isIntent?: boolean
}

export const EXPERT_NODE_TYPE_META: Record<ExpertNodeType, ExpertNodeTypeMeta> = {
  'agent-intent': {
    label: '意图识别',
    icon: 'aim',
    description: '分析输入并自动调度已注册专家',
    color: '#9B59B6',
    isIntent: true,
  },
}

export const EXPERT_AGENT_LABELS: Record<ExpertAgentKind, string> = {
  editor: 'Editor 表单专家',
  flow: 'Flow 流程专家',
  page: 'Page 页面专家',
  general: 'General 通用',
}

export function getExpertLegacyBadge(key: ExpertAgentKind): {
  label: string
  color: string
  icon: string
} {
  const icons: Record<ExpertAgentKind, string> = {
    editor: 'document',
    flow: 'connection',
    page: 'monitor',
    general: 'user',
  }
  const colors: Record<ExpertAgentKind, string> = {
    editor: '#409EFF',
    flow: '#00D4FF',
    page: '#67C23A',
    general: '#909399',
  }
  return {
    label: EXPERT_AGENT_LABELS[key],
    color: colors[key],
    icon: icons[key],
  }
}

export function isExpertNodeType(type: string): type is ExpertNodeType | 'expert' {
  return type === 'expert' || (EXPERT_NODE_TYPES as readonly string[]).includes(type)
}

export function isIntentExpertNode(type: string): boolean {
  return type === 'agent-intent'
}

export function getExpertNodeTypeLabel(type: AgentNodeType): string | undefined {
  if (type in EXPERT_NODE_TYPE_META) {
    return EXPERT_NODE_TYPE_META[type as ExpertNodeType].label
  }
  if (type === 'expert') return '插件专家'
  return undefined
}

export function getExpertNodeDescription(type: AgentNodeType): string | undefined {
  if (type in EXPERT_NODE_TYPE_META) {
    return EXPERT_NODE_TYPE_META[type as ExpertNodeType].description
  }
  if (type === 'expert') return '从插件中心选择注册专家'
  return undefined
}
