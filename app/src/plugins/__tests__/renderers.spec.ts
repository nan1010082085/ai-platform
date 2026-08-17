/**
 * renderers 服务（M2）：预设装载、priority 匹配、注册/注销语义。
 */

import { describe, it, expect, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { startPluginHost, stopPluginHost, type MessageRenderer } from '@/plugins'
import type { StepData } from '@/types'

function textStep(overrides: Partial<StepData> = {}): StepData {
  return { type: 'text', content: 'hello', ...overrides } as StepData
}

describe('renderers service', () => {
  afterEach(async () => {
    await stopPluginHost()
  })

  it('宿主启动后预设渲染器装载（22 个），priority 升序', async () => {
    const host = await startPluginHost()
    const all = host.renderers.getAllRenderers()
    expect(all).toHaveLength(22)
    for (let i = 1; i < all.length; i += 1) {
      expect(all[i].priority).toBeGreaterThanOrEqual(all[i - 1].priority)
    }
  })

  it('按 priority 匹配第一个命中渲染器', async () => {
    const host = await startPluginHost()
    // text 步骤：image_inline(18) 只匹配图片 markdown，普通文本命中 text(100)
    expect(host.renderers.getRenderer(textStep())?.type).toBe('text')
    // 图片 markdown 命中 image_inline
    expect(host.renderers.getRenderer(textStep({ content: '![a](https://x/y.png)' }))?.type).toBe('image_inline')
    // 无匹配兜底：text 渲染器 matcher 恒真
    const any = textStep({ type: 'unknown_step' as never })
    expect(host.renderers.getRenderer(any)?.type).toBe('text')
  })

  it('register 同 type 覆盖旧条目并保持有序；unregister 后回落预设', async () => {
    const host = await startPluginHost()
    const custom: MessageRenderer = {
      type: 'text',
      component: defineComponent({ render: () => h('span', 'CUSTOM') }),
      matcher: () => true,
      priority: 5,
    }
    host.renderers.register(custom)
    expect(host.renderers.getRenderer(textStep())?.type).toBe('text')
    expect(host.renderers.getAllRenderers()[0]).toBe(custom)

    host.renderers.unregister('text')
    expect(host.renderers.getAllRenderers().some((r) => r.type === 'text')).toBe(false)
  })

  it('变更触发 renderers/changed', async () => {
    const host = await startPluginHost()
    let fired = 0
    const off = host.on('renderers/changed', () => {
      fired += 1
    })
    host.renderers.register({
      type: 'custom_x',
      component: defineComponent({ render: () => h('span') }),
      matcher: () => false,
      priority: 1,
    })
    host.renderers.unregister('custom_x')
    expect(fired).toBe(2)
    off()
    expect(fired).toBe(2)
  })
})
