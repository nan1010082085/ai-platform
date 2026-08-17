/**
 * skill-adapter：平台 registry skill 快照 -> DSH SKILL.md 兼容视图（M4）。
 *
 * 契约对齐依据（dsh-skill-filesystem 的 frontmatter 规范）：
 * - 必填：name（kebab-case）、description
 * - 可选：whenToUse、metadata、disable-model-invocation、user-invocable
 * - 结构：<root>/<name>/SKILL.md 或平铺 <name>.md
 *
 * 平台侧快照字段映射：
 * - id -> name（平台 id 已是 kebab-case；非法的按规则拒绝，不做静默改写）
 * - label -> description（无 label 时回退 id）
 * - tools -> 平台引用的工具名（DSH 侧无对应字段，保留为平台扩展）
 */

import type { ToolCategory } from './plugins/chat-tools/types'

export interface SkillDef {
  /** kebab-case 技能名（对齐 SKILL.md name） */
  name: string
  description: string
  /** 何时使用（对齐 whenToUse） */
  whenToUse?: string
  /** 开放元数据（对齐 metadata） */
  metadata?: Record<string, unknown>
  /** 禁止模型直接调用（对齐 disable-model-invocation） */
  disableModelInvocation?: boolean
  /** 允许用户调用（对齐 user-invocable） */
  userInvocable?: boolean
  /** 平台扩展：该 skill 引用的工具名 */
  tools?: string[]
  /** 平台扩展：工具分类提示 */
  category?: ToolCategory
}

export interface PlatformSkillSummary {
  id: string
  label?: string
  tools?: string[]
  whenToUse?: string
  metadata?: Record<string, unknown>
}

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function platformSkillToDef(skill: PlatformSkillSummary): SkillDef {
  if (!KEBAB_CASE.test(skill.id)) {
    throw new Error(`[plugins] skill id 必须是 kebab-case（DSH SKILL.md 契约）: ${skill.id}`)
  }
  const def: SkillDef = {
    name: skill.id,
    description: skill.label ?? skill.id,
    userInvocable: true,
    tools: skill.tools ?? [],
  }
  if (skill.whenToUse) def.whenToUse = skill.whenToUse
  if (skill.metadata) def.metadata = skill.metadata
  return def
}

export function platformSkillsToDefs(skills: PlatformSkillSummary[]): SkillDef[] {
  return skills.map(platformSkillToDef)
}
