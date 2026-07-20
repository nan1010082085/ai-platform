/**
 * Blob / FormData request helpers - 统一文件上传与下载错误处理
 *
 * 抽取 aiApi 中 uploadFile / uploadRagDocument / downloadDocumentFile /
 * downloadConversation 的重复 fetch + buildHeaders + blob 模式。
 */

import { redirectToLogin } from '@schema-platform/platform-shared/utils/authPaths'
import {
  ApiError,
  attemptTokenRefresh,
  buildHeaders,
  notifyUnauthorized,
} from '@/api/shared/request'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'

export interface BlobRequestOptions {
  method?: string
  body?: BodyInit | null
  headers?: Record<string, string>
  signal?: AbortSignal
}

/**
 * Authenticated fetch with 401 refresh + retry (mirrors `request`).
 * Returns the OK response; throws `ApiError` on auth/HTTP failure.
 */
async function authFetch(
  path: string,
  options: BlobRequestOptions,
  retried: boolean,
): Promise<Response> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders(options.headers),
    body: options.body,
    signal: options.signal,
  })

  if (response.status === 401) {
    if (!retried && (await attemptTokenRefresh())) {
      return authFetch(path, options, true)
    }
    notifyUnauthorized()
    redirectToLogin()
    throw new ApiError('Authentication required', 401)
  }

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    let code: string | undefined
    try {
      const body = await response.json()
      if (typeof body?.error === 'string') {
        message = body.error
      } else if (body?.error?.message) {
        message = body.error.message
        code = body.error.code
      }
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, response.status, code)
  }

  return response
}

/** Authenticated fetch that returns a Blob (downloads). */
export async function requestBlob(path: string, options: BlobRequestOptions = {}): Promise<Blob> {
  const response = await authFetch(path, options, false)
  return response.blob()
}

/** Authenticated FormData/JSON upload that unwraps `{ success, data }` envelope. */
export async function uploadBlob<T>(path: string, body: BodyInit, options: Omit<BlobRequestOptions, 'body'> = {}): Promise<T> {
  const response = await authFetch(path, { ...options, body }, false)

  let json: { success: boolean; data: T; error?: { message: string; code?: string } }
  try {
    json = await response.json()
  } catch {
    throw new ApiError('Response parsing failed', response.status)
  }
  if (!json.success) {
    throw new ApiError(json.error?.message ?? 'Upload failed', response.status, json.error?.code)
  }
  return json.data
}

/** Trigger a browser download from a Blob. */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
