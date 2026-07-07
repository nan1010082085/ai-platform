/**
 * Agent 工作流工具节点 — 内置工具注册表
 *
 * **权威工具清单在服务端插件中心**（`server/config/ai-plugins*.json`）。
 * 本文件仅提供：参数 argsHint 示例、旧工作流图兼容、Registry 未加载时的回退。
 * 设计器 Palette / ToolNodePanel 优先使用 `usePluginRegistry()`。
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
  LEGACY_TOOL_ALIASES,
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

/**
 * 内置工具清单（MCP 权威名 + LangGraph 专有 + 工作流专用）。
 */
export const BUILT_IN_TOOLS: BuiltInToolDef[] = [
  // ── MCP Schema ──
  {
    name: SCHEMA_SEARCH,
    label: getToolDisplayLabel(SCHEMA_SEARCH),
    description: '按关键词搜索平台 Schema 实例',
    argsHint: '{"keyword":"表单","limit":5}',
    category: 'mcp-schema',
  },
  {
    name: SCHEMA_SEARCH_PUBLISHED,
    label: getToolDisplayLabel(SCHEMA_SEARCH_PUBLISHED),
    description: '搜索已发布的 Schema',
    argsHint: '{"keyword":"表单","limit":5}',
    category: 'mcp-schema',
  },
  {
    name: SCHEMA_GET_DETAIL,
    label: getToolDisplayLabel(SCHEMA_GET_DETAIL),
    description: '获取指定 Schema 的详细内容',
    argsHint: '{"schemaId":"<id>"}',
    category: 'mcp-schema',
  },
  {
    name: SCHEMA_FUZZY_SEARCH,
    label: getToolDisplayLabel(SCHEMA_FUZZY_SEARCH),
    description: '基于关键词模糊搜索已有 Schema（Jaccard 相似度）',
    argsHint: '{"query":"请假申请","limit":5}',
    category: 'mcp-schema',
  },
  {
    name: SCHEMA_VALIDATE,
    label: getToolDisplayLabel(SCHEMA_VALIDATE),
    description: '验证 Schema 文档结构',
    argsHint: '{"schema":{}}',
    category: 'mcp-schema',
  },
  {
    name: SCHEMA_VALIDATE_WIDGETS,
    label: getToolDisplayLabel(SCHEMA_VALIDATE_WIDGETS),
    description: '校验 Schema 组件配置是否合法',
    argsHint: '{"widgets":[]}',
    category: 'mcp-schema',
  },
  {
    name: SCHEMA_FIND_FLOW_REFERENCES,
    label: getToolDisplayLabel(SCHEMA_FIND_FLOW_REFERENCES),
    description: '查找引用了指定 Schema 的所有流程节点',
    argsHint: '{"schemaId":"<id>"}',
    category: 'mcp-schema',
  },
  // ── MCP Flow ──
  {
    name: FLOW_SEARCH,
    label: getToolDisplayLabel(FLOW_SEARCH),
    description: '按关键词搜索 BPMN 流程',
    argsHint: '{"keyword":"审批","limit":5}',
    category: 'mcp-flow',
  },
  {
    name: FLOW_GET_DETAIL,
    label: getToolDisplayLabel(FLOW_GET_DETAIL),
    description: '获取指定流程的详细内容',
    argsHint: '{"flowId":"<id>"}',
    category: 'mcp-flow',
  },
  {
    name: FLOW_VALIDATE,
    label: getToolDisplayLabel(FLOW_VALIDATE),
    description: '校验流程定义是否合法',
    argsHint: '{"flow":{"nodes":[],"edges":[]}}',
    category: 'mcp-flow',
  },
  {
    name: FLOW_SEARCH_USERS,
    label: getToolDisplayLabel(FLOW_SEARCH_USERS),
    description: '搜索用户列表，用于设置审批指派人',
    argsHint: '{"keyword":"张三","limit":20}',
    category: 'mcp-flow',
  },
  {
    name: FLOW_GET_NODE_SCHEMA,
    label: getToolDisplayLabel(FLOW_GET_NODE_SCHEMA),
    description: '获取流程节点绑定的表单 Schema',
    argsHint: '{"flowId":"<id>","nodeId":"<nodeId>"}',
    category: 'mcp-flow',
  },
  // ── MCP Widget ──
  {
    name: WIDGET_QUERY,
    label: getToolDisplayLabel(WIDGET_QUERY),
    description: '查询可用组件库，可按分类筛选',
    argsHint: '{"category":"form"}',
    category: 'mcp-widget',
  },
  {
    name: WIDGET_VALIDATE,
    label: getToolDisplayLabel(WIDGET_VALIDATE),
    description: '校验 Widget Schema JSON 结构',
    argsHint: '{"widgets":[]}',
    category: 'mcp-widget',
  },
  // ── MCP RAG ──
  {
    name: RAG_SEARCH,
    label: getToolDisplayLabel(RAG_SEARCH),
    description: '在知识库中语义检索相关 Schema',
    argsHint: '{"query":"{{$input.message}}","limit":5}',
    category: 'mcp-rag',
  },
  // ── MCP Industry ──
  {
    name: INDUSTRY_SEARCH_TEMPLATES,
    label: getToolDisplayLabel(INDUSTRY_SEARCH_TEMPLATES),
    description: '搜索行业专属模板（医疗/金融/教育）',
    argsHint: '{"keyword":"病历","industry":"medical","type":"form"}',
    category: 'mcp-industry',
  },
  {
    name: INDUSTRY_VALIDATE_FORM,
    label: getToolDisplayLabel(INDUSTRY_VALIDATE_FORM),
    description: '根据行业规范校验表单 Schema',
    argsHint: '{"widgets":[],"industry":"medical"}',
    category: 'mcp-industry',
  },
  // ── LangGraph 专有（工作流中可调用，写入类工具需 Chat HITL 上下文） ──
  {
    name: UPDATE_SCHEMA,
    label: getToolDisplayLabel(UPDATE_SCHEMA),
    description: '提交 Schema 修改（Chat 场景需用户确认）',
    argsHint: '{"widgets":[],"summary":"更新说明"}',
    category: 'langgraph',
  },
  {
    name: GENERATE_SCHEMA,
    label: getToolDisplayLabel(GENERATE_SCHEMA),
    description: '调用 LLM 生成新表单 Schema',
    argsHint: '{"requirement":"创建一个请假申请表单"}',
    category: 'langgraph',
  },
  {
    name: UPDATE_FLOW,
    label: getToolDisplayLabel(UPDATE_FLOW),
    description: '提交流程修改（Chat 场景需用户确认）',
    argsHint: '{"flow":{"nodes":[],"edges":[]},"summary":"更新说明"}',
    category: 'langgraph',
  },
  {
    name: SAVE_AND_BIND_SCHEMA,
    label: getToolDisplayLabel(SAVE_AND_BIND_SCHEMA),
    description: '保存表单并绑定到流程节点',
    argsHint: '{"flowId":"<id>","nodeId":"<nodeId>","widgets":[]}',
    category: 'langgraph',
  },
  {
    name: BIND_SCHEMA_TO_FLOW_NODE,
    label: getToolDisplayLabel(BIND_SCHEMA_TO_FLOW_NODE),
    description: '将已有 Schema 绑定到流程节点',
    argsHint: '{"flowId":"<id>","nodeId":"<nodeId>","schemaId":"<id>"}',
    category: 'langgraph',
  },
  {
    name: REQUEST_COLLABORATION,
    label: getToolDisplayLabel(REQUEST_COLLABORATION),
    description: '请求其他 Agent 专家协作（Chat 图路由）',
    argsHint: '{"targetAgent":"editor","reason":"需要生成表单"}',
    category: 'langgraph',
  },
  {
    name: RAG_INDEX,
    label: getToolDisplayLabel(RAG_INDEX),
    description: '写入 RAG 向量索引（管理类操作）',
    argsHint: '{"schemaId":"<id>"}',
    category: 'langgraph',
  },
  // ── 工作流专用 ──
  {
    name: 'http_request',
    label: 'HTTP 请求',
    description: '发起自定义 HTTP 请求（工作流专用，非 MCP）',
    argsHint: '{"method":"GET","url":"https://api.example.com","headers":{}}',
    category: 'workflow',
  },
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

/** 旧工具名映射，供工作流迁移提示 */
export { LEGACY_TOOL_ALIASES, normalizeToolName }
