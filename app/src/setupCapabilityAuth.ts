/**
 * AI 应用 — 将统一 JWT 会话注入共享 request 模块
 *
 * 所有 API 模块统一使用 @/api/shared/request，只需注册一次。
 */
import { handleUnauthorized } from '@schema-platform/platform-shared/utils/authSession'
import { setTokenProvider, setUnauthorizedHandler } from '@/api/shared/request'

export function registerAiApiTokenProvider(getToken: () => string | null): void {
  setTokenProvider(getToken)
  setUnauthorizedHandler(() => handleUnauthorized())
}
