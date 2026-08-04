/**
 * RAG 检索类型定义
 */

// ---- RAG ----

export interface RagSearchResult {
  id: string
  editId: string
  name: string
  type: string
  score: number
  widgetTypes: string[]
  fieldNames: string[]
  labels: string[]
  description: string
  /** VR-1: 字段级命中的字段路径（field chunk 召回时填充） */
  matchedFields?: string[]
}

export interface RagSearchResponse {
  total: number
  schemas: RagSearchResult[]
}

// ---- RAG 检索调试 ----

export interface RagDebugItem {
  schemaId: string
  editId: string
  name: string
  type: string
  score: number
  widgetTypes: string[]
  fieldNames: string[]
  labels: string[]
  description: string
  /** VR-1: 字段级命中的字段路径（field chunk 召回时填充） */
  matchedFields?: string[]
  /** rerank 视图：rerank 前在语义结果中的排名（1-based，0=语义未召回） */
  beforeRank?: number
  /** rerank 视图：排名变化（正=上升，负=下降） */
  rankChange?: number
}

export interface RagDebugSnippet {
  snippet: string
  matchedTerms: string[]
}

export interface RagDebugTimings {
  semantic: number
  rerank: number
  hybrid: number
}

export interface RagDebugResult {
  semantic: RagDebugItem[]
  rerank: RagDebugItem[]
  hybrid: RagDebugItem[]
  snippets: Record<string, RagDebugSnippet>
  timings: RagDebugTimings
  rerankEnabled: boolean
  rerankConfigured: boolean
  rerankModel: string | null
}

/** VR-2: 结构化过滤，在向量召回前/后按元数据过滤结果 */
export interface RagDebugFilter {
  /** 限定实体类型（schema/flow/document） */
  entityKind?: Array<'schema' | 'flow' | 'document'>
  /** 表单需包含这些组件类型之一 */
  widgetTypes?: string[]
  /** 表单需包含这些字段之一 */
  fieldNames?: string[]
  industry?: string
  category?: string
}

export interface RagDebugParams {
  query: string
  topK?: number
  type?: 'form' | 'search_list'
  minScore?: number
  rerankEnabled?: boolean
  semanticWeight?: number
  keywordWeight?: number
  filter?: RagDebugFilter
}
