/**
 * 工具类节点 — 每种 MCP 域 / LangGraph / HTTP 对应独立可拖拽节点类型。
 * 拖入画布即确定工具类，属性面板只需选择具体工具。
 */

import type { AgentNodeType, AgentWorkflowNodeData } from '@/types/agentWorkflow'
import {
  resolveToolCategory,
  TOOL_CATEGORY_LABELS,
  type ToolCategory,
} from '@/constants/agentTools'

export const TOOL_NODE_TYPES = [
  'tool-mcp-schema',
  'tool-mcp-flow',
  'tool-mcp-widget',
  'tool-mcp-rag',
  'tool-mcp-industry',
  'tool-langgraph',
  'tool-http',
] as const

export type ToolNodeType = (typeof TOOL_NODE_TYPES)[number]

export interface ToolNodeTypeMeta {
  category: ToolCategory
  label: string
  icon: string
  description: string
  color: string
}

export const TOOL_NODE_TYPE_META: Record<ToolNodeType, ToolNodeTypeMeta> = {
  'tool-mcp-schema': {
    category: 'mcp-schema',
    label: 'Schema 工具',
    icon: 'document',
    description: '搜索、校验、查询表单 Schema',
    color: '#409EFF',
  },
  'tool-mcp-flow': {
    category: 'mcp-flow',
    label: 'Flow 工具',
    icon: 'connection',
    description: '搜索、校验 BPMN 流程与用户',
    color: '#00D4FF',
  },
  'tool-mcp-widget': {
    category: 'mcp-widget',
    label: 'Widget 工具',
    icon: 'grid',
    description: '查询与校验组件库',
    color: '#67C23A',
  },
  'tool-mcp-rag': {
    category: 'mcp-rag',
    label: 'RAG 工具',
    icon: 'search',
    description: '语义检索知识库与 Schema',
    color: '#9B59B6',
  },
  'tool-mcp-industry': {
    category: 'mcp-industry',
    label: 'Industry 工具',
    icon: 'medal',
    description: '行业模板搜索与表单校验',
    color: '#E6A23C',
  },
  'tool-langgraph': {
    category: 'langgraph',
    label: 'LangGraph 工具',
    icon: 'cpu',
    description: '生成/更新 Schema、流程与协作',
    color: '#F56C6C',
  },
  'tool-http': {
    category: 'workflow',
    label: 'HTTP 请求',
    icon: 'link',
    description: '发起自定义 HTTP 请求',
    color: '#909399',
  },
}

export function isToolNodeType(type: string): type is ToolNodeType | 'tool' {
  return type === 'tool' || (TOOL_NODE_TYPES as readonly string[]).includes(type)
}

export function getToolCategoryForNode(
  type: AgentNodeType,
  data?: Pick<AgentWorkflowNodeData, 'toolName' | 'toolCategory'>,
): ToolCategory | undefined {
  if (type in TOOL_NODE_TYPE_META) {
    return TOOL_NODE_TYPE_META[type as ToolNodeType].category
  }
  if (type === 'tool') {
    if (data?.toolCategory) return data.toolCategory
    if (data?.toolName) return resolveToolCategory(data.toolName)
  }
  return undefined
}

export function getToolNodeTypeLabel(type: AgentNodeType): string | undefined {
  if (type in TOOL_NODE_TYPE_META) {
    return TOOL_NODE_TYPE_META[type as ToolNodeType].label
  }
  if (type === 'tool') return '工具'
  return undefined
}

export function getToolNodeCategoryLabel(type: AgentNodeType, data?: AgentWorkflowNodeData): string | undefined {
  const category = getToolCategoryForNode(type, data)
  return category ? TOOL_CATEGORY_LABELS[category] : undefined
}
