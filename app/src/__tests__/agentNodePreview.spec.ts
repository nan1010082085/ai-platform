import { describe, it, expect } from 'vitest'
import {
  getAgentNodePreviewSections,
  formatPreviewValue,
  truncateText,
  hasMeaningfulPreviewValue,
} from '@/utils/agentNodePreview'

describe('agentNodePreview', () => {
  it('builds llm config rows without static input/output placeholders', () => {
    const sections = getAgentNodePreviewSections('llm', {
      label: 'LLM',
      model: 'deepseek',
      prompt: '{{$input.message}}',
      systemPrompt: '你是助手',
    })

    expect(sections.config.find((r) => r.key === 'model')?.value).toBe('deepseek')
    expect(sections.config.find((r) => r.key === 'prompt')?.value).toContain('$input.message')
    expect(sections.config.find((r) => r.key === 'system')?.value).toBe('你是助手')
    expect(sections.config.find((r) => r.key === 'call')?.value).toBe('LLM 推理')
    expect(sections.config.some((r) => r.label === '输入')).toBe(false)
    expect(sections.runtime).toHaveLength(0)
  })

  it('builds runtime rows from execution record with data only', () => {
    const sections = getAgentNodePreviewSections(
      'llm',
      { label: 'LLM', prompt: 'hello' },
      {
        nodeId: 'llm-1',
        nodeType: 'llm',
        nodeName: 'LLM',
        status: 'success',
        durationMs: 850,
        input: { lastOutput: { message: 'hi' }, input: { message: 'hi' } },
        output: { text: 'world' },
      },
    )

    expect(sections.runtime.find((r) => r.key === 'status')?.value).toBe('成功')
    expect(sections.runtime.find((r) => r.key === 'rt-output')?.value).toBe('world')
    expect(sections.runtime.find((r) => r.key === 'rt-input')?.value).toBe('hi')
    expect(sections.runtime.find((r) => r.key === 'duration')?.value).toBe('850ms')
  })

  it('omits runtime input/output when execution has no payload', () => {
    const sections = getAgentNodePreviewSections(
      'agent',
      { label: 'Agent', agentType: 'general' },
      {
        nodeId: 'agent-1',
        nodeType: 'agent',
        nodeName: 'Agent',
        status: 'pending',
      },
    )

    expect(sections.runtime.find((r) => r.key === 'status')?.value).toBe('等待')
    expect(sections.runtime.find((r) => r.key === 'rt-input')).toBeUndefined()
    expect(sections.runtime.find((r) => r.key === 'rt-output')).toBeUndefined()
  })

  it('truncates long preview text', () => {
    const long = 'a'.repeat(100)
    expect(truncateText(long, 20).endsWith('…')).toBe(true)
    expect(formatPreviewValue({ foo: long }).length).toBeLessThanOrEqual(72)
  })

  it('detects empty preview values', () => {
    expect(hasMeaningfulPreviewValue('—')).toBe(false)
    expect(hasMeaningfulPreviewValue('hello')).toBe(true)
  })
})
