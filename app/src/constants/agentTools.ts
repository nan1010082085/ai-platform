/**
 * Agent 工作流工具节点 — Registry 未加载时的 argsHint / category 回退。
 * 中文 label 权威来源：`server/config/plugins/tools/*.json` + `getToolDisplayLabel`。
 */

import {
  SCHEMA_SEARCH,
  SCHEMA_GET_DETAIL,
  SCHEMA_VALIDATE,
  SCHEMA_VALIDATE_WIDGETS,
  SCHEMA_SEARCH_PUBLISHED,
  SCHEMA_FUZZY_SEARCH,
  SCHEMA_FIND_FLOW_REFERENCES,
  FLOW_SEARCH,
  FLOW_GET_DETAIL,
  FLOW_VALIDATE,
  FLOW_SEARCH_USERS,
  FLOW_GET_NODE_SCHEMA,
  WIDGET_QUERY,
  WIDGET_VALIDATE,
  RAG_SEARCH,
  INDUSTRY_SEARCH_TEMPLATES,
  INDUSTRY_VALIDATE_FORM,
  UPDATE_SCHEMA,
  GENERATE_SCHEMA,
  UPDATE_FLOW,
  SAVE_AND_BIND_SCHEMA,
  BIND_SCHEMA_TO_FLOW_NODE,
  REQUEST_COLLABORATION,
  RAG_INDEX,
  normalizeToolName,
  getToolDisplayLabel,
} from '@schema-platform/ai-shared/toolNames'

export type ToolCategory =
  | 'mcp-schema'
  | 'mcp-flow'
  | 'mcp-widget'
  | 'mcp-rag'
  | 'mcp-industry'
  | 'langgraph'
  | 'workflow'

export interface BuiltInToolDef {
  name: string
  label: string
  description: string
  /** 参数提示，展示在面板上帮助用户填写 JSON */
  argsHint: string
  category: ToolCategory
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

function builtinTool(
  name: string,
  category: ToolCategory,
  description: string,
  argsHint: string,
): BuiltInToolDef {
  return {
    name,
    label: getToolDisplayLabel(name),
    description,
    argsHint,
    category,
  }
}

/**
 * Registry 未加载时的回退清单（label 来自 ai-shared TOOL_DISPLAY_LABELS）。
 */
export const BUILT_IN_TOOLS: BuiltInToolDef[] = [
  // ── MCP Schema ──
  builtinTool(SCHEMA_SEARCH, 'mcp-schema', '按关键词搜索平台 Schema 实例', '{"keyword":"表单","limit":5}'),
  builtinTool(SCHEMA_SEARCH_PUBLISHED, 'mcp-schema', '搜索已发布的 Schema', '{"keyword":"表单","limit":5}'),
  builtinTool(SCHEMA_GET_DETAIL, 'mcp-schema', '获取指定 Schema 的详细内容', '{"schemaId":"<id>"}'),
  builtinTool(SCHEMA_FUZZY_SEARCH, 'mcp-schema', '基于关键词模糊搜索已有 Schema（Jaccard 相似度）', '{"query":"请假申请","limit":5}'),
  builtinTool(SCHEMA_VALIDATE, 'mcp-schema', '验证 Schema 文档结构', '{"schema":{}}'),
  builtinTool(SCHEMA_VALIDATE_WIDGETS, 'mcp-schema', '校验 Schema 组件配置是否合法', '{"widgets":[]}'),
  builtinTool(SCHEMA_FIND_FLOW_REFERENCES, 'mcp-schema', '查找引用了指定 Schema 的所有流程节点', '{"schemaId":"<id>"}'),
  builtinTool(FLOW_SEARCH, 'mcp-flow', '按关键词搜索 BPMN 流程', '{"keyword":"审批","limit":5}'),
  builtinTool(FLOW_GET_DETAIL, 'mcp-flow', '获取指定流程的详细内容', '{"flowId":"<id>"}'),
  builtinTool(FLOW_VALIDATE, 'mcp-flow', '校验流程定义是否合法', '{"flow":{"nodes":[],"edges":[]}}'),
  builtinTool(FLOW_SEARCH_USERS, 'mcp-flow', '搜索用户列表，用于设置审批指派人', '{"keyword":"张三","limit":20}'),
  builtinTool(FLOW_GET_NODE_SCHEMA, 'mcp-flow', '获取流程节点绑定的表单 Schema', '{"flowId":"<id>","nodeId":"<nodeId>"}'),
  builtinTool(WIDGET_QUERY, 'mcp-widget', '查询可用组件库，可按分类筛选', '{"category":"form"}'),
  builtinTool(WIDGET_VALIDATE, 'mcp-widget', '校验 Widget Schema JSON 结构', '{"widgets":[]}'),
  builtinTool(RAG_SEARCH, 'mcp-rag', '在知识库中语义检索相关 Schema', '{"query":"{{$input.message}}","limit":5}'),
  builtinTool(INDUSTRY_SEARCH_TEMPLATES, 'mcp-industry', '搜索行业专属模板（医疗/金融/教育）', '{"keyword":"病历","industry":"medical","type":"form"}'),
  builtinTool(INDUSTRY_VALIDATE_FORM, 'mcp-industry', '根据行业规范校验表单 Schema', '{"widgets":[],"industry":"medical"}'),
  builtinTool(UPDATE_SCHEMA, 'langgraph', '提交 Schema 修改（Chat 场景需用户确认）', '{"widgets":[],"summary":"更新说明"}'),
  builtinTool(GENERATE_SCHEMA, 'langgraph', '调用 LLM 生成新表单 Schema', '{"requirement":"创建一个请假申请表单"}'),
  builtinTool(UPDATE_FLOW, 'langgraph', '提交流程修改（Chat 场景需用户确认）', '{"flow":{"nodes":[],"edges":[]},"summary":"更新说明"}'),
  builtinTool(SAVE_AND_BIND_SCHEMA, 'langgraph', '保存表单并绑定到流程节点', '{"flowId":"<id>","nodeId":"<nodeId>","widgets":[]}'),
  builtinTool(BIND_SCHEMA_TO_FLOW_NODE, 'langgraph', '将已有 Schema 绑定到流程节点', '{"flowId":"<id>","nodeId":"<nodeId>","schemaId":"<id>"}'),
  builtinTool(REQUEST_COLLABORATION, 'langgraph', '请求其他 Agent 专家协作（Chat 图路由）', '{"targetAgent":"editor","reason":"需要生成表单"}'),
  builtinTool(RAG_INDEX, 'langgraph', '写入 RAG 向量索引（管理类操作）', '{"schemaId":"<id>"}'),
  builtinTool('http_request', 'workflow', '发起自定义 HTTP 请求（工作流专用，非 MCP）', '{"method":"GET","url":"https://api.example.com","headers":{}}'),
]

const TOOL_CATEGORY_ORDER: ToolCategory[] = [
  'mcp-schema',
  'mcp-flow',
  'mcp-widget',
  'mcp-rag',
  'mcp-industry',
  'langgraph',
  'workflow',
]

/** 按 MCP 域分组，供编排器工具节点选择器使用 */
export function getGroupedBuiltInTools(): Array<{ category: ToolCategory; label: string; tools: BuiltInToolDef[] }> {
  return TOOL_CATEGORY_ORDER.map((category) => ({
    category,
    label: TOOL_CATEGORY_LABELS[category],
    tools: BUILT_IN_TOOLS.filter((t) => t.category === category),
  })).filter((g) => g.tools.length > 0)
}

export function getToolsByCategory(category: ToolCategory): BuiltInToolDef[] {
  return BUILT_IN_TOOLS.filter((t) => t.category === category)
}

export function resolveToolCategory(toolName: string): ToolCategory | undefined {
  return getBuiltInTool(toolName)?.category
}

export function getBuiltInTool(name: string): BuiltInToolDef | undefined {
  const normalized = normalizeToolName(name)
  return BUILT_IN_TOOLS.find((t) => t.name === normalized || t.name === name)
}

export const BUILT_IN_TOOL_NAMES = BUILT_IN_TOOLS.map((t) => t.name)
