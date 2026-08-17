/**
 * skill-adapter 单测（M4）：平台快照 -> DSH SKILL.md 契约对齐。
 */

import { describe, it, expect } from 'vitest'
import { platformSkillToDef, platformSkillsToDefs } from '@/plugins'

describe('platformSkillToDef', () => {
  it('合法 kebab-case id：映射 name/description/tools', () => {
    const def = platformSkillToDef({
      id: 'schema-gen',
      label: 'Schema 生成技能',
      tools: ['schema__search', 'generate_schema'],
    })
    expect(def.name).toBe('schema-gen')
    expect(def.description).toBe('Schema 生成技能')
    expect(def.tools).toEqual(['schema__search', 'generate_schema'])
    expect(def.userInvocable).toBe(true)
  })

  it('缺 label 回退 description=id；whenToUse/metadata 透传', () => {
    const def = platformSkillToDef({
      id: 'flow-audit',
      whenToUse: '审计流程定义时使用',
      metadata: { owner: 'flow-team' },
    })
    expect(def.description).toBe('flow-audit')
    expect(def.whenToUse).toBe('审计流程定义时使用')
    expect(def.metadata).toEqual({ owner: 'flow-team' })
    expect(def.tools).toEqual([])
  })

  it('非法 id（非 kebab-case）显式报错，不做静默改写', () => {
    expect(() => platformSkillToDef({ id: 'SchemaGen' })).toThrow(/kebab-case/)
    expect(() => platformSkillToDef({ id: 'schema__gen' })).toThrow(/kebab-case/)
    expect(() => platformSkillToDef({ id: '' })).toThrow(/kebab-case/)
  })

  it('批量映射保持顺序', () => {
    const defs = platformSkillsToDefs([
      { id: 'a-skill' },
      { id: 'b-skill', label: 'B' },
    ])
    expect(defs.map((d) => d.name)).toEqual(['a-skill', 'b-skill'])
    expect(defs[1].description).toBe('B')
  })
})
