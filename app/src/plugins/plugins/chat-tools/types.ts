/**
 * chatTools 扩展点契约：工具定义类型、分类与展示标签。
 * 权威中文 label 来源：`server/config/plugins/tools/*.json` + `getToolDisplayLabel`。
 */

export type ToolCategory =
  | 'mcp-schema'
  | 'mcp-flow'
  | 'mcp-widget'
  | 'mcp-rag'
  | 'mcp-industry'
  | 'langgraph'
  | 'workflow'

export interface ToolDef {
  name: string
  label: string
  description: string
  /** 参数提示，展示在面板上帮助用户填写 JSON */
  argsHint: string
  category: ToolCategory
  /** 来源标记（builtin / registry / tenant overlay） */
  source?: string
}

export interface ToolGroup {
  category: ToolCategory
  label: string
  tools: ToolDef[]
}

export const TOOL_CATEGORY_LABELS: Record<ToolCategory, string> = {
  'mcp-schema': 'MCP · Schema',
  'mcp-flow': 'MCP · Flow',
  'mcp-widget': 'MCP · Widget',
  'mcp-rag': 'MCP · RAG',
  'mcp-industry': 'MCP · Industry',
  langgraph: 'LangGraph 专有',
  workflow: '工作流专用',
}

export const TOOL_CATEGORY_ORDER: ToolCategory[] = [
  'mcp-schema',
  'mcp-flow',
  'mcp-widget',
  'mcp-rag',
  'mcp-industry',
  'langgraph',
  'workflow',
]
