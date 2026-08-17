/**
 * 消息渲染器契约类型。
 */

import type { Component } from 'vue'
import type { StepData } from '@/types'

export interface MessageRenderer {
  /** 渲染器类型标识（唯一键） */
  type: string
  /** Vue 组件 */
  component: Component
  /** 匹配逻辑：判断该渲染器是否处理当前步骤 */
  matcher: (step: StepData) => boolean
  /** 优先级（数字越小越优先） */
  priority: number
  /** 该渲染器可能触发的事件 */
  emitEvents?: string[]
}
