/**
 * AI API 基础设施：错误类型、认证 helpers、原始 fetch
 */
import { redirectToLogin } from '@schema-platform/platform-shared/utils/authPaths'
import {
  request as sharedRequest,
  buildHeaders as sharedBuildHeaders,
  ApiError,
} from '@/api/shared/request'

export const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'

export class AiApiError extends ApiError {
  constructor(message: string, status: number) {
    super(message, status)
    this.name = 'AiApiError'
  }
}

/** @deprecated Use setTokenProvider from @/api/shared/request */
export function setTokenProvider(provider: () => string | null): void {
  // Already handled by setupCapabilityAuth via shared module
}

/** @deprecated Use setUnauthorizedHandler from @/api/shared/request */
export function setUnauthorizedHandler(handler: () => void): void {
  // Already handled by setupCapabilityAuth via shared module
}

/** 构建请求 headers，自动注入 Authorization */
export function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  return sharedBuildHeaders(extra)
}

/**
 * 带认证的原始 fetch，返回 Response 对象。
 * 适用于需要读取二进制流（arrayBuffer / blob）的场景。
 */
export async function fetchRaw(url: string, init?: RequestInit): Promise<Response> {
  const mergedInit: RequestInit = { ...init }
  mergedInit.headers = sharedBuildHeaders(init?.headers as Record<string, string>)

  const response = await fetch(url, mergedInit)
  if (response.status === 401) {
    redirectToLogin()
    throw new ApiError('Authentication required', 401)
  }
  return response
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return sharedRequest<T>(path, init)
}
