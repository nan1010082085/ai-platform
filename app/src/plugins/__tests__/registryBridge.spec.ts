/**
 * registry-bridge：snapshot ingest → Cordis overlay 唯一入口。
 */

import { describe, it, expect, afterEach } from 'vitest'
import {
  ensurePluginHost,
  stopPluginHost,
  getPluginHost,
} from '@/plugins'
import type { PluginRegistrySnapshot } from '@/api/pluginApi'

function makeSnapshot(partial?: Partial<PluginRegistrySnapshot>): PluginRegistrySnapshot {
  return {
    experts: [
      {
        id: 'exp.demo',
        label: '演示专家',
        tools: [],
        skills: [],
        runtime: ['workflow'],
      },
    ],
    skills: [
      {
        id: 'demo-skill',
        label: '演示技能',
        tools: ['demo__tool'],
      },
    ],
    tools: [
      {
        name: 'demo__tool',
        kind: 'builtin',
        source: 'test',
        label: '演示工具',
        argsHint: '{}',
      },
    ],
    mcpServers: [
      {
        id: 'demo.mcp',
        transport: 'sse',
        namespace: 'demo__',
      },
    ],
    ...partial,
  }
}

describe('registryBridge', () => {
  afterEach(async () => {
    await stopPluginHost()
  })

  it('ingest 后 chatTools / nodeTypes / skillDefs / mcpDefs 有 overlay 数据', async () => {
    const host = await ensurePluginHost()
    host.registryBridge.ingest(makeSnapshot())

    expect(host.chatTools.listOverlay().some((t) => t.name === 'demo__tool')).toBe(true)
    expect(host.skillDefs.get('demo-skill')?.description).toBe('演示技能')
    expect(host.mcpDefs.get('demo.mcp')?.namespace).toBe('demo__')

    const dynamic = host.nodeTypes.listDynamic()
    expect(dynamic.some((i) => i.type === 'tool' && i.defaultData?.toolName === 'demo__tool')).toBe(
      true,
    )
    expect(dynamic.some((i) => i.type === 'expert' && i.defaultData?.expertId === 'exp.demo')).toBe(
      true,
    )
  })

  it('二次 ingest 整体替换 overlay', async () => {
    const host = await ensurePluginHost()
    host.registryBridge.ingest(makeSnapshot())
    host.registryBridge.ingest(
      makeSnapshot({
        tools: [
          {
            name: 'other__tool',
            kind: 'builtin',
            source: 'test',
            label: '另一工具',
            argsHint: '{}',
          },
        ],
        skills: [{ id: 'other-skill', label: '另一技能', tools: [] }],
        mcpServers: [{ id: 'other.mcp', transport: 'stdio' }],
        experts: [],
      }),
    )

    expect(host.chatTools.listOverlay().map((t) => t.name)).toEqual(['other__tool'])
    expect(host.skillDefs.listOverlay().map((s) => s.name)).toEqual(['other-skill'])
    expect(host.mcpDefs.listOverlay().map((m) => m.id)).toEqual(['other.mcp'])
    expect(host.chatTools.listOverlay().some((t) => t.name === 'demo__tool')).toBe(false)
  })

  it('getSnapshot 返回最近 ingest 副本', async () => {
    const host = await ensurePluginHost()
    expect(host.registryBridge.getSnapshot()).toBeNull()
    const snap = makeSnapshot()
    host.registryBridge.ingest(snap)
    const got = host.registryBridge.getSnapshot()
    expect(got?.tools[0]?.name).toBe('demo__tool')
    got!.tools.push({
      name: 'mutated',
      kind: 'builtin',
      source: 'x',
      label: 'x',
      argsHint: '{}',
    })
    expect(host.registryBridge.getSnapshot()?.tools.some((t) => t.name === 'mutated')).toBe(false)
  })

  it('example.support pack 写入 builtin，不被空 overlay 抹掉', async () => {
    const host = await ensurePluginHost()
    expect(host.chatTools.listBase().some((t) => t.name === 'kb__search')).toBe(true)
    expect(host.skillDefs.listBase().some((s) => s.name === 'example.support-tone')).toBe(true)
    expect(host.mcpDefs.listBase().some((m) => m.id === 'example.external-kb')).toBe(true)

    host.registryBridge.ingest(makeSnapshot({ tools: [], skills: [], mcpServers: [], experts: [] }))
    expect(host.chatTools.get('kb__search')).toBeTruthy()
    expect(host.skillDefs.get('example.support-tone')).toBeTruthy()
    expect(host.mcpDefs.get('example.external-kb')).toBeTruthy()
  })
})
