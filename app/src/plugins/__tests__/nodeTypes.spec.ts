/**
 * nodeTypes 服务（M2）：内置目录 + 动态注册层 + palette 扩展点语义。
 */

import { describe, it, expect, afterEach } from 'vitest'
import {
  startPluginHost,
  stopPluginHost,
  getPaletteItem,
  AGENT_PALETTE_ITEMS,
  AGENT_NODE_COLORS,
  type AgentPaletteItem,
} from '@/plugins'

function makeItem(type: AgentPaletteItem['type'], overrides: Partial<AgentPaletteItem> = {}): AgentPaletteItem {
  return {
    type,
    label: `动态${type}`,
    icon: 'cpu',
    category: 'ai',
    description: '动态注册节点',
    defaultData: { label: `动态${type}` },
    ...overrides,
  }
}

describe('nodeTypes service', () => {
  afterEach(async () => {
    await stopPluginHost()
  })

  it('内置含合流；tools 分类无预填 toolName 的平铺项', async () => {
    const host = await startPluginHost()
    expect(host.nodeTypes.get('merge')?.label).toBe('合流')
    const toolsWithName = host.nodeTypes
      .list()
      .filter((i) => i.category === 'tools' && Boolean(i.defaultData.toolName))
    expect(toolsWithName).toHaveLength(0)
  })

  it('静态兜底：expert/tool 泛型类型返回占位条目', () => {
    expect(getPaletteItem('expert')?.category).toBe('experts')
    expect(getPaletteItem('tool')?.category).toBe('tools')
    expect(getPaletteItem('nonexistent-type' as never)).toBeUndefined()
  })

  it('动态层：register 追加、setDynamic 替换、get 动态优先', async () => {
    const host = await startPluginHost()
    host.nodeTypes.register(makeItem('agent-team', { label: '团队v2' }))
    expect(host.nodeTypes.get('agent-team')?.label).toBe('团队v2')
    expect(host.nodeTypes.listDynamic()).toHaveLength(1)

    host.nodeTypes.setDynamic([makeItem('llm', { label: 'LLM 覆盖' })])
    expect(host.nodeTypes.get('llm')?.label).toBe('LLM 覆盖')
    expect(host.nodeTypes.listDynamic()).toHaveLength(1)
    expect(host.nodeTypes.get('agent-team')?.label).toBe('智能团队') // 已回落内置
  })

  it('同 type 多条目共存（registry 专家/工具泛型类型）', async () => {
    const host = await startPluginHost()
    host.nodeTypes.setDynamic([
      makeItem('expert', { label: '专家A', defaultData: { label: '专家A', expertId: 'a' } }),
      makeItem('expert', { label: '专家B', defaultData: { label: '专家B', expertId: 'b' } }),
    ])
    expect(host.nodeTypes.listDynamic()).toHaveLength(2)
    // get 返回首个动态匹配
    expect(host.nodeTypes.get('expert')?.label).toBe('专家A')
  })

  it('变更触发 nodeTypes/changed', async () => {
    const host = await startPluginHost()
    let fired = 0
    const off = host.on('nodeTypes/changed', () => {
      fired += 1
    })
    host.nodeTypes.register(makeItem('llm'))
    host.nodeTypes.setDynamic([])
    expect(fired).toBe(2)
    off()
    host.nodeTypes.register(makeItem('if'))
    expect(fired).toBe(2)
  })
})
