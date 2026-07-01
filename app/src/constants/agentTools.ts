/**
 * Agent 工作流工具节点 — 内置工具注册表
 *
 * 与 schema-form-server MCP 工具名对齐（domain__action）。
 * 工作流执行器通过 registry 路由到同一套 MCP / LangGraph 工具实现。
 */

import {
  SCHEMA_SEARCH,
  SCHEMA_GET_DETAIL,
  SCHEMA_VALIDATE_WIDGETS,
  SCHEMA_SEARCH_PUBLISHED,
  FLOW_SEARCH,
  FLOW_GET_DETAIL,
  FLOW_VALIDATE,
  WIDGET_QUERY,
  RAG_SEARCH,
  normalizeToolName,
  getToolDisplayLabel,
  LEGACY_TOOL_ALIASES,
} from '@schema-platform/ai-shared/toolNames'

export interface BuiltInToolDef {
  name: string
  label: string
  description: string
  /** 参数提示，展示在面板上帮助用户填写 JSON */
  argsHint: string
}

/**
 * 内置工具清单（MCP 权威名 + 向后兼容旧名）。
 */
export const BUILT_IN_TOOLS: BuiltInToolDef[] = [
  {
    name: RAG_SEARCH,
    label: getToolDisplayLabel(RAG_SEARCH),
    description: '在知识库中语义检索相关文档',
    argsHint: '{"query":"{{$input.message}}","limit":5}',
  },
  {
    name: SCHEMA_SEARCH,
    label: getToolDisplayLabel(SCHEMA_SEARCH),
    description: '按关键词搜索平台 Schema 实例',
    argsHint: '{"keyword":"表单","limit":5}',
  },
  {
    name: SCHEMA_SEARCH_PUBLISHED,
    label: getToolDisplayLabel(SCHEMA_SEARCH_PUBLISHED),
    description: '搜索已发布的 Schema',
    argsHint: '{"keyword":"表单","limit":5}',
  },
  {
    name: SCHEMA_GET_DETAIL,
    label: getToolDisplayLabel(SCHEMA_GET_DETAIL),
    description: '获取指定 Schema 的详细内容',
    argsHint: '{"schemaId":"<id>"}',
  },
  {
    name: SCHEMA_VALIDATE_WIDGETS,
    label: getToolDisplayLabel(SCHEMA_VALIDATE_WIDGETS),
    description: '校验 Schema 组件配置是否合法',
    argsHint: '{"widgets":[]}',
  },
  {
    name: FLOW_SEARCH,
    label: getToolDisplayLabel(FLOW_SEARCH),
    description: '按关键词搜索 BPMN 流程',
    argsHint: '{"keyword":"审批","limit":5}',
  },
  {
    name: FLOW_GET_DETAIL,
    label: getToolDisplayLabel(FLOW_GET_DETAIL),
    description: '获取指定流程的详细内容',
    argsHint: '{"flowId":"<id>"}',
  },
  {
    name: FLOW_VALIDATE,
    label: getToolDisplayLabel(FLOW_VALIDATE),
    description: '校验流程定义是否合法',
    argsHint: '{"flow":{"nodes":[],"edges":[]}}',
  },
  {
    name: WIDGET_QUERY,
    label: getToolDisplayLabel(WIDGET_QUERY),
    description: '查询可用组件库',
    argsHint: '{"category":"form"}',
  },
  {
    name: 'http_request',
    label: 'HTTP 请求',
    description: '发起自定义 HTTP 请求（工作流专用，非 MCP）',
    argsHint: '{"method":"GET","url":"https://api.example.com","headers":{}}',
  },
]

export function getBuiltInTool(name: string): BuiltInToolDef | undefined {
  const normalized = normalizeToolName(name)
  return BUILT_IN_TOOLS.find((t) => t.name === normalized || t.name === name)
}

export const BUILT_IN_TOOL_NAMES = BUILT_IN_TOOLS.map((t) => t.name)

/** 旧工具名映射，供工作流迁移提示 */
export { LEGACY_TOOL_ALIASES, normalizeToolName }
