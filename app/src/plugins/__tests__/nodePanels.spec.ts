/**
 * nodePanels 服务：内置装载、register/resolve/unregister。
 */

import { describe, it, expect, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { startPluginHost, stopPluginHost } from '@/plugins'

describe('nodePanels service', () => {
  afterEach(async () => {
    await stopPluginHost()
  })

  it('宿主启动后内置面板已装载，llm 可 resolve', async () => {
    const host = await startPluginHost()
    expect(host.nodePanels.resolve('llm')).toBeTruthy()
    expect(host.nodePanels.list().length).toBeGreaterThan(30)
  })

  it('register 后 resolve 得到组件；unregister 后为 undefined', async () => {
    const host = await startPluginHost()
    const Comp = defineComponent({ name: 'ProbePanel', render: () => h('div') })
    host.nodePanels.register('probe-type', Comp)
    expect(host.nodePanels.resolve('probe-type')).toBe(Comp)
    host.nodePanels.unregister('probe-type')
    expect(host.nodePanels.resolve('probe-type')).toBeUndefined()
  })
})
