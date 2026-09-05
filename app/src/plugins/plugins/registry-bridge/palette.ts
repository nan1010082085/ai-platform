/**
 * Registry → palette 条目映射（供 bridge / pack 共用）。
 */

import { TOOL_CATEGORY_LABELS, type ToolDef } from '../chat-tools/types'
import type { AgentPaletteItem } from '../../config/nodeTypes'
import type { AgentNodeType } from '@/types/agentWorkflow'
import type { PluginExpertSummary } from '@/api/pluginApi'

const LEGACY_EXPERT_ICON: Record<string, string> = {
  editor: 'document',
  flow: 'connection',
  page: 'monitor',
  general: 'user',
}

const TOOL_NS_ICON: Record<string, string> = {
  schema: 'document',
  flow: 'connection',
  widget: 'grid',
  rag: 'search',
  industry: 'office-building',
}

/**
 * ToolDef → 画布 palette 项。
 * @param tool 工具定义
 */
export function toolToPaletteItem(tool: ToolDef): AgentPaletteItem {
  const ns = tool.name.includes('__') ? tool.name.split('__')[0] : tool.category
  const categoryHint = TOOL_CATEGORY_LABELS[tool.category] ?? tool.category
  const sourceHint = tool.source ? ` · ${tool.source}` : ''
  return {
    type: 'tool' as AgentNodeType,
    label: tool.label,
    icon: TOOL_NS_ICON[ns] ?? (tool.category === 'langgraph' ? 'cpu' : 'setting'),
    category: 'tools',
    description: `${categoryHint}${sourceHint}`,
    defaultData: {
      label: tool.label,
      toolName: tool.name,
    },
  }
}

/**
 * Expert 摘要 → 画布 palette 项。
 * @param expert 专家摘要
 */
export function expertToPaletteItem(expert: PluginExpertSummary): AgentPaletteItem {
  const legacy = expert.legacyAgentKey ?? ''
  return {
    type: 'expert' as AgentNodeType,
    label: expert.label,
    icon: LEGACY_EXPERT_ICON[legacy] ?? 'cpu',
    category: 'experts',
    description: expert.description ?? expert.id,
    defaultData: {
      label: expert.label,
      expertId: expert.id,
    },
  }
}

export const LEGACY_EXPERT_COLOR: Record<string, string> = {
  editor: '#409EFF',
  flow: '#00D4FF',
  page: '#67C23A',
  general: '#909399',
}
