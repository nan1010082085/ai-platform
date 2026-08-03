/**
 * Widget 类型定义
 *
 * 简化引用，完整类型在 editor 包。
 */

/** Widget 位置信息 */
export interface WidgetPosition {
  x: number
  y: number
  w: number
  h: number
  zIndex?: number
}

/** Widget 基础结构（对齐 editor/widgets/base/types.ts） */
export interface Widget {
  id: string
  type: string
  field?: string
  label?: string
  props?: Record<string, unknown>
  position?: WidgetPosition
  children?: Widget[]
  events?: unknown[]
  rules?: unknown[]
  variables?: unknown[]
}
