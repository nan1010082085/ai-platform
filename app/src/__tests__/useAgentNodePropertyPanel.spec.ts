import { describe, it, expect } from 'vitest'
import { useAgentNodePropertyPanel } from '@/composables/useAgentNodePropertyPanel'

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
