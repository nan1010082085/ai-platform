/**
 * Shell 路由贡献类型。
 */

import type { Component } from 'vue'
import type { RouteComponent } from 'vue-router'

/** 布局槽：ai-layout 子路由 / bare 顶层 / public 公开页 */
export type ShellLayout = 'ai-layout' | 'bare' | 'public'

export interface ShellRouteContribution {
  name: string
  path: string
  component: RouteComponent | Component | (() => Promise<unknown>)
  layout: ShellLayout
  meta?: { public?: boolean }
  order?: number
  /** 仅 ai-layout：相对父 path 的子 path（无前导 /） */
  childPath?: string
}
