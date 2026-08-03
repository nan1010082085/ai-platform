/**
 * Chat 设置和请求类型定义
 */

// ---- 上下文 ----

export interface SelectedWidgetInfo {
  id: string
  type: string
  field?: string
  label?: string
}

export interface ChatContext {
  /** 当前选中的组件 */
  selectedWidget?: SelectedWidgetInfo
  /** 当前 Schema ID */
  schemaId?: string
  /** 当前 Schema 名称 */
  schemaName?: string
  /** 编辑器模式 */
  editorMode?: 'design' | 'preview' | 'data'
}

// ---- Chat Settings ----

export type ReplyLanguage = 'zh-CN' | 'en-US'
export type ReplyStyle = 'concise' | 'detailed'
export type CodeCommentMode = 'yes' | 'no'
export type HistorySummaryMode = 'auto' | 'manual'

export interface ChatSettings {
  /** 回复语言 */
  replyLanguage: ReplyLanguage
  /** 回复风格 */
  replyStyle: ReplyStyle
  /** 代码注释模式 */
  codeCommentMode: CodeCommentMode
  /** 历史摘要模式 */
  historySummaryMode: HistorySummaryMode
  /** 自动应用变更 */
  autoApply: boolean
  /** 显示思考过程 */
  showThinking: boolean
  /** 显示工具调用 */
  showToolCalls: boolean
}

// ---- 对话请求 ----

export interface MentionReference {
  type: 'schema' | 'flow' | 'document'
  id: string
  name: string
}

export interface ChatRequest {
  message: string
  conversationId?: string
  context?: ChatContext
  mentions?: MentionReference[]
  attachments?: Array<{
    documentId: string
    filename: string
  }>
}
