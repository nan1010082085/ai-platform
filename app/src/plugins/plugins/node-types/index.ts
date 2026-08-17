/**
 * nodeTypes Cordis Service：workflow 节点类型注册表（palette 扩展点）。
 *
 * - 静态层：内置节点目录（plugins/config/nodeTypes.ts，原 constants/agentNodes）
 * - 动态层：运行时注册（registry 专家/工具条目；M6 的"自主智能体节点"等插件贡献）
 * 同 type 允许多条目（expert/tool 泛型类型各自承载具体 id）。
 *
 * 事件：`nodeTypes/changed` 在动态层变更后触发。
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import {
  AGENT_PALETTE_ITEMS,
  getPaletteItem as getBuiltInPaletteItem,
  type AgentPaletteItem,
} from '../../config/nodeTypes'
import type { AgentNodeType } from '@/types/agentWorkflow'

export class NodeTypesService extends Service {
  private dynamic: AgentPaletteItem[] = []

  constructor(ctx: Context) {
    super(ctx, 'nodeTypes')
  }

  /** 追加注册（插件贡献新节点类型） */
  register(item: AgentPaletteItem): void {
    this.dynamic.push(item)
    this.notify()
  }

  /** 整体替换动态层（registry 快照刷新语义） */
  setDynamic(items: AgentPaletteItem[]): void {
    this.dynamic = [...items]
    this.notify()
  }

  /** 动态层清单（registry 专家/工具条目） */
  listDynamic(): AgentPaletteItem[] {
    return [...this.dynamic]
  }

  /** 按类型查找：动态层优先，回落内置目录（含 expert/tool 兜底） */
  get(type: AgentNodeType): AgentPaletteItem | undefined {
    return this.dynamic.find((item) => item.type === type) ?? getBuiltInPaletteItem(type)
  }

  /** 全量 palette = 内置目录 + 动态层 */
  list(): AgentPaletteItem[] {
    return [...AGENT_PALETTE_ITEMS, ...this.dynamic]
  }

  private notify(): void {
    this.ctx.emit('nodeTypes/changed')
  }
}

export const nodeTypesPlugin = (ctx: Context): void => {
  new NodeTypesService(ctx)
}
