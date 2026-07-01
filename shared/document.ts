/**
 * 文档领域类型 — Chat 与 Workflow 共用
 */

export interface DocumentChunk {
  page: number
  text: string
  startOffset: number
}

export interface StructuredSummary {
  title: string
  summary: string
  keyPoints: string[]
  sections: Array<{ heading: string; content: string }>
  entities?: string[]
  generatedAt: string
}

export interface DocumentRecord {
  id: string
  filename: string
  mimetype: string
  size: number
  textLength: number
  chunkCount: number
  hasSummary: boolean
  summary?: StructuredSummary
  createdAt: string
  updatedAt: string
}

export interface DocumentPreview {
  id: string
  filename: string
  mimetype: string
  size: number
  text: string
  excerpt: string
  chunks: DocumentChunk[]
  summary?: StructuredSummary
}

export interface MessageDocumentAttachment {
  documentId: string
  filename: string
  mimetype: string
  size: number
  excerpt?: string
}

export interface MessageDocumentSummary {
  documentId: string
  filename: string
  summary: StructuredSummary
}
