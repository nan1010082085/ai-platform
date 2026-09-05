/**
 * shellRoutes Cordis Service：功能模块贡献的路由表（boot 合并，非运行时乱 import）。
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import type { ShellRouteContribution } from './types'
import {
  chatModule,
  workflowModule,
  ragModule,
  pluginsCenterModule,
  settingsModule,
  opsModule,
} from '../../modules'

export class ShellRoutesService extends Service {
  private routes = new Map<string, ShellRouteContribution>()

  constructor(ctx: Context) {
    super(ctx, 'shellRoutes')
  }

  /**
   * 注册路由贡献；同 name 覆盖。
   * @param route 路由声明
   */
  register(route: ShellRouteContribution): void {
    this.routes.set(route.name, { ...route, order: route.order ?? 100 })
    this.notify()
  }

  /**
   * 注销路由贡献。
   * @param name 路由 name
   */
  unregister(name: string): void {
    if (!this.routes.delete(name)) return
    this.notify()
  }

  /** 全部贡献（order 升序） */
  list(): ShellRouteContribution[] {
    return [...this.routes.values()].sort(
      (a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name),
    )
  }

  private notify(): void {
    this.ctx.emit('shellRoutes/changed')
  }
}

/**
 * 装载 shellRoutes Service，并在同一 apply 内同步注册功能模块路由
 * （保证 ctx.shellRoutes 已注入后再 register）。
 */
export const shellRoutesPlugin = (ctx: Context): void => {
  new ShellRoutesService(ctx)
  chatModule(ctx)
  workflowModule(ctx)
  ragModule(ctx)
  pluginsCenterModule(ctx)
  settingsModule(ctx)
  opsModule(ctx)
}
