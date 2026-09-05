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
  'mcp-schema': '工具 · 表单',
  'mcp-flow': '工具 · 流程',
  'mcp-widget': '工具 · 组件',
  'mcp-rag': '工具 · 知识库',
  'mcp-industry': '工具 · 行业',
  langgraph: '对话图专有',
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
