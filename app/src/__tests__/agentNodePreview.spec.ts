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
      'expert',
      { label: '专家', expertId: 'platform.general' },
      {
        nodeId: 'expert-1',
        nodeType: 'expert',
        nodeName: '专家',
        status: 'pending',
      },
    )

    expect(sections.runtime.find((r) => r.key === 'status')?.value).toBe('等待')
    expect(sections.runtime.find((r) => r.key === 'rt-input')).toBeUndefined()
    expect(sections.runtime.find((r) => r.key === 'rt-output')).toBeUndefined()
  })

  it('builds memory-recall config rows', () => {
    const sections = getAgentNodePreviewSections('memory-recall', {
      label: '长程记忆检索',
      memoryRecallQuery: '{{$input.message}}',
      memoryRecallLimit: 5,
      memoryRecallNamespace: 'all',
    })
    expect(sections.config.find((r) => r.key === 'call')?.value).toBe('长程记忆检索')
    expect(sections.config.find((r) => r.key === 'limit')?.value).toBe('5 条')
    expect(sections.config.find((r) => r.key === 'ns')?.value).toBe('all')
  })

  it('builds memory-write config rows', () => {
    const sections = getAgentNodePreviewSections('memory-write', {
      label: '长程记忆写入',
      memoryWriteContent: '用户偏好简洁',
      memoryWriteNamespace: 'preference',
      memoryWriteImportance: 0.8,
    })
    expect(sections.config.find((r) => r.key === 'call')?.value).toBe('长程记忆写入')
    expect(sections.config.find((r) => r.key === 'ns')?.value).toBe('preference')
    expect(sections.config.find((r) => r.key === 'imp')?.value).toBe('0.8')
  })

  it('builds memory-extract config rows', () => {
    const sections = getAgentNodePreviewSections('memory-extract', {
      label: '长程记忆提取',
      memoryExtractSource: 'lastOutput',
      memoryExtractNamespace: 'fact',
    })
    expect(sections.config.find((r) => r.key === 'call')?.value).toBe('长程记忆提取')
    expect(sections.config.find((r) => r.key === 'source')?.value).toBe('lastOutput')
  })

  it('builds handoff config rows with target', () => {
    const sections = getAgentNodePreviewSections('handoff', {
      label: '会话交接',
      handoffTargetWorkflowId: 'wf-abc123def456',
      handoffPassHistory: true,
    })
    expect(sections.config.find((r) => r.key === 'call')?.value).toBe('会话交接')
    expect(sections.config.find((r) => r.key === 'target')?.value).toBe('wf-abc123def456'.slice(0, 12))
    expect(sections.config.find((r) => r.key === 'history')?.value).toBe('是')
  })

  it('handoff shows 未选择 when no target workflow', () => {
    const sections = getAgentNodePreviewSections('handoff', { label: '会话交接' })
    expect(sections.config.find((r) => r.key === 'target')?.value).toBe('未选择')
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
