/**
 * chatTools Cordis Service：工具注册表（运行时唯一事实源）。
 *
 * 分层模型（优先级从低到高）：
 * - base：内置层（builtin bundle，随代码打包，不可关闭）
 * - overlay：动态层（服务端 registry 快照，已含租户 overlay + 服务端本地层合并）
 * - patch：前端本地覆盖层（开发注入 / 测试 / 未来 UI 本地开关）
 * 同名时 patch > overlay > base。
 *
 * 事件：`chatTools/changed` 在任一层变更后触发，Vue 侧经 serviceState 桥接为响应式。
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import { normalizeToolName } from '@schema-platform/platform-shared/ai/toolNames'
import {
  TOOL_CATEGORY_LABELS,
  TOOL_CATEGORY_ORDER,
  type ToolCategory,
  type ToolDef,
  type ToolGroup,
} from './types'

const DISABLED_STORAGE_KEY = 'sfp_chatTools_disabled'

function loadDisabledSet(): Set<string> {
  try {
    const raw = localStorage.getItem(DISABLED_STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch { return new Set() }
}

function saveDisabledSet(set: Set<string>): void {
  try { localStorage.setItem(DISABLED_STORAGE_KEY, JSON.stringify([...set])) } catch { /* quota */ }
}

export class ChatToolsService extends Service {
  private base = new Map<string, ToolDef>()
  private overlay = new Map<string, ToolDef>()
  private patch = new Map<string, ToolDef>()
  /** 前端禁用集（持久化到 localStorage，仅影响 list/getByCategory 输出，不删除数据） */
  private disabled = loadDisabledSet()

  constructor(ctx: Context) {
    super(ctx, 'chatTools')
  }

  /** 覆盖内置层（仅插件装载时使用） */
  setBase(defs: ToolDef[]): void {
    this.base = new Map(defs.map((def) => [def.name, def]))
    this.notify()
  }

  /** 整体替换动态层（registry 快照刷新语义） */
  setOverlay(defs: ToolDef[]): void {
    this.overlay = new Map(defs.map((def) => [def.name, def]))
    this.notify()
  }

  /** 单条注册到动态层 */
  register(def: ToolDef): void {
    this.overlay.set(def.name, def)
    this.notify()
  }

  /** 整体替换前端本地覆盖层（最高优先级） */
  setPatch(defs: ToolDef[]): void {
    this.patch = new Map(defs.map((def) => [def.name, def]))
    this.notify()
  }

  /** 按名称查找（patch > overlay > base，兼容 normalizeToolName 归一化） */
  get(name: string): ToolDef | undefined {
    return this.find(this.patch, name) ?? this.find(this.overlay, name) ?? this.find(this.base, name)
  }

  resolveCategory(name: string): ToolCategory | undefined {
    return this.get(name)?.category
  }

  /** 启用工具（从 disabled 集移除） */
  enable(name: string): void {
    const normalized = normalizeToolName(name)
    this.disabled.delete(normalized)
    saveDisabledSet(this.disabled)
    this.notify()
  }

  /** 禁用工具（加入 disabled 集，不删除数据） */
  disable(name: string): void {
    const normalized = normalizeToolName(name)
    this.disabled.add(normalized)
    saveDisabledSet(this.disabled)
    this.notify()
  }

  /** 查询工具是否被禁用 */
  isDisabled(name: string): boolean {
    return this.disabled.has(normalizeToolName(name))
  }

  /** 所有被禁用的工具名 */
  listDisabled(): string[] {
    return [...this.disabled]
  }

  /** 批量设置启用/禁用（UI toggle 批量操作） */
  setEnabled(name: string, enabled: boolean): void {
    if (enabled) this.enable(name)
    else this.disable(name)
  }

  /** 内置层清单 */
  listBase(): ToolDef[] {
    return [...this.base.values()]
  }

  /** 动态层清单（palette 数据源：registry 已加载的工具） */
  listOverlay(): ToolDef[] {
    return [...this.overlay.values()]
  }

  /** 前端本地覆盖层清单 */
  listPatch(): ToolDef[] {
    return [...this.patch.values()]
  }

  /** 全量清单（patch ∪ overlay ∪ base，同名高层优先），过滤已禁用 */
  list(): ToolDef[] {
    const merged = new Map([...this.base, ...this.overlay, ...this.patch])
    return [...merged.values()].filter((t) => !this.disabled.has(t.name))
  }

  /** 全量清单（含已禁用，供 UI 展示启停状态） */
  listAll(): ToolDef[] {
    const merged = new Map([...this.base, ...this.overlay, ...this.patch])
    return [...merged.values()]
  }

  getByCategory(category: ToolCategory, layer: 'all' | 'overlay' = 'all'): ToolDef[] {
    return (layer === 'all' ? this.list() : this.listOverlay())
      .filter((tool) => tool.category === category)
  }

  groupedByCategory(layer: 'all' | 'overlay' = 'all'): ToolGroup[] {
    const tools = layer === 'all' ? this.list() : this.listOverlay()
    return TOOL_CATEGORY_ORDER
      .map((category) => ({
        category,
        label: TOOL_CATEGORY_LABELS[category],
        tools: tools.filter((tool) => tool.category === category),
      }))
      .filter((group) => group.tools.length > 0)
  }

  private find(map: Map<string, ToolDef>, name: string): ToolDef | undefined {
    const normalized = normalizeToolName(name)
    for (const def of map.values()) {
      if (def.name === normalized || def.name === name) return def
    }
    return undefined
  }

  private notify(): void {
    this.ctx.emit('chatTools/changed')
  }
}

export interface ChatToolsConfig {
  /** 内置层工具清单（来自配置分层合并结果） */
  tools?: ToolDef[]
}

export const chatToolsPlugin = (ctx: Context, config?: ChatToolsConfig): void => {
  const service = new ChatToolsService(ctx)
  if (config?.tools?.length) service.setBase(config.tools)
}
