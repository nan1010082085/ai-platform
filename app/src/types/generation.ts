/**
 * 图片和 PPT 生成类型定义
 */

// ---- Image & PPT Generation ----

export interface ImageGenerateResult {
  imageUrl?: string
  prompt?: string
  model?: string
  size?: string
  style?: string
  quality?: string
  error?: string
}

export interface PptSlideData {
  title: string
  content: string
  layout?: 'title' | 'content' | 'two-column' | 'image'
  imageUrl?: string
  notes?: string
}

export interface PptGenerateResult {
  slides?: PptSlideData[]
  metadata?: {
    title?: string
    author?: string
    createdAt?: string
    slideCount?: number
  }
  error?: string
}
