/**
 * Blob / FormData request helpers — 统一文件上传与下载错误处理
 *
 * 抽取 aiApi 中 uploadFile / uploadRagDocument / downloadDocumentFile /
 * downloadConversation 的重复 fetch + buildHeaders + blob 模式。
 */

import { redirectToLogin } from '@schema-platform/platform-shared/utils/authPaths'
import { ApiError, buildHeaders, notifyUnauthorized } from '@/api/shared/request'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) ?? '/schema-platform/api'

export interface BlobRequestOptions {
  method?: string
  body?: BodyInit | null
  headers?: Record<string, string>
  signal?: AbortSignal
}

async function handleAuthAndError(response: Response): Promise<void> {
  if (response.status === 401) {
    notifyUnauthorized()
    redirectToLogin()
    throw new ApiError('Authentication required', 401)
  }
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const body = await response.json()
      if (body?.error?.message) message = body.error.message
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, response.status)
  }
}

/** Authenticated fetch that returns a Blob (downloads). */
export async function requestBlob(path: string, options: BlobRequestOptions = {}): Promise<Blob> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders(options.headers),
    body: options.body,
    signal: options.signal,
  })
  await handleAuthAndError(response)
  return response.blob()
}

/** Authenticated FormData/JSON upload that unwraps `{ success, data }` envelope. */
export async function uploadBlob<T>(path: string, body: BodyInit, options: Omit<BlobRequestOptions, 'body'> = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'POST',
    headers: buildHeaders(options.headers),
    body,
    signal: options.signal,
  })
  await handleAuthAndError(response)

  let json: { success: boolean; data: T; error?: { message: string } }
  try {
    json = await response.json()
  } catch {
    throw new ApiError('Response parsing failed', response.status)
  }
  if (!json.success) {
    throw new ApiError(json.error?.message ?? 'Upload failed', response.status)
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
