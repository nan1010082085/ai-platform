/**
 * Shared API request utility
 *
 * Consolidates the duplicated request/token/error pattern found across
 * aiApi, agentWorkflowApi, modelApi, apiKeyApi, providerApi, modelConfigApi.
 *
 * Usage:
 *   import { request, ApiError, setTokenProvider, setUnauthorizedHandler } from '@/api/shared/request'
 *   setTokenProvider(() => store.getAccessToken())
 *   setUnauthorizedHandler(() => store.logout())
 *   const data = await request<User>('/users/me')
 */

import { redirectToLogin } from '@schema-platform/platform-shared/utils/authPaths'

// ---- Types ----

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: { message: string; code?: string; details?: unknown }
}

export interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  /**
   * 跳过 `{ success, data }` 信封解析，直接把响应 JSON 作为 T 返回。
   * 用于对接不使用统一信封的端点（如 /ai/debug/* 调试路由）。
   */
  raw?: boolean
}

// ---- Error class ----

export class ApiError extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// ---- Configurable hooks ----

const ACCESS_TOKEN_KEY = 'sfp_access_token'

let _baseUrl = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'
let _tokenProvider: (() => string | null) | null = null
let _tokenRefreshHandler: (() => Promise<boolean>) | null = null
let _unauthorizedHandler: (() => void) | null = null

/** Override the API base URL (default: VITE_API_BASE_URL or /schema-platform/api) */
export function setBaseUrl(url: string): void {
  _baseUrl = url
}

/** Inject a token provider so the request layer never reads storage directly */
export function setTokenProvider(provider: () => string | null): void {
  _tokenProvider = provider
}

/**
 * Inject a refresh handler invoked on 401 before giving up.
 * When it resolves true, the original request is retried once with the refreshed token.
 * Mirrors the apiClient (axios) behavior in platform-shared.
 */
export function setTokenRefreshHandler(handler: () => Promise<boolean>): void {
  _tokenRefreshHandler = handler
}

/** Inject a handler called on 401 before redirecting to login */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  _unauthorizedHandler = handler
}

/** Invoke the registered 401 handler (session cleanup). Used by blobRequest and request. */
export function notifyUnauthorized(): void {
  _unauthorizedHandler?.()
}

/**
 * Try to refresh the access token via the registered handler.
 * Returns false when no handler is registered or refresh failed.
 * Shared with blobRequest so uploads/downloads get the same 401 retry behavior.
 */
export async function attemptTokenRefresh(): Promise<boolean> {
  if (!_tokenRefreshHandler) return false
  try {
    return await _tokenRefreshHandler()
  } catch {
    return false
  }
}

// ---- Internal helpers ----

function resolveToken(): string | null {
  return _tokenProvider?.() || localStorage.getItem(ACCESS_TOKEN_KEY)
}

function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra }
  const token = resolveToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Extract error message / code / details from a non-OK response body.
 * Tolerates both envelope `{ error: { message, code } }` and plain `{ error: 'string' }`
 * shapes (debug routes use the latter), as well as non-JSON bodies.
 */
async function extractError(response: Response): Promise<ApiError> {
  const fallback = `${response.status} ${response.statusText}`
  let message = fallback
  let code: string | undefined
  let details: unknown
  try {
    const errBody = await response.json()
    if (typeof errBody?.error === 'string') {
      message = errBody.error
    } else if (errBody?.error && typeof errBody.error === 'object') {
      if (errBody.error.message) message = String(errBody.error.message)
      if (errBody.error.code) code = String(errBody.error.code)
      if (errBody.error.details !== undefined) details = errBody.error.details
    }
  } catch {
    // Non-JSON error body (e.g. HTML 404 page) -- fall back to status text
  }
  return new ApiError(message, response.status, code, details)
}

// ---- Core request ----

/**
 * Generic authenticated fetch wrapper.
 *
 * - Resolves token via configurable `tokenProvider`
 * - Builds Authorization header automatically
 * - On 401: tries `tokenRefreshHandler` once, retries the original request on success
 * - Checks `response.ok` BEFORE attempting JSON parse (avoids masking non-JSON errors)
 * - Unwraps the server `{ success, data, error }` envelope (unless `raw` is set)
 * - Throws `ApiError` with status / code / details on failure
 */
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  return doRequest<T>(url, options, false)
}

async function doRequest<T>(url: string, options: RequestOptions, retried: boolean): Promise<T> {
  const { method, body, headers: extraHeaders, signal, raw } = options

  const headers: Record<string, string> = {
    ...buildAuthHeaders(extraHeaders),
  }

  // Only set Content-Type when there is a body and the caller hasn't set it
  // (e.g. FormData requires the browser to set the boundary automatically).
  if (body !== undefined && body !== null && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  const init: RequestInit = {
    method,
    headers,
    signal,
  }

  if (body !== undefined && body !== null) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
  }

  const response = await fetch(`${_baseUrl}${url}`, init)

  // --- 401: refresh + retry once before giving up ---
  if (response.status === 401) {
    if (!retried && (await attemptTokenRefresh())) {
      return doRequest<T>(url, options, true)
    }
    _unauthorizedHandler?.()
    redirectToLogin()
    throw new ApiError('Authentication required', 401)
  }

  // --- Non-OK: try to extract error message, handle non-JSON gracefully ---
  if (!response.ok) {
    throw await extractError(response)
  }

  // --- OK: parse response JSON ---
  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new ApiError('Response parsing failed', response.status)
  }

  // Raw mode: caller opted out of the envelope, return payload as-is
  if (raw) {
    return json as T
  }

  const envelope = json as ApiResponse<T>
  if (!envelope.success) {
    throw new ApiError(
      envelope.error?.message ?? 'Request failed',
      response.status,
      envelope.error?.code,
      envelope.error?.details,
    )
  }

  return envelope.data
}

// ---- Convenience re-export for callers that need raw access ----

/**
 * Build headers with Authorization injected. Useful for custom fetch calls
 * (e.g. file upload with FormData, streaming, blob downloads).
 */
export function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  return buildAuthHeaders(extra)
}
