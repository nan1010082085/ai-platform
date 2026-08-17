/**
 * registry-adapter 单测：服务端快照 -> chatTools overlay 层映射（M1）。
 */

import { describe, it, expect } from 'vitest'
import { registryToolsToDefs, registryToolToDef, type RegistryToolSummary } from '@/plugins'
import { SCHEMA_SEARCH } from '@schema-platform/platform-shared/ai/toolNames'

const baseSummary = (overrides: Partial<RegistryToolSummary> = {}): RegistryToolSummary => ({
  name: 'custom__tool',
  kind: 'http',
  ...overrides,
})

describe('registryToolsToDefs', () => {
  it('内置同名工具：argsHint/category 回退到内置层', () => {
    const def = registryToolToDef({ name: SCHEMA_SEARCH, kind: 'mcp' })
    expect(def.category).toBe('mcp-schema')
    expect(def.argsHint).toBe('{"keyword":"表单","limit":5}')
    expect(def.source).toBe('registry')
  })

  it('registry 字段优先于内置回退', () => {
    const def = registryToolToDef({
      name: SCHEMA_SEARCH,
      kind: 'mcp',
      label: '自定义标签',
      category: 'langgraph',
      argsHint: '{"x":1}',
      source: 'tenant-a',
    })
    expect(def.label).toBe('自定义标签')
    expect(def.category).toBe('langgraph')
    expect(def.argsHint).toBe('{"x":1}')
    expect(def.source).toBe('tenant-a')
  })

  it('未知工具：kind 推导分类 + 显示名兜底', () => {
    const graph = registryToolToDef(baseSummary({ kind: 'graph' }))
    expect(graph.category).toBe('langgraph')
    const http = registryToolToDef(baseSummary({ kind: 'http' }))
    expect(http.category).toBe('workflow')
    const unknown = registryToolToDef(baseSummary({ kind: 'magic' }))
    expect(unknown.category).toBe('langgraph') // 最终兜底
    expect(unknown.label).toBe('custom__tool')
    expect(unknown.argsHint).toBe('{}')
  })

  it('批量映射保持顺序与数量', () => {
    const defs = registryToolsToDefs([
      baseSummary({ name: 'a__tool' }),
      baseSummary({ name: 'b__tool', category: 'mcp-rag' }),
    ])
    expect(defs.map((d) => d.name)).toEqual(['a__tool', 'b__tool'])
    expect(defs[1].category).toBe('mcp-rag')
  })
})
