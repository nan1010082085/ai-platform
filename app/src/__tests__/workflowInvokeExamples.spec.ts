import { describe, it, expect } from 'vitest'
import { buildInvokeCodeExamples } from '@/utils/workflowInvokeExamples'

describe('buildInvokeCodeExamples', () => {
  const baseOpts = {
    url: 'https://example.com/schema-platform/api/ai/workflows/invoke/my-slug',
    invokeKey: 'wf_abc123',
    message: '你好',
  }

  it('curl 包含 URL、key、body', () => {
    const { curl } = buildInvokeCodeExamples(baseOpts)
    expect(curl).toContain('curl -X POST')
    expect(curl).toContain(baseOpts.url)
    expect(curl).toContain('X-Workflow-Key: wf_abc123')
    expect(curl).toContain('"message":"你好"')
  })

  it('javascript 使用 fetch + X-Workflow-Key', () => {
    const { javascript } = buildInvokeCodeExamples(baseOpts)
    expect(javascript).toContain("fetch('https://example.com")
    expect(javascript).toContain("'X-Workflow-Key': 'wf_abc123'")
    expect(javascript).toContain('data.data.executionId')
  })

  it('python 使用 requests.post', () => {
    const { python } = buildInvokeCodeExamples(baseOpts)
    expect(python).toContain('import requests')
    expect(python).toContain("requests.post(")
    expect(python).toContain("'X-Workflow-Key': 'wf_abc123'")
    expect(python).toContain("data['data']['executionId']")
  })

  it('invokeKey 为空时用占位符', () => {
    const { curl } = buildInvokeCodeExamples({ ...baseOpts, invokeKey: '' })
    expect(curl).toContain('X-Workflow-Key: <YOUR_WORKFLOW_KEY>')
  })

  it('message 含单引号时按语言正确转义', () => {
    const { curl, javascript, python } = buildInvokeCodeExamples({ ...baseOpts, message: "it's a test" })
    // curl：JSON body 在 shell 单引号内，' -> '\''
    expect(curl).toContain("it'\\''s a test")
    // JS/Python：单引号字符串内，' -> \'
    expect(javascript).toContain("it\\'s a test")
    expect(python).toContain("it\\'s a test")
  })

  it('message 含反斜杠时 JS/Python 转义反斜杠', () => {
    const { javascript, python } = buildInvokeCodeExamples({ ...baseOpts, message: 'a\\b' })
    expect(javascript).toContain("'a\\\\b'")
    expect(python).toContain("'a\\\\b'")
  })
})
