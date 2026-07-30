import { describe, it, expect } from 'vitest'
import {
  AGENT_WORKFLOW_TEMPLATES,
  createAgentWorkflowGraphByTemplate,
  validateAgentWorkflowGraph,
} from '@schema-platform/platform-shared/ai'
import { isRegisteredAppIcon } from '@schema-platform/platform-shared/utils/iconRegistry'

describe('全部模板图合法性校验', () => {
  // 收集所有有 error 的模板，一次性展示，便于定位
  const invalid: Array<{ id: string; errors: string[]; warnings: string[] }> = []

  for (const tpl of AGENT_WORKFLOW_TEMPLATES) {
    it(`${tpl.id} 生成合法图（无 error）`, () => {
      const graph = createAgentWorkflowGraphByTemplate(tpl.id)
      const issues = validateAgentWorkflowGraph(graph)
      const errors = issues.filter((i) => i.level === 'error').map((i) => i.message)
      const warnings = issues.filter((i) => i.level === 'warning').map((i) => i.message)
      if (errors.length) {
        invalid.push({ id: tpl.id, errors, warnings })
      }
      expect(errors, JSON.stringify({ id: tpl.id, errors, warnings }, null, 2)).toEqual([])
    })
  }

  // 汇总（即使上面 it 全过，这里也能在日志里看到 warning）
  it('汇总：无 error 的模板', () => {
    if (invalid.length) {
      console.error('非法模板汇总', JSON.stringify(invalid, null, 2))
    }
    expect(invalid).toEqual([])
  })

  // 收集所有 warning，便于打磨（不阻断测试）
  it('汇总：所有模板的 warning（打磨参考）', () => {
    const allWarnings: Array<{ id: string; warnings: string[] }> = []
    for (const tpl of AGENT_WORKFLOW_TEMPLATES) {
      const graph = createAgentWorkflowGraphByTemplate(tpl.id)
      const warnings = validateAgentWorkflowGraph(graph)
        .filter((i) => i.level === 'warning')
        .map((i) => (i.nodeId ? `[${i.nodeId}] ${i.message}` : i.message))
      if (warnings.length) allWarnings.push({ id: tpl.id, warnings })
    }
    console.log('模板 warning 汇总\n', JSON.stringify(allWarnings, null, 2))
    // 不阻断：warning 仅作打磨参考
    expect(allWarnings).toBeDefined()
  })

  it('所有模板都有 icon 和 tags（元数据一致性）', () => {
    const missing: Array<{ id: string; missing: string[] }> = []
    for (const tpl of AGENT_WORKFLOW_TEMPLATES) {
      const m: string[] = []
      if (!tpl.icon) m.push('icon')
      if (!tpl.tags || tpl.tags.length === 0) m.push('tags')
      if (m.length) missing.push({ id: tpl.id, missing: m })
    }
    expect(missing, JSON.stringify(missing, null, 2)).toEqual([])
  })

  it('所有模板 icon 已在 iconRegistry 注册（禁止编造图标名）', () => {
    const unregistered: Array<{ id: string; icon: string }> = []
    for (const tpl of AGENT_WORKFLOW_TEMPLATES) {
      if (tpl.icon && !isRegisteredAppIcon(tpl.icon)) {
        unregistered.push({ id: tpl.id, icon: tpl.icon })
      }
    }
    expect(unregistered, JSON.stringify(unregistered, null, 2)).toEqual([])
  })
})
