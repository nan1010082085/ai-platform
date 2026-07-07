/**
 * 专家 Agent 节点 — 每种专家类型 + 意图识别对应独立可拖拽节点。
 * 拖入画布即确定专家类型，属性面板只需配置任务指令。
 */

import type { AgentNodeType, AgentWorkflowNodeData } from '@/types/agentWorkflow'

export type ExpertAgentKind = 'editor' | 'flow' | 'page' | 'general'

export const EXPERT_NODE_TYPES = [
  'agent-intent',
  'agent-editor',
  'agent-flow',
  'agent-page',
  'agent-general',
] as const

export type ExpertNodeType = (typeof EXPERT_NODE_TYPES)[number]

export interface ExpertNodeTypeMeta {
  agentType?: ExpertAgentKind
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
    description: '分析输入并自动调度 Editor / Flow / Page 专家',
    color: '#9B59B6',
    isIntent: true,
  },
  'agent-editor': {
    agentType: 'editor',
    label: 'Editor 专家',
    icon: 'document',
    description: '生成/校验/更新 Schema 表单',
    color: '#409EFF',
  },
  'agent-flow': {
    agentType: 'flow',
    label: 'Flow 专家',
    icon: 'connection',
    description: '生成/校验/更新 BPMN 流程',
    color: '#00D4FF',
  },
  'agent-page': {
    agentType: 'page',
    label: 'Page 专家',
    icon: 'monitor',
    description: '页面级生成与业务页面配置',
    color: '#67C23A',
  },
  'agent-general': {
    agentType: 'general',
    label: 'General 通用',
    icon: 'user',
    description: '通用 AI 推理，可调用 RAG 检索',
    color: '#909399',
  },
}

export const EXPERT_AGENT_LABELS: Record<ExpertAgentKind, string> = {
  editor: 'Editor 表单专家',
  flow: 'Flow 流程专家',
  page: 'Page 页面专家',
  general: 'General 通用',
}

export function isExpertNodeType(type: string): type is ExpertNodeType | 'agent' | 'expert' {
  return type === 'agent' || type === 'expert' || (EXPERT_NODE_TYPES as readonly string[]).includes(type)
}

export function isIntentExpertNode(type: string): boolean {
  return type === 'agent-intent'
}

export function getExpertAgentTypeForNode(
  type: AgentNodeType,
  data?: Pick<AgentWorkflowNodeData, 'agentType'>,
): ExpertAgentKind | 'auto' | undefined {
  if (type in EXPERT_NODE_TYPE_META) {
    const meta = EXPERT_NODE_TYPE_META[type as ExpertNodeType]
    if (meta.isIntent) return 'auto'
    return meta.agentType
  }
  if (type === 'agent' && data?.agentType && data.agentType !== 'auto') {
    return data.agentType as ExpertAgentKind
  }
  if (type === 'agent') return (data?.agentType as ExpertAgentKind | 'auto') ?? 'general'
  return undefined
}

export function getExpertNodeTypeLabel(type: AgentNodeType): string | undefined {
  if (type in EXPERT_NODE_TYPE_META) {
    return EXPERT_NODE_TYPE_META[type as ExpertNodeType].label
  }
  if (type === 'agent') return '专家 Agent'
  return undefined
}

export function getExpertNodeDescription(type: AgentNodeType): string | undefined {
  if (type in EXPERT_NODE_TYPE_META) {
    return EXPERT_NODE_TYPE_META[type as ExpertNodeType].description
  }
  return undefined
}
