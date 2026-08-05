/**
 * 错误码 / 错误消息 / HTTP 状态码 -> 友好文本映射
 *
 * server 错误响应格式：`{ success: false, error: { message, code?, details? } }`
 * 大部分 ai 路由只返回 message 不返回 code，本文件两层映射确保全覆盖：
 * 1. ERROR_CODE_TEXT: code -> 中文（优先）
 * 2. ERROR_MESSAGE_TEXT: 英文 message -> 中文（code 缺失时兜底）
 * 3. HTTP_STATUS_TEXT: HTTP status -> 中文（message 也为空时兜底）
 */

/** server 已知业务错误码 -> 中文友好文本 */
export const ERROR_CODE_TEXT: Record<string, string> = {
  // 登录 / 鉴权
  invalid_credentials: '用户名或密码错误',
  invalid_tenant: '租户不存在或已禁用',
  account_disabled: '账户已被禁用，请联系管理员',
  invalid_refresh_token: '登录已过期，请重新登录',
  invalid_token_type: '令牌类型错误',
  token_revoked: '登录已过期，请重新登录',
  user_not_found: '用户不存在',
  // API Key
  invalid_api_key: 'API Key 无效或已失效',
  invalid_webhook_auth: 'Webhook 认证失败',
  // Workflow Open API
  invoke_key_invalid: '调用密钥无效或已失效，请重新获取',
  invoke_key_expired: '调用密钥已过期，请重新轮换',
  workflow_not_published: '工作流未发布，无法通过 Open API 调用',
  workflow_not_found: '工作流不存在',
  workflow_execution_timeout: '工作流执行超时',
  workflow_execution_failed: '工作流执行失败',
  workflow_hitl_expired: '人工确认已超时，执行已自动取消',
  workflow_callback_failed: '回调通知失败，但执行已完成',
  workflow_rate_limited: '调用频率超限，请稍后重试',
  // MCP
  mcp_tool_unavailable: 'MCP 工具不可用，服务可能未启动',
  mcp_tool_timeout: 'MCP 工具调用超时',
  mcp_tool_error: 'MCP 工具执行出错',
  mcp_server_disconnected: 'MCP 服务器已断开连接',
  // RAG
  rag_index_stale: 'RAG 索引过期，请重新索引',
  rag_embedding_failed: '向量化失败，请检查 embedding 配置',
  rag_search_failed: '语义检索失败',
  rag_upload_failed: '文件上传失败',
  // 通用资源
  not_found: '资源不存在',
  execution_not_found: '执行记录不存在',
  // 参数 / 请求体
  invalid_param: '请求参数无效',
  invalid_body: '请求体格式无效',
  invalid_layer: '无效的层级',
  body_too_large: '请求内容超出大小限制',
  // 写入
  write_failed: '写入失败',
  // 能力未配置
  IMAGE_API_NOT_CONFIGURED: '图像服务未配置，请先在设置中开通',
}

/**
 * server 裸 message（英文）-> 中文友好文本。
 *
 * 覆盖 server/src/ai/** 中所有 ctx.body = { success: false, error: { message: '...' } } 的场景。
 * 按 server 实际返回的 message 精确匹配（大小写敏感）。
 */
export const ERROR_MESSAGE_TEXT: Record<string, string> = {
  // ── 鉴权 ──
  'Authentication required': '请先登录',

  // ── 资源不存在 ──
  'Workflow not found': '工作流不存在',
  'Execution not found': '执行记录不存在',
  'Execution not found or not cancellable': '执行不存在或无法取消',
  'Execution not found or not waiting': '执行不存在或不在等待状态',
  'Flow not found': '流程不存在',
  'Flow has no version': '流程未发布版本',
  'Schema not found': '表单不存在',
  'Document not found': '文档不存在',
  'Conversation not found.': '会话不存在',
  'Message not found.': '消息不存在',
  'Model not found.': '模型不存在',
  'Provider not found.': '供应商不存在',
  'Associated provider not found.': '关联供应商不存在',
  'Node not found': '节点不存在',
  'Plugin not found': '插件不存在',
  'Webhook not found': 'Webhook 不存在',
  'Original file not found': '原始文件不存在',
  'Proposal not found': '操作建议不存在',
  'Dataset not found': '数据集不存在',
  'Version not found': '版本不存在',
  'Version not found.': '版本不存在',
  'Version not found in this conversation.': '该会话中不存在此版本',
  'Shared conversation not found.': '共享会话不存在',
  'Run not found': '执行记录不存在',
  'Prompt template not found': '提示词模板不存在',

  // ── 参数 / 格式无效 ──
  'Invalid workflow id': '工作流 ID 格式无效',
  'Invalid execution id': '执行 ID 格式无效',
  'Invalid workflowId': '工作流 ID 格式无效',
  'Invalid ID format.': 'ID 格式无效',
  'Invalid slugOrId': '标识格式无效',
  'Invalid providerId format.': '供应商 ID 格式无效',
  'Invalid feedback type. Must be "positive" or "negative".': '反馈类型无效，需为 positive 或 negative',
  'Invalid layer': '无效的层级',

  // ── 必填字段 ──
  'content is required': '内容不能为空',
  'name is required': '名称不能为空',
  'file is required': '请上传文件',
  'prompt is required': '提示词不能为空',
  'query is required': '查询参数不能为空',
  'query parameter is required': '查询参数不能为空',
  'image or documentId is required': '请提供图片或文档 ID',
  'datasetId is required': '数据集 ID 不能为空',
  'versionId is required': '版本 ID 不能为空',
  'behaviors array is required': '行为数组不能为空',
  'schemaId, flowId, nodeId are required': '请提供 schemaId、flowId、nodeId',
  'target.id is required': '目标 ID 不能为空',
  'variables object is required': '变量对象不能为空',
  'JSON body required': '请求体必须为 JSON',
  'templateId、name、graph 为必填': 'templateId、name、graph 为必填',
  'title 和 content 必填': '标题和内容不能为空',
  '缺少 graph 数据': '缺少流程图数据',
  'server and tool are required': '请选择服务器和工具',

  // ── 业务逻辑 ──
  'Only userTask nodes can bind schemas': '仅用户任务节点可绑定表单',
  'Cannot compare versions of different types (schema vs flow).': '不能比较不同类型的版本',
  'Cannot delete built-in templates': '不能删除内置模板',
  'Cannot modify built-in templates. Create a copy instead.': '不能修改内置模板，请创建副本',
  '仅已发布工作流可轮换调用密钥': '仅已发布工作流可轮换调用密钥',
  'Maximum 50 behaviors per batch': '每批最多 50 条行为记录',
  'type must be schema, flow, or widget': '类型必须为 schema、flow 或 widget',

  // ── API Key ──
  'API key is required for this provider.': '该供应商需要 API Key，请先在设置中配置',
  'API key is required to list remote models.': '列出远程模型需要 API Key',
  'API key is required to sync models.': '同步模型需要 API Key',

  // ── 操作失败 ──
  'Failed to start workflow': '启动工作流失败',
  'Failed to update feedback.': '更新反馈失败',
  'Failed to generate action proposals': '生成操作建议失败',
  'Webhook execution failed': 'Webhook 执行失败',

  // ── 版本对比 ──
  'v1 and v2 query parameters are required': '请提供 v1 和 v2 查询参数',
}

/** HTTP 状态码 -> 中文友好文本（无 code 且无 message 匹配时兜底） */
export const HTTP_STATUS_TEXT: Record<number, string> = {
  400: '请求参数有误',
  401: '登录已过期，请重新登录',
  403: '没有权限执行此操作',
  404: '资源不存在',
  409: '资源已存在或存在冲突',
  413: '请求内容超出大小限制',
  422: '请求数据无法处理',
  429: '请求过于频繁，请稍后重试',
  500: '服务器内部错误，请稍后重试',
  502: '上游服务异常',
  503: '服务暂不可用',
  504: '请求超时，请稍后重试',
}

interface ErrorLike {
  message?: string
  code?: string
  status?: number
}

/**
 * 解析错误为友好展示文本。
 *
 * 优先级：code 映射 > message 精确映射 > message 前缀映射 > 原始 message > status 映射 > fallback。
 * 1. 有 code 且在 ERROR_CODE_TEXT 中 -> 返回中文
 * 2. 有 message 且在 ERROR_MESSAGE_TEXT 中 -> 返回中文
 * 3. message 匹配已知前缀模式（Invalid / not found / is required）-> 返回中文
 * 4. 有 message 但不在映射中 -> 原样返回
 * 5. 有 status 且在 HTTP_STATUS_TEXT 中 -> 返回中文
 * 6. 都没有 -> 返回 fallback
 */
export function resolveErrorText(error: unknown, fallback = '操作失败'): string {
  if (!error) return fallback
  const e = error as ErrorLike
  // 1. code 映射
  if (e.code && ERROR_CODE_TEXT[e.code]) return ERROR_CODE_TEXT[e.code]
  // 2. message 精确映射
  if (e.message && ERROR_MESSAGE_TEXT[e.message]) return ERROR_MESSAGE_TEXT[e.message]
  // 3. message 前缀映射（处理 server 动态拼接的 message）
  if (e.message) {
    if (e.message.startsWith('Invalid ')) {
      const label = e.message.slice('Invalid '.length)
      return `${label} 格式无效`
    }
    if (e.message.endsWith(' not found') || e.message.endsWith(' not found.')) {
      const label = e.message.replace(/ not found\.?$/i, '')
      return `${label} 不存在`
    }
    if (e.message.endsWith(' is required')) {
      const label = e.message.replace(/ is required$/i, '')
      return `${label} 不能为空`
    }
  }
  // 4. 原始 message
  if (e.message) return e.message
  // 4. HTTP status 兜底
  if (e.status && HTTP_STATUS_TEXT[e.status]) return HTTP_STATUS_TEXT[e.status]
  // 5. fallback
  return fallback
}
