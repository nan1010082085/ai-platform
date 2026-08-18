/**
 * renderers Cordis Service：消息渲染器注册表（渲染扩展点）。
 *
 * 语义与迁移前的 RendererRegistry 完全一致：
 * 按 priority 升序匹配，第一个 matcher 命中的渲染器胜出；
 * 同 type 注册先移除旧条目再插入；预设渲染器在宿主启动时装载。
 *
 * 事件：`renderers/changed` 在注册/注销后触发。
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import { presetRenderers } from '../../config/renderers'
import type { MessageRenderer } from './types'
import type { StepData } from '@/types'

const RENDERER_DISABLED_KEY = 'sfp_renderers_disabled'

function loadRendererDisabled(): Set<string> {
  try {
    const raw = localStorage.getItem(RENDERER_DISABLED_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch { return new Set() }
}

function saveRendererDisabled(set: Set<string>): void {
  try { localStorage.setItem(RENDERER_DISABLED_KEY, JSON.stringify([...set])) } catch { /* quota */ }
}

export class RenderersService extends Service {
  /** 已注册渲染器列表（按 priority 升序） */
  private renderers: MessageRenderer[] = []

  /** 按 type 建立索引，用于快速注销 */
  private rendererIndex = new Map<string, MessageRenderer>()

  /** 前端禁用集（持久化到 localStorage） */
  private disabled = loadRendererDisabled()

  constructor(ctx: Context) {
    super(ctx, 'renderers')
    for (const renderer of presetRenderers) this.register(renderer)
  }

  /** 注册渲染器；同 type 先移除旧条目（保持 priority 有序） */
  register(renderer: MessageRenderer): void {
    this.removeByType(renderer.type)
    this.rendererIndex.set(renderer.type, renderer)
    const idx = this.renderers.findIndex((r) => r.priority > renderer.priority)
    if (idx === -1) {
      this.renderers.push(renderer)
    } else {
      this.renderers.splice(idx, 0, renderer)
    }
    this.notify()
  }

  /** 按 type 注销渲染器 */
  unregister(type: string): void {
    const removed = this.removeByType(type)
    if (removed) this.notify()
  }

  /** 启用渲染器 */
  enable(type: string): void {
    this.disabled.delete(type)
    saveRendererDisabled(this.disabled)
    this.notify()
  }

  /** 禁用渲染器 */
  disable(type: string): void {
    this.disabled.add(type)
    saveRendererDisabled(this.disabled)
    this.notify()
  }

  /** 查询是否禁用 */
  isDisabled(type: string): boolean {
    return this.disabled.has(type)
  }

  /** 设置启用/禁用 */
  setEnabled(type: string, enabled: boolean): void {
    if (enabled) this.enable(type)
    else this.disable(type)
  }

  /** 按优先级查找第一个匹配 step 的渲染器；跳过已禁用 */
  getRenderer(step: StepData): MessageRenderer | null {
    for (const renderer of this.renderers) {
      if (this.disabled.has(renderer.type)) continue
      if (renderer.matcher(step)) return renderer
    }
    return null
  }

  /** 全部已注册渲染器副本（按 priority 升序，过滤已禁用） */
  getAllRenderers(): MessageRenderer[] {
    return this.renderers.filter((r) => !this.disabled.has(r.type))
  }

  /** 全部已注册渲染器副本（含已禁用，供 UI 展示启停状态） */
  getAllRenderersAll(): MessageRenderer[] {
    return [...this.renderers]
  }

  private removeByType(type: string): MessageRenderer | undefined {
    const existing = this.rendererIndex.get(type)
    if (!existing) return undefined
    const idx = this.renderers.indexOf(existing)
    if (idx !== -1) this.renderers.splice(idx, 1)
    this.rendererIndex.delete(type)
    return existing
  }

  private notify(): void {
    this.ctx.emit('renderers/changed')
  }
}

export const renderersPlugin = (ctx: Context): void => {
  new RenderersService(ctx)
}
