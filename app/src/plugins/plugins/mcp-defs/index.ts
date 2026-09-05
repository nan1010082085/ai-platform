/**
 * mcpDefs Cordis Service：MCP 服务器元数据注册表。
 * 不在浏览器建立 MCP 连接；仅供 PluginCenter / Runtime 展示。
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import type { McpServerDef } from './types'

export class McpDefsService extends Service {
  private base = new Map<string, McpServerDef>()
  private overlay = new Map<string, McpServerDef>()

  constructor(ctx: Context) {
    super(ctx, 'mcpDefs')
  }

  /** 覆盖 builtin 层（静态 pack） */
  setBase(defs: McpServerDef[]): void {
    this.base = new Map(defs.map((d) => [d.id, { ...d, source: d.source ?? 'builtin' }]))
    this.notify()
  }

  /** 整体替换 registry overlay */
  setOverlay(defs: McpServerDef[]): void {
    this.overlay = new Map(defs.map((d) => [d.id, { ...d, source: d.source ?? 'registry' }]))
    this.notify()
  }

  get(id: string): McpServerDef | undefined {
    return this.overlay.get(id) ?? this.base.get(id)
  }

  listBase(): McpServerDef[] {
    return [...this.base.values()]
  }

  listOverlay(): McpServerDef[] {
    return [...this.overlay.values()]
  }

  /** overlay ∪ base，同 id overlay 优先 */
  list(): McpServerDef[] {
    return [...new Map([...this.base, ...this.overlay]).values()]
  }

  private notify(): void {
    this.ctx.emit('mcpDefs/changed')
  }
}

export const mcpDefsPlugin = (ctx: Context): void => {
  new McpDefsService(ctx)
}
