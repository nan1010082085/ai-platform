/**
 * AI 应用 - 将统一 JWT 会话注入共享 request 模块
 *
 * 所有 API 模块统一使用 @/api/shared/request，只需注册一次。
 * 与 platform-shared 的 apiClient 保持一致：token 注入 + 401 refresh 重试 + 失败清会话。
 */
import {
  handleUnauthorized,
  refreshAccessToken,
} from '@schema-platform/platform-shared/utils/authSession'
import {
  setTokenProvider,
  setTokenRefreshHandler,
  setUnauthorizedHandler,
} from '@/api/shared/request'

export function registerAiApiTokenProvider(getToken: () => string | null): void {
  setTokenProvider(getToken)
  setTokenRefreshHandler(refreshAccessToken)
  setUnauthorizedHandler(() => handleUnauthorized())
}
