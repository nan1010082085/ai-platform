/**
 * shellNav Cordis Service：顶导 / 设置导航贡献表。
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import { BUILTIN_SHELL_NAV } from './builtin'
import type { ShellNavGroup, ShellNavItem } from './types'

export class ShellNavService extends Service {
  private items = new Map<string, ShellNavItem>()

  constructor(ctx: Context) {
    super(ctx, 'shellNav')
    for (const item of BUILTIN_SHELL_NAV) this.register(item)
  }

  /**
   * 注册导航项；同 id 覆盖。
   * @param item 导航贡献
   */
  register(item: ShellNavItem): void {
    this.items.set(item.id, { ...item })
    this.notify()
  }

  /**
   * 注销导航项。
   * @param id 贡献 id
   */
  unregister(id: string): void {
    if (!this.items.delete(id)) return
    this.notify()
  }

  /**
   * 按 group 列出（order 升序）；不传 group 则全部。
   * @param group 主导航或设置
   */
  list(group?: ShellNavGroup): ShellNavItem[] {
    const all = [...this.items.values()]
    const filtered = group ? all.filter((i) => i.group === group) : all
    return filtered.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  }

  private notify(): void {
    this.ctx.emit('shellNav/changed')
  }
}

export const shellNavPlugin = (ctx: Context): void => {
  new ShellNavService(ctx)
}
