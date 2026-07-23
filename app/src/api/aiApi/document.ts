/**
 * 文档处理 API：上传、预览、摘要、下载、重新解析、图片分析
 */
import { request, BASE_URL } from './base'
import { requestBlob, uploadBlob, triggerBlobDownload } from '@/api/shared/blobRequest'

export interface UploadResult {
  id: string
  filename: string
  mimetype: string
  size: number
  text: string
  textLength?: number
  chunkCount?: number
  excerpt?: string
  hasOriginalFile?: boolean
  extractionMethod?: 'ocr' | 'pdf' | 'docx' | 'doc' | 'csv' | 'xlsx' | 'ofd' | 'txt' | 'empty'
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  return uploadBlob<UploadResult>('/ai/documents/upload', form)
}

export interface StructuredSummary {
  title: string
  summary: string
  keyPoints: string[]
  sections: Array<{ heading: string; content: string }>
  entities?: string[]
  generatedAt: string
}

export interface DocumentPreviewResult {
  id: string
  filename: string
  mimetype: string
  size: number
  text: string
  excerpt: string
  chunks: Array<{ page: number; text: string; startOffset: number }>
  summary?: StructuredSummary
  hasOriginalFile?: boolean
  extractionMethod?: 'ocr' | 'pdf' | 'docx' | 'doc' | 'csv' | 'xlsx' | 'ofd' | 'txt' | 'empty'
}

export interface DocumentSummarizeResult {
  documentId: string
  filename: string
  summary: StructuredSummary
}

export async function getDocumentPreview(documentId: string): Promise<DocumentPreviewResult> {
  return request<DocumentPreviewResult>(`/ai/documents/${encodeURIComponent(documentId)}/preview`)
}

export async function summarizeDocument(
  documentId: string,
  force = false,
): Promise<DocumentSummarizeResult> {
  return request<DocumentSummarizeResult>(`/ai/documents/${encodeURIComponent(documentId)}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force }),
  })
}

export function getDocumentFileUrl(documentId: string): string {
  return `${BASE_URL}/ai/documents/${encodeURIComponent(documentId)}/file`
}

export async function downloadDocumentFile(documentId: string, filename: string): Promise<void> {
  const blob = await requestBlob(`/ai/documents/${encodeURIComponent(documentId)}/file`)
  triggerBlobDownload(blob, filename)
}

export async function reparseDocument(documentId: string): Promise<UploadResult> {
  return request<UploadResult>(`/ai/documents/${encodeURIComponent(documentId)}/reparse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}

// ---- 图片分析 ----

export interface AnalyzeImageResult {
  description: string
}

export async function analyzeImage(base64Image: string): Promise<AnalyzeImageResult> {
  return request<AnalyzeImageResult>('/ai/analyze-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  })
}
