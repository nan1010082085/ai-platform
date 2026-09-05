/**
 * 节点属性面板条目类型。
 */

import type { Component } from 'vue'

/** 已注册的面板：节点 type → 组件 */
export interface NodePanelEntry {
  type: string
  component: Component
}
