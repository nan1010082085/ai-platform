/**
 * 错误码 / HTTP 状态码 -> 友好文本映射
 *
 * server 错误响应格式：`{ success: false, error: { message, code?, details? } }`
 * 部分 ai 路由返回 `code`（如 invalid_api_key、not_found、execution_not_found）。
 * `@/api/shared/request` 的 ApiError 已保留 code / status / details，
 * 各处展示错误时统一用 `resolveErrorText` 取友好文本，避免直接裸露 server message。
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

/** HTTP 状态码 -> 中文友好文本（无 code 时按 status 兜底） */
export const HTTP_STATUS_TEXT: Record<number, string> = {
  400: '请求参数有误',
  401: '登录已过期，请重新登录',
  403: '没有权限执行此操作',
  404: '资源不存在',
  409: '资源已存在或存在冲突',
  413: '请求内容超出大小限制',
  422: '请求数据无法处理',
  429: '请求过于频繁，请稍后再试',
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
 * 优先级：error.code 映射 > error.message（server 具体描述）> error.status 映射 > fallback。
 * - 有 code 时用枚举文本（如 invalid_api_key -> "API Key 无效或已失效"）
 * - 否则保留 server message（如 "API key is required for this provider."），信息更具体
 * - message 为空时按 HTTP status 兜底
 * 用于 ElMessage.error / testError 等展示场景。
 */
export function resolveErrorText(error: unknown, fallback = '操作失败'): string {
  if (!error) return fallback
  const e = error as ErrorLike
  if (e.code && ERROR_CODE_TEXT[e.code]) return ERROR_CODE_TEXT[e.code]
  if (e.message) return e.message
  if (e.status && HTTP_STATUS_TEXT[e.status]) return HTTP_STATUS_TEXT[e.status]
  return fallback
}
