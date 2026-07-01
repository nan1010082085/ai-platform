/**
 * MCP 工具名权威定义 — 内部 Chat 与外部 MCP 客户端共用。
 *
 * 命名规范：{domain}__{action}，如 schema__search、flow__validate。
 * LangGraph 专有工具（HITL / 图路由）不带前缀：update_schema、generate_schema 等。
 */

// ── MCP Schema ──
export const SCHEMA_SEARCH = 'schema__search'
export const SCHEMA_GET_DETAIL = 'schema__get_detail'
export const SCHEMA_VALIDATE = 'schema__validate'
export const SCHEMA_VALIDATE_WIDGETS = 'schema__validate_widgets'
export const SCHEMA_SEARCH_PUBLISHED = 'schema__search_published'
export const SCHEMA_FUZZY_SEARCH = 'schema__fuzzy_search'
export const SCHEMA_FIND_FLOW_REFERENCES = 'schema__find_flow_references'

// ── MCP Flow ──
export const FLOW_SEARCH = 'flow__search'
export const FLOW_GET_DETAIL = 'flow__get_detail'
export const FLOW_VALIDATE = 'flow__validate'
export const FLOW_SEARCH_USERS = 'flow__search_users'
export const FLOW_GET_NODE_SCHEMA = 'flow__get_node_schema'

// ── MCP Widget ──
export const WIDGET_QUERY = 'widget__query'
export const WIDGET_VALIDATE = 'widget__validate'

// ── MCP RAG ──
export const RAG_SEARCH = 'rag__search'

// ── MCP Industry ──
export const INDUSTRY_SEARCH_TEMPLATES = 'industry__search_templates'
export const INDUSTRY_VALIDATE_FORM = 'industry__validate_form'

// ── LangGraph 专有 ──
export const UPDATE_SCHEMA = 'update_schema'
export const GENERATE_SCHEMA = 'generate_schema'
export const UPDATE_FLOW = 'update_flow'
export const SAVE_AND_BIND_SCHEMA = 'save_and_bind_schema'
export const BIND_SCHEMA_TO_FLOW_NODE = 'bind_schema_to_flow_node'
export const REQUEST_COLLABORATION = 'request_collaboration'
export const RAG_INDEX = 'rag_index'

/** 旧工具名 → MCP 工具名（历史消息 / 工作流配置向后兼容） */
export const LEGACY_TOOL_ALIASES: Record<string, string> = {
  search_schemas: SCHEMA_SEARCH,
  get_schema_detail: SCHEMA_GET_DETAIL,
  validate_schema: SCHEMA_VALIDATE_WIDGETS,
  search_published_schemas: SCHEMA_SEARCH_PUBLISHED,
  fuzzy_search_schemas: SCHEMA_FUZZY_SEARCH,
  search_widgets_by_keyword: SCHEMA_FUZZY_SEARCH,
  find_flow_references: SCHEMA_FIND_FLOW_REFERENCES,
  search_flows: FLOW_SEARCH,
  get_flow_detail: FLOW_GET_DETAIL,
  validate_flow: FLOW_VALIDATE,
  search_users: FLOW_SEARCH_USERS,
  get_flow_node_schema: FLOW_GET_NODE_SCHEMA,
  get_widget_catalogue: WIDGET_QUERY,
  query_widgets: WIDGET_QUERY,
  validate_widget_schema: WIDGET_VALIDATE,
  rag_search: RAG_SEARCH,
  search_industry_templates: INDUSTRY_SEARCH_TEMPLATES,
  validate_industry_form: INDUSTRY_VALIDATE_FORM,
}

export function normalizeToolName(name: string): string {
  return LEGACY_TOOL_ALIASES[name] ?? name
}

/** 判断是否为 Schema Widget 校验类工具（含旧名） */
export function isSchemaWidgetValidateTool(name: string): boolean {
  const n = normalizeToolName(name)
  return n === SCHEMA_VALIDATE_WIDGETS || n === UPDATE_SCHEMA
}

/** 判断是否为 Flow 写入/校验类工具（含旧名） */
export function isFlowWriteOrValidateTool(name: string): boolean {
  const n = normalizeToolName(name)
  return n === FLOW_VALIDATE || n === UPDATE_FLOW
}

/** Prompt 中 Editor Agent 可用工具列表 */
export const EDITOR_MCP_TOOLS_PROMPT = `**表单相关工具（MCP）**：
- ${SCHEMA_SEARCH}: 搜索表单 Schema
- ${SCHEMA_GET_DETAIL}: 获取表单详情
- ${SCHEMA_SEARCH_PUBLISHED}: 搜索已发布表单
- ${SCHEMA_FUZZY_SEARCH}: 语义/关键词模糊搜索表单
- ${SCHEMA_VALIDATE_WIDGETS}: 校验 Widget 数组结构
- ${SCHEMA_VALIDATE}: 校验 Schema 文档结构
- ${SCHEMA_FIND_FLOW_REFERENCES}: 查找引用该 Schema 的流程节点
- ${WIDGET_QUERY}: 查询组件目录
- ${RAG_SEARCH}: 智能语义匹配已有 Schema
- ${INDUSTRY_SEARCH_TEMPLATES}: 搜索行业模板
- ${INDUSTRY_VALIDATE_FORM}: 校验行业表单规范

**LangGraph 专有工具**：
- ${UPDATE_SCHEMA}: 提交 Schema 修改（HITL 确认）
- ${GENERATE_SCHEMA}: 调用 LLM 生成新表单
- ${REQUEST_COLLABORATION}: 请求其他专家协作`

/** Prompt 中 Flow Agent 可用工具列表 */
export const FLOW_MCP_TOOLS_PROMPT = `**流程相关工具（MCP）**：
- ${FLOW_SEARCH}: 搜索流程
- ${FLOW_GET_DETAIL}: 获取流程详情
- ${FLOW_SEARCH_USERS}: 搜索用户（审批指派人）
- ${FLOW_VALIDATE}: 校验 FlowGraph
- ${FLOW_GET_NODE_SCHEMA}: 获取节点绑定的表单

**表单相关工具（MCP，流程绑表单时使用）**：
- ${SCHEMA_SEARCH}: 搜索可复用表单
- ${SCHEMA_GET_DETAIL}: 获取表单详情
- ${RAG_SEARCH}: 智能语义匹配表单

**LangGraph 专有工具**：
- ${UPDATE_FLOW}: 提交流程修改（HITL 确认）
- ${GENERATE_SCHEMA}: 生成新表单
- ${SAVE_AND_BIND_SCHEMA}: 保存表单并绑定到流程节点
- ${BIND_SCHEMA_TO_FLOW_NODE}: 绑定已有表单到节点
- ${REQUEST_COLLABORATION}: 请求 Editor 专家协作`

/** Prompt 中 Page Agent 可用工具列表 */
export const PAGE_MCP_TOOLS_PROMPT = `**表单相关工具（MCP）**：
- ${SCHEMA_SEARCH}: 搜索表单 Schema
- ${SCHEMA_GET_DETAIL}: 获取表单详情
- ${SCHEMA_SEARCH_PUBLISHED}: 搜索已发布表单
- ${SCHEMA_FUZZY_SEARCH}: 语义/关键词模糊搜索
- ${SCHEMA_VALIDATE_WIDGETS}: 校验 Widget 数组
- ${WIDGET_QUERY}: 查询组件目录
- ${RAG_SEARCH}: 智能语义匹配

**流程相关工具（MCP）**：
- ${FLOW_SEARCH}: 搜索流程
- ${FLOW_GET_DETAIL}: 获取流程详情
- ${FLOW_SEARCH_USERS}: 搜索用户
- ${FLOW_VALIDATE}: 校验流程

**LangGraph 专有工具**：
- ${UPDATE_SCHEMA}: 提交 Schema 修改
- ${GENERATE_SCHEMA}: 生成表单
- ${REQUEST_COLLABORATION}: 请求协作`

/** Requirement Analyzer 可用搜索工具 */
export const REQUIREMENT_ANALYZER_TOOLS_PROMPT = `- ${FLOW_SEARCH}: 搜索流程列表
- ${FLOW_GET_DETAIL}: 获取流程详情
- ${SCHEMA_SEARCH}: 搜索表单列表
- ${SCHEMA_GET_DETAIL}: 获取表单详情
- ${RAG_SEARCH}: 智能语义匹配`

/** 前端 / UI 工具名 → 中文标签 */
export const TOOL_DISPLAY_LABELS: Record<string, string> = {
  [SCHEMA_SEARCH]: '搜索表单',
  [SCHEMA_GET_DETAIL]: '获取表单详情',
  [SCHEMA_VALIDATE]: '校验 Schema 文档',
  [SCHEMA_VALIDATE_WIDGETS]: '校验 Schema',
  [SCHEMA_SEARCH_PUBLISHED]: '搜索已发布表单',
  [SCHEMA_FUZZY_SEARCH]: '模糊搜索表单',
  [SCHEMA_FIND_FLOW_REFERENCES]: '查找流程引用',
  [FLOW_SEARCH]: '搜索流程',
  [FLOW_GET_DETAIL]: '获取流程详情',
  [FLOW_VALIDATE]: '校验流程',
  [FLOW_SEARCH_USERS]: '搜索用户',
  [FLOW_GET_NODE_SCHEMA]: '获取流程节点表单',
  [WIDGET_QUERY]: '查询组件',
  [WIDGET_VALIDATE]: '校验组件 Schema',
  [RAG_SEARCH]: '智能匹配',
  [INDUSTRY_SEARCH_TEMPLATES]: '搜索行业模板',
  [INDUSTRY_VALIDATE_FORM]: '校验行业表单',
  [UPDATE_SCHEMA]: '更新表单',
  [GENERATE_SCHEMA]: '生成表单',
  [UPDATE_FLOW]: '更新流程',
  [SAVE_AND_BIND_SCHEMA]: '保存并绑定表单',
  [BIND_SCHEMA_TO_FLOW_NODE]: '绑定表单到流程节点',
  [REQUEST_COLLABORATION]: '请求协作',
  [RAG_INDEX]: 'RAG 索引',
  // 向后兼容旧名
  search_schemas: '搜索表单',
  get_schema_detail: '获取表单详情',
  search_published_schemas: '搜索已发布表单',
  fuzzy_search_schemas: '模糊搜索表单',
  validate_schema: '校验 Schema',
  search_flows: '搜索流程',
  get_flow_detail: '获取流程详情',
  search_users: '搜索用户',
  validate_flow: '校验流程',
  get_widget_catalogue: '查询组件目录',
  query_widgets: '查询组件',
  rag_search: '智能匹配',
  search_industry_templates: '搜索行业模板',
  validate_industry_form: '校验行业表单',
}

export function getToolDisplayLabel(name: string): string {
  return TOOL_DISPLAY_LABELS[name] ?? TOOL_DISPLAY_LABELS[normalizeToolName(name)] ?? name
}
