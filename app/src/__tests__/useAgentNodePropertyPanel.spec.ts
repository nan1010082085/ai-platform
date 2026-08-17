import { describe, it, expect } from 'vitest'
import { useAgentNodePropertyPanel } from '@/composables/useAgentNodePropertyPanel'
import { AGENT_PALETTE_ITEMS, getPaletteItem } from '@/plugins'

describe('useAgentNodePropertyPanel', () => {
  const { getPanelComponent, getNodeTypeLabel } = useAgentNodePropertyPanel()

  it('returns labels for known node types', () => {
    expect(getNodeTypeLabel('llm')).toBe('LLM')
    expect(getNodeTypeLabel('manual-trigger')).toBe('手动触发')
  })

  it('returns panel components for node types', () => {
    expect(getPanelComponent('llm')).toBeTruthy()
    expect(getPanelComponent('tool')).toBeTruthy()
    expect(getPanelComponent('expert')).toBeTruthy()
    expect(getPanelComponent('agent-intent')).toBeTruthy()
    expect(getPanelComponent('unknown')).toBeTruthy()
  })

  it('returns labels for expert node types', () => {
    expect(getNodeTypeLabel('expert')).toBe('插件专家')
    expect(getNodeTypeLabel('agent-intent')).toBe('意图识别')
  })
})

describe('agentNodes palette + panel registration', () => {
  const { getPanelComponent } = useAgentNodePropertyPanel()

  const CASES: Array<{ type: string; label: string; category: string }> = [
    { type: 'code-execute', label: '代码执行', category: 'tools' },
    { type: 'variable-set', label: '变量赋值', category: 'tools' },
    { type: 'memory-recall', label: '长程记忆检索', category: 'logic' },
    { type: 'memory-write', label: '长程记忆写入', category: 'logic' },
    { type: 'memory-extract', label: '长程记忆提取', category: 'ai' },
    { type: 'handoff', label: '会话交接', category: 'logic' },
    { type: 'agent-team', label: 'Agent 团队', category: 'ai' },
  ]

  for (const c of CASES) {
    it(`${c.type} is defined in palette with label/category`, () => {
      const item = getPaletteItem(c.type as never)
      expect(item).toBeDefined()
      expect(item?.label).toBe(c.label)
      expect(item?.category).toBe(c.category)
    })

    it(`${c.type} has panel component registered`, () => {
      expect(getPanelComponent(c.type)).toBeTruthy()
    })
  }

  it('memory-* and handoff defaultData has required fields', () => {
    const recall = getPaletteItem('memory-recall' as never)
    expect(recall?.defaultData?.memoryRecallQuery).toBe('{{$input.message}}')
    expect(recall?.defaultData?.memoryRecallLimit).toBe(5)

    const write = getPaletteItem('memory-write' as never)
    expect(write?.defaultData?.memoryWriteNamespace).toBe('fact')
    expect(write?.defaultData?.memoryWriteImportance).toBe(0.5)

    const handoff = getPaletteItem('handoff' as never)
    expect(handoff?.defaultData?.handoffPassHistory).toBe(true)
    expect(handoff?.defaultData?.handoffInputTemplate).toBe('{{$input.message}}')
  })

  it('AGENT_PALETTE_ITEMS has no duplicate types', () => {
    const types = AGENT_PALETTE_ITEMS.map((i) => i.type)
    expect(new Set(types).size).toBe(types.length)
  })
})
