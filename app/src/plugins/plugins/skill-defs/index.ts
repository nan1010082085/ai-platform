/**
 * SkillDefs Cordis Service：技能注册表（DSH SKILL.md 契约对齐）。
 *
 * 把平台 registry 的 skills 快照转成 DSH SKILL.md 兼容的 SkillDef，
 * 供前端展示。
 *
 * 分层：base（静态 pack）< overlay（registry）< patch（前端本地覆盖）
 */

import { Service, type Context } from '@deepseek-ai/cordis'
import { platformSkillToDef, platformSkillsToDefs, type SkillDef, type PlatformSkillSummary } from '../../skill-adapter'

export class SkillDefsService extends Service {
  private base = new Map<string, SkillDef>()
  private overlay = new Map<string, SkillDef>()
  private patch = new Map<string, SkillDef>()

  constructor(ctx: Context) {
    super(ctx, 'skillDefs')
  }

  /** 整体替换 overlay 层（registry 快照刷新语义） */
  setOverlay(defs: SkillDef[]): void {
    this.overlay = new Map(defs.map((def) => [def.name, def]))
    this.notify()
  }

  /** 整体替换 patch 层（前端本地覆盖，最高优先级） */
  setPatch(defs: SkillDef[]): void {
    this.patch = new Map(defs.map((def) => [def.name, def]))
    this.notify()
  }

  /** 从 registry 快照同步（便捷方法）→ overlay */
  syncFromRegistry(skills: PlatformSkillSummary[]): void {
    this.setOverlay(platformSkillsToDefs(skills))
  }

  /** 覆盖 builtin 层（静态 pack） */
  setBase(defs: SkillDef[]): void {
    this.base = new Map(defs.map((def) => [def.name, def]))
    this.notify()
  }

  /** 按名称查找（patch > overlay > base） */
  get(name: string): SkillDef | undefined {
    return this.patch.get(name) ?? this.overlay.get(name) ?? this.base.get(name)
  }

  listBase(): SkillDef[] {
    return [...this.base.values()]
  }

  /** overlay 层清单 */
  listOverlay(): SkillDef[] {
    return [...this.overlay.values()]
  }

  /** patch 层清单 */
  listPatch(): SkillDef[] {
    return [...this.patch.values()]
  }

  /** 全量清单（base ∪ overlay ∪ patch，同名高层优先） */
  list(): SkillDef[] {
    const merged = new Map([...this.base, ...this.overlay, ...this.patch])
    return [...merged.values()]
  }

  private notify(): void {
    this.ctx.emit('skillDefs/changed')
  }
}

export const skillDefsPlugin = (ctx: Context): void => {
  new SkillDefsService(ctx)
}
