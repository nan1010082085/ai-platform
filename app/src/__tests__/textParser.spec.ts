/**
 * textParser 测试 - 含 artifact 块检测
 */
import { describe, it, expect } from 'vitest'
import { splitTextAndCodeBlocks } from '@/utils/textParser'

describe('splitTextAndCodeBlocks', () => {
  it('splits plain text', () => {
    const parts = splitTextAndCodeBlocks('hello world')
    expect(parts).toHaveLength(1)
    expect(parts[0].type).toBe('text')
  })

  it('detects regular code blocks', () => {
    const parts = splitTextAndCodeBlocks('before\n```js\nconst x = 1\n```\nafter')
    expect(parts.some((p) => p.type === 'code' && p.language === 'js')).toBe(true)
  })

  it('detects artifact:code blocks as artifact type', () => {
    const parts = splitTextAndCodeBlocks('这是工件：\n```artifact:code\nfunction hello() {}\n```')
    const artifact = parts.find((p) => p.type === 'artifact')
    expect(artifact).toBeDefined()
    expect(artifact!.artifactType).toBe('code')
    expect(artifact!.content).toContain('function hello')
  })

  it('detects artifact:json blocks', () => {
    const parts = splitTextAndCodeBlocks('```artifact:json\n{"a":1}\n```')
    const artifact = parts.find((p) => p.type === 'artifact')
    expect(artifact).toBeDefined()
    expect(artifact!.artifactType).toBe('json')
  })

  it('detects artifact:html blocks', () => {
    const parts = splitTextAndCodeBlocks('```artifact:html\n<div>hi</div>\n```')
    const artifact = parts.find((p) => p.type === 'artifact')
    expect(artifact).toBeDefined()
    expect(artifact!.artifactType).toBe('html')
  })

  it('does not treat regular code as artifact', () => {
    const parts = splitTextAndCodeBlocks('```js\nvar x\n```')
    expect(parts.some((p) => p.type === 'artifact')).toBe(false)
    expect(parts.some((p) => p.type === 'code')).toBe(true)
  })

  it('handles mixed text + artifact + code', () => {
    const content = '说明\n```artifact:code\nfn()\n```\n中间\n```json\n{"k":"v"}\n```'
    const parts = splitTextAndCodeBlocks(content)
    const types = parts.map((p) => p.type)
    expect(types).toContain('text')
    expect(types).toContain('artifact')
    expect(types).toContain('code')
  })
})
