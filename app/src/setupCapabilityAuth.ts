/**
 * AI 应用 — 将统一 JWT 会话注入各 fetch API 封装
 */
import { handleUnauthorized } from '@schema-platform/platform-shared/utils/authSession'
import { setTokenProvider, setUnauthorizedHandler } from '@/api/aiApi'
import {
  setAgentWorkflowTokenProvider,
  setAgentWorkflowUnauthorizedHandler,
} from '@/api/agentWorkflowApi'
import {
  setProviderTokenProvider,
  setProviderUnauthorizedHandler,
} from '@/api/providerApi'
import {
  setModelTokenProvider,
  setModelUnauthorizedHandler,
} from '@/api/modelApi'
import {
  setModelConfigTokenProvider,
  setModelConfigUnauthorizedHandler,
} from '@/api/modelConfigApi'
import {
  setApiKeyTokenProvider,
  setApiKeyUnauthorizedHandler,
} from '@/api/apiKeyApi'

export function registerAiApiTokenProvider(getToken: () => string | null): void {
  setTokenProvider(getToken)
  setAgentWorkflowTokenProvider(getToken)
  setProviderTokenProvider(getToken)
  setModelTokenProvider(getToken)
  setModelConfigTokenProvider(getToken)
  setApiKeyTokenProvider(getToken)

  const on401 = () => handleUnauthorized()
  setUnauthorizedHandler(on401)
  setAgentWorkflowUnauthorizedHandler(on401)
  setProviderUnauthorizedHandler(on401)
  setModelUnauthorizedHandler(on401)
  setModelConfigUnauthorizedHandler(on401)
  setApiKeyUnauthorizedHandler(on401)
}
