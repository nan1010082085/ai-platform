/**
 * M0-T1 验收：Cordis 插件宿主在浏览器（jsdom）内的生命周期与 chatTools 服务行为。
 */

import { describe, it, expect, afterEach } from 'vitest'
import {
  startPluginHost,
  ensurePluginHost,
  stopPluginHost,
  getPluginHost,
  isPluginHostStarted,
  serviceState,
  BUILT_IN_TOOLS,
  BUILT_IN_TOOL_NAMES,
  getBuiltInTool,
  resolveToolCategory,
  mergeLayers,
  builtinLayers,
  type ToolDef,
} from '@/plugins'
import { SCHEMA_SEARCH } from '@schema-platform/platform-shared/ai/toolNames'

function makeTool(name: string, category: ToolDef['category'] = 'langgraph'): ToolDef {
  return {
    name,
    label: name,
    description: `${name} 测试工具`,
    argsHint: '{}',
    category,
    source: 'registry',
  }
}

describe('plugin host lifecycle', () => {
  afterEach(async () => {
    await stopPluginHost()
  })

  it('ensurePluginHost 幂等，宿主可重复获取', async () => {
    const first = await ensurePluginHost()
    const second = await ensurePluginHost()
    expect(second).toBe(first)
    expect(isPluginHostStarted()).toBe(true)
    expect(getPluginHost()).toBe(first)
  })

  it('宿主启动后 chatTools 服务可用且载入内置层', async () => {
    const host = await startPluginHost()
    expect(host.chatTools).toBeTruthy()
    expect(BUILT_IN_TOOL_NAMES.length).toBeGreaterThan(0)
    for (const name of BUILT_IN_TOOL_NAMES) {
      expect(host.chatTools.get(name)).toBeDefined()
    }
    // list() = overlay ∪ base；base 含 BUILT_IN + 官方 pack（如 kb__search）
    expect(host.chatTools.listBase().length).toBeGreaterThanOrEqual(BUILT_IN_TOOLS.length)
    expect(host.chatTools.list()).toHaveLength(host.chatTools.listBase().length)
  })

  it('stopPluginHost 释放宿主，getPluginHost 显式报错', async () => {
    await startPluginHost()
    await stopPluginHost()
    expect(isPluginHostStarted()).toBe(false)
    expect(() => getPluginHost()).toThrow(/宿主未启动/)
    // 停止后可重新启动
    const host = await startPluginHost()
    expect(host.chatTools.get(BUILT_IN_TOOL_NAMES[0])).toBeDefined()
  })
})

describe('chatTools service layers', () => {
  afterEach(async () => {
    await stopPluginHost()
  })

  it('overlay 覆盖同名 base，setOverlay 整体替换动态层', async () => {
    const host = await startPluginHost()
    const builtinName = BUILT_IN_TOOL_NAMES[0]
    const builtin = host.chatTools.get(builtinName)!

    host.chatTools.setOverlay([{ ...builtin, label: '覆盖后的标签' }])
    expect(host.chatTools.get(builtinName)?.label).toBe('覆盖后的标签')
    // overlay 不含的工具仍回退 base
    expect(host.chatTools.get(BUILT_IN_TOOL_NAMES[1])).toBeDefined()

    host.chatTools.setOverlay([makeTool('overlay_only_tool')])
    expect(host.chatTools.get(builtinName)?.label).toBe(builtin.label)
    expect(host.chatTools.get('overlay_only_tool')).toBeDefined()
    // 动态层只含 overlay，内置层不被清空
    expect(host.chatTools.listOverlay()).toHaveLength(1)
    expect(host.chatTools.list()).toHaveLength(host.chatTools.listBase().length + 1)
  })

  it('patch 层优先级最高（patch > overlay > base），setPatch 整体替换', async () => {
    const host = await startPluginHost()
    const builtinName = BUILT_IN_TOOL_NAMES[0]
    const baseDef = host.chatTools.get(builtinName)!

    host.chatTools.setOverlay([{ ...baseDef, label: 'overlay 标签', source: 'registry' }])
    host.chatTools.setPatch([{ ...baseDef, label: 'patch 标签', source: 'patch' }])
    expect(host.chatTools.get(builtinName)?.label).toBe('patch 标签')
    expect(host.chatTools.get(builtinName)?.source).toBe('patch')

    host.chatTools.setPatch([makeTool('patch_only_tool')])
    expect(host.chatTools.get(builtinName)?.label).toBe('overlay 标签') // patch 清空后回落 overlay
    expect(host.chatTools.get('patch_only_tool')).toBeDefined()
    // 全量 = base ∪ overlay ∪ patch，同名高层优先
    expect(host.chatTools.list()).toHaveLength(host.chatTools.listBase().length + 1)
    expect(host.chatTools.listPatch()).toHaveLength(1)
  })

  it('mergeLayers 同名 last-wins，空 override 返回 base', () => {
    const base = builtinLayers()
    expect(mergeLayers(base)).toBe(base)

    const name = BUILT_IN_TOOL_NAMES[0]
    const merged = mergeLayers(base, {
      chatTools: { tools: [{ ...getBuiltInTool(name)!, label: 'patched' }] },
    })
    expect(merged.chatTools.tools.find((t) => t.name === name)?.label).toBe('patched')
    expect(merged.chatTools.tools).toHaveLength(base.chatTools.tools.length)
  })

  it('分类分组与查找保持迁移前语义', () => {
    expect(resolveToolCategory('http_request')).toBe('workflow')
    const schemaTool = getBuiltInTool(SCHEMA_SEARCH)
    expect(schemaTool?.category).toBe('mcp-schema')
  })
})

describe('chatTools changed event & vue bridge', () => {
  afterEach(async () => {
    await stopPluginHost()
  })

  it('变更触发 chatTools/changed，serviceState 响应式更新，退订后不再触发', async () => {
    const host = await startPluginHost()
    let fired = 0
    const off = host.on('chatTools/changed', () => {
      fired += 1
    })
    const count = serviceState(host, 'chatTools/changed', () => host.chatTools.listOverlay().length)

    expect(count.value).toBe(0)
    host.chatTools.register(makeTool('bridge_tool_1'))
    expect(fired).toBe(1)
    expect(count.value).toBe(1)

    host.chatTools.setOverlay([makeTool('bridge_tool_2')])
    expect(fired).toBe(2)
    expect(count.value).toBe(1) // setOverlay 替换后仍为 1 条

    off()
    host.chatTools.register(makeTool('bridge_tool_3'))
    expect(fired).toBe(2) // 手动监听已退订，不再计数
    expect(count.value).toBe(2) // serviceState 自有订阅仍在，快照继续刷新
  })
})
