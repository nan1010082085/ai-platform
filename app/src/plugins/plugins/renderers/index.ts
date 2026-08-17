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

export class RenderersService extends Service {
  /** 已注册渲染器列表（按 priority 升序） */
  private renderers: MessageRenderer[] = []

  /** 按 type 建立索引，用于快速注销 */
  private rendererIndex = new Map<string, MessageRenderer>()

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

  /** 按优先级查找第一个匹配 step 的渲染器；未匹配返回 null */
  getRenderer(step: StepData): MessageRenderer | null {
    for (const renderer of this.renderers) {
      if (renderer.matcher(step)) return renderer
    }
    return null
  }

  /** 全部已注册渲染器副本（按 priority 升序） */
  getAllRenderers(): MessageRenderer[] {
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
