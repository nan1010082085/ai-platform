/**
 * AI 应用 — 将统一 JWT 会话注入各 fetch API 封装
 */
import { handleUnauthorized } from '@schema-platform/platform-shared/utils/authSession'
import { setTokenProvider, setUnauthorizedHandler } from '@/api/aiApi'
import {
  setAgentWorkflowTokenProvider,
  setAgentWorkflowUnauthorizedHandler,
} from '@/api/agentWorkflowApi'

export function registerAiApiTokenProvider(getToken: () => string | null): void {
  setTokenProvider(getToken)
  setAgentWorkflowTokenProvider(getToken)
  const on401 = () => handleUnauthorized()
  setUnauthorizedHandler(on401)
  setAgentWorkflowUnauthorizedHandler(on401)
}
