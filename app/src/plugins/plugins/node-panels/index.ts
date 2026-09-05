/**
 * nodePanels Cordis Service：节点属性面板注册表（真正的插件面板槽位）。
 *
 * 宿主按 type resolve 组件；未注册时由调用方回落 DefaultNodePanel。
 * 事件：`nodePanels/changed` 在注册/注销后触发。
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import { markRaw, type Component } from 'vue'
import { BUILTIN_NODE_PANELS } from './builtin'
import type { NodePanelEntry } from './types'

export class NodePanelsService extends Service {
  private panels = new Map<string, Component>()

  constructor(ctx: Context) {
    super(ctx, 'nodePanels')
    for (const [type, component] of BUILTIN_NODE_PANELS) {
      this.register(type, component)
    }
  }

  /**
   * 注册面板；同 type 覆盖。
   * @param type 节点类型
   * @param component Vue 面板组件
   */
  register(type: string, component: Component): void {
    this.panels.set(type, markRaw(component))
    this.notify()
  }

  /**
   * 注销面板。
   * @param type 节点类型
   */
  unregister(type: string): void {
    if (!this.panels.delete(type)) return
    this.notify()
  }

  /**
   * 解析面板组件；未注册返回 undefined（调用方兜底 Default）。
   * @param type 节点类型
   */
  resolve(type: string): Component | undefined {
    return this.panels.get(type)
  }

  /** 已注册 type 列表 */
  list(): NodePanelEntry[] {
    return [...this.panels.entries()].map(([type, component]) => ({ type, component }))
  }

  private notify(): void {
    this.ctx.emit('nodePanels/changed')
  }
}

export const nodePanelsPlugin = (ctx: Context): void => {
  new NodePanelsService(ctx)
}
