/**
 * shellNav / shellRoutes 服务与路由工厂。
 */

import { describe, it, expect, afterEach } from 'vitest'
import { startPluginHost, stopPluginHost } from '@/plugins'
import { buildRoutesFromContributions } from '@/router'

describe('shellNav service', () => {
  afterEach(async () => {
    await stopPluginHost()
  })

  it('内置主导航仅 chat + workflows；设置项含 rag', async () => {
    const host = await startPluginHost()
    const primary = host.shellNav.list('primary')
    expect(primary.map((i) => i.id)).toEqual(['chat', 'workflows'])
    const settings = host.shellNav.list('settings')
    expect(settings.some((i) => i.id === 'rag')).toBe(true)
  })
})

describe('shellRoutes + factory', () => {
  afterEach(async () => {
    await stopPluginHost()
  })

  it('模块贡献后 list 含 chat 与 designer；工厂产出 layout children', async () => {
    const host = await startPluginHost()
    const names = host.shellRoutes.list().map((r) => r.name)
    expect(names).toContain('chat')
    expect(names).toContain('agent-workflow-designer')
    expect(names).toContain('shared-conversation')

    const routes = buildRoutesFromContributions(host.shellRoutes.list())
    const layout = routes.find((r) => r.path === '/' && Array.isArray(r.children))
    expect(layout?.children?.some((c) => c.name === 'chat')).toBe(true)
    expect(routes.some((r) => r.name === 'agent-workflow-designer')).toBe(true)
    expect(routes.some((r) => r.name === 'login')).toBe(true)
  })
})
