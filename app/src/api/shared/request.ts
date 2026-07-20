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
  error?: { message: string }
}

export interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

// ---- Error class ----

export class ApiError extends Error {
  public readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// ---- Configurable hooks ----

const ACCESS_TOKEN_KEY = 'sfp_access_token'

let _baseUrl = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'
let _tokenProvider: (() => string | null) | null = null
let _unauthorizedHandler: (() => void) | null = null

/** Override the API base URL (default: VITE_API_BASE_URL or /schema-platform/api) */
export function setBaseUrl(url: string): void {
  _baseUrl = url
}

/** Inject a token provider so the request layer never reads storage directly */
export function setTokenProvider(provider: () => string | null): void {
  _tokenProvider = provider
}

/** Inject a handler called on 401 before redirecting to login */
export function setUnauthorizedHandler(handler: () => void): void {
  _unauthorizedHandler = handler
}

/** Invoke the registered 401 handler (session cleanup). Used by blobRequest and request. */
export function notifyUnauthorized(): void {
  _unauthorizedHandler?.()
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

// ---- Core request ----

/**
 * Generic authenticated fetch wrapper.
 *
 * - Resolves token via configurable `tokenProvider`
 * - Builds Authorization header automatically
 * - Checks `response.ok` BEFORE attempting JSON parse (avoids masking non-JSON errors)
 * - Unwraps the server `{ success, data, error }` envelope
 * - Throws `ApiError` with status code on failure
 */
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method, body, headers: extraHeaders, signal } = options

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

  // --- 401: always handle before anything else ---
  if (response.status === 401) {
    _unauthorizedHandler?.()
    redirectToLogin()
    throw new ApiError('Authentication required', 401)
  }

  // --- Non-OK: try to extract error message, handle non-JSON gracefully ---
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const errBody = await response.json()
      if (errBody?.error?.message) {
        message = errBody.error.message
      }
    } catch {
      // Non-JSON error body (e.g. HTML 404 page) -- fall back to status text
    }
    throw new ApiError(message, response.status)
  }

  // --- OK: parse response JSON ---
  let json: ApiResponse<T>
  try {
    json = (await response.json()) as ApiResponse<T>
  } catch {
    throw new ApiError('Response parsing failed', response.status)
  }

  if (!json.success) {
    throw new ApiError(json.error?.message ?? 'Request failed', response.status)
  }

  return json.data
}

// ---- Convenience re-export for callers that need raw access ----

/**
 * Build headers with Authorization injected. Useful for custom fetch calls
 * (e.g. file upload with FormData, streaming, blob downloads).
 */
export function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  return buildAuthHeaders(extra)
}
