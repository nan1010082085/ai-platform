/**
 * usePreviewCompare - 预览对比逻辑
 *
 * 从 AiPreviewCompare.vue 提取，计算 Schema/Flow 差异。
 */

import { computed } from 'vue'
import type { Widget, FlowGraph } from '@/types'

export interface PreviewCompareOptions {
  /** 修改前的内容 */
  before: Widget[] | FlowGraph | null
  /** 修改后的内容 */
  after: Widget[] | FlowGraph | null
  /** 内容类型 */
  type: 'schema' | 'flow'
}

export interface SchemaDiffItem {
  id: string
  label: string
  type: string
  status: 'added' | 'removed' | 'changed' | 'unchanged'
  beforeProps?: Record<string, unknown>
  afterProps?: Record<string, unknown>
  changedFields?: string[]
}

export interface FlowDiffItem {
  id: string
  label: string
  type: 'node' | 'edge'
  status: 'added' | 'removed' | 'changed' | 'unchanged'
  beforeData?: Record<string, unknown>
  afterData?: Record<string, unknown>
}

export interface DiffSummary {
  added: number
  removed: number
  changed: number
  unchanged: number
}

export function usePreviewCompare(options: PreviewCompareOptions) {
  // ---- Schema Diff ----

  const schemaDiffs = computed<SchemaDiffItem[]>(() => {
    if (options.type !== 'schema') return []

    const beforeWidgets = (options.before as Widget[]) ?? []
    const afterWidgets = (options.after as Widget[]) ?? []

    const beforeMap = new Map(beforeWidgets.map((w) => [w.id, w]))
    const afterMap = new Map(afterWidgets.map((w) => [w.id, w]))

    const diffs: SchemaDiffItem[] = []

    // 检查新增和修改
    for (const [id, after] of afterMap) {
      const before = beforeMap.get(id)
      if (!before) {
        diffs.push({
          id,
          label: after.label ?? after.field ?? after.type,
          type: after.type,
          status: 'added',
          afterProps: after.props,
        })
      } else {
        const changedFields = getChangedFields(before, after)
        diffs.push({
          id,
          label: after.label ?? after.field ?? after.type,
          type: after.type,
          status: changedFields.length > 0 ? 'changed' : 'unchanged',
          beforeProps: before.props,
          afterProps: after.props,
          changedFields,
        })
      }
    }

    // 检查删除
    for (const [id, before] of beforeMap) {
      if (!afterMap.has(id)) {
        diffs.push({
          id,
          label: before.label ?? before.field ?? before.type,
          type: before.type,
          status: 'removed',
          beforeProps: before.props,
        })
      }
    }

    return diffs
  })

  function getChangedFields(before: Widget, after: Widget): string[] {
    const changed: string[] = []

    if (before.label !== after.label) changed.push('label')
    if (before.field !== after.field) changed.push('field')
    if (before.type !== after.type) changed.push('type')

    // 比较 props
    const beforeProps = before.props ?? {}
    const afterProps = after.props ?? {}
    const allKeys = new Set([...Object.keys(beforeProps), ...Object.keys(afterProps)])

    for (const key of allKeys) {
      if (JSON.stringify(beforeProps[key]) !== JSON.stringify(afterProps[key])) {
        changed.push(`props.${key}`)
      }
    }

    return changed
  }

  // ---- Flow Diff ----

  const flowDiffs = computed<FlowDiffItem[]>(() => {
    if (options.type !== 'flow') return []

    const beforeFlow = (options.before as FlowGraph) ?? { nodes: [], edges: [] }
    const afterFlow = (options.after as FlowGraph) ?? { nodes: [], edges: [] }

    const diffs: FlowDiffItem[] = []

    // 节点对比
    const beforeNodes = new Map(beforeFlow.nodes.map((n) => [n.id, n]))
    const afterNodes = new Map(afterFlow.nodes.map((n) => [n.id, n]))

    for (const [id, node] of afterNodes) {
      const before = beforeNodes.get(id)
      diffs.push({
        id,
        label: node.data.label ?? node.data.bpmnType ?? id,
        type: 'node',
        status: !before ? 'added' : JSON.stringify(node) !== JSON.stringify(before) ? 'changed' : 'unchanged',
        beforeData: before?.data,
        afterData: node.data,
      })
    }

    for (const [id, node] of beforeNodes) {
      if (!afterNodes.has(id)) {
        diffs.push({
          id,
          label: node.data.label ?? node.data.bpmnType ?? id,
          type: 'node',
          status: 'removed',
          beforeData: node.data,
        })
      }
    }

    // 边对比
    const beforeEdges = new Map(beforeFlow.edges.map((e) => [e.id, e]))
    const afterEdges = new Map(afterFlow.edges.map((e) => [e.id, e]))

    for (const [id, edge] of afterEdges) {
      const before = beforeEdges.get(id)
      diffs.push({
        id,
        label: id,
        type: 'edge',
        status: !before ? 'added' : JSON.stringify(edge) !== JSON.stringify(before) ? 'changed' : 'unchanged',
        beforeData: before as unknown as Record<string, unknown>,
        afterData: edge as unknown as Record<string, unknown>,
      })
    }

    for (const [id, edge] of beforeEdges) {
      if (!afterEdges.has(id)) {
        diffs.push({
          id,
          label: id,
          type: 'edge',
          status: 'removed',
          beforeData: edge as unknown as Record<string, unknown>,
        })
      }
    }

    return diffs
  })

  // ---- 统计 ----

  const summary = computed<DiffSummary>(() => {
    const items = options.type === 'schema' ? schemaDiffs.value : flowDiffs.value
    return {
      added: items.filter((d) => d.status === 'added').length,
      removed: items.filter((d) => d.status === 'removed').length,
      changed: items.filter((d) => d.status === 'changed').length,
      unchanged: items.filter((d) => d.status === 'unchanged').length,
    }
  })

  const hasDiffs = computed(() =>
    summary.value.added + summary.value.removed + summary.value.changed > 0,
  )

  // ---- 样式 ----

  function getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      added: 'var(--ai-color-success, #26A036)',
      removed: 'var(--ai-color-danger, #E50113)',
      changed: 'var(--ai-color-warning, #E6A23C)',
      unchanged: 'var(--ai-text-secondary, #666666)',
    }
    return colorMap[status] ?? colorMap.unchanged
  }

  function getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
      added: '新增',
      removed: '删除',
      changed: '修改',
      unchanged: '相同',
    }
    return labelMap[status] ?? status
  }

  function getStatusBg(status: string): string {
    const bgMap: Record<string, string> = {
      added: 'var(--ai-color-success-bg, rgba(82, 196, 26, 0.1))',
      removed: 'var(--ai-color-danger-bg, rgba(229, 1, 19, 0.08))',
      changed: 'var(--ai-color-warning-bg, rgba(230, 162, 60, 0.1))',
      unchanged: 'transparent',
    }
    return bgMap[status] ?? bgMap.unchanged
  }

  // ---- 操作 ----

  function getApplyAllIds(): string[] {
    const items = options.type === 'schema' ? schemaDiffs.value : flowDiffs.value
    return items
      .filter((d) => d.status !== 'removed')
      .map((d) => d.id)
  }

  return {
    schemaDiffs,
    flowDiffs,
    summary,
    hasDiffs,
    getStatusColor,
    getStatusLabel,
    getStatusBg,
    getApplyAllIds,
  }
}
