/**
 * 工具节点 — 统一 `tool` 类型，具体工具由 Registry `toolName` 决定。
 */

import type { AgentNodeType, AgentWorkflowNodeData } from '@/types/agentWorkflow'
import {
  resolveToolCategory,
  TOOL_CATEGORY_LABELS,
  type ToolCategory,
} from '@/constants/agentTools'

export function isToolNodeType(type: string): type is 'tool' {
  return type === 'tool'
}

export function getToolCategoryForNode(
  _type: AgentNodeType,
  data?: Pick<AgentWorkflowNodeData, 'toolName' | 'toolCategory'>,
): ToolCategory | undefined {
  if (data?.toolCategory) return data.toolCategory
  if (data?.toolName) return resolveToolCategory(data.toolName)
  return undefined
}

export function getToolNodeTypeLabel(type: AgentNodeType): string | undefined {
  if (type === 'tool') return '工具'
  return undefined
}

export function getToolNodeCategoryLabel(type: AgentNodeType, data?: AgentWorkflowNodeData): string | undefined {
  const category = getToolCategoryForNode(type, data)
  return category ? TOOL_CATEGORY_LABELS[category] : undefined
}
