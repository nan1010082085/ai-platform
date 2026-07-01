import type { AgentNodeRecord, AgentNodeType, AgentWorkflowNodeData } from '@/types/agentWorkflow'
import { getPaletteItem, AGENT_NODE_COLORS } from '@/constants/agentNodes'
import {
  getAgentNodePreviewSections,
  type AgentNodePreviewRow,
  type PreviewTone,
} from '@/utils/agentNodePreview'

export interface DetailField {
  key: string
  label: string
  value: string
  mono?: boolean
  tone?: PreviewTone
  multiline?: boolean
}

export interface HitlDetailItem {
  question: string
  answer: string
}

export interface AgentNodeExecutionDetailViewModel {
  typeLabel: string
  typeIcon: string
  accentColor: string
  overview: DetailField[]
  config: AgentNodePreviewRow[]
  runtimeSummary: AgentNodePreviewRow[]
  highlights: DetailField[]
  hitlMessage?: string
  hitlItems: HitlDetailItem[]
}

function formatTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', { hour12: false })
}

function formatDuration(ms?: number): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m${s}s`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function extractHighlights(record: AgentNodeRecord): DetailField[] {
  const output = asRecord(record.output)
  const input = asRecord(record.input)
  const fields: DetailField[] = []

  if (output) {
    if (record.nodeType === 'llm' && output.text != null) {
      fields.push({ key: 'text', label: '模型回复', value: String(output.text), multiline: true })
    }
    if (record.nodeType === 'agent') {
      if (output.agent != null) {
        fields.push({ key: 'agent', label: '调度 Agent', value: String(output.agent), tone: 'primary' })
      }
      if (output.text != null) {
        fields.push({ key: 'agent-text', label: 'Agent 输出', value: String(output.text), multiline: true })
      }
    }
    if (record.nodeType === 'tool') {
      if (output.tool != null) {
        fields.push({ key: 'tool', label: '工具', value: String(output.tool), tone: 'primary' })
      }
      if (output.status != null) {
        fields.push({ key: 'http-status', label: 'HTTP 状态', value: String(output.status), mono: true })
      }
    }
    if (record.nodeType === 'if' && output.result != null) {
      fields.push({
        key: 'branch',
        label: '分支结果',
        value: output.result ? 'True（是）' : 'False（否）',
        tone: output.result ? 'success' : 'warning',
      })
    }
    if (output.approved != null) {
      fields.push({
        key: 'approved',
        label: '审批结果',
        value: output.approved ? '通过' : '拒绝',
        tone: output.approved ? 'success' : 'danger',
      })
    }
    if (output.comment != null && String(output.comment).trim()) {
      fields.push({ key: 'comment', label: '审批备注', value: String(output.comment), multiline: true })
    }
    if (output.message != null && record.nodeType === 'hitl') {
      fields.push({ key: 'message', label: '确认提示', value: String(output.message), multiline: true })
    }
  }

  if (input) {
    if (input.lastOutput != null && record.nodeType !== 'manual-trigger' && record.nodeType !== 'webhook-trigger') {
      const preview = typeof input.lastOutput === 'string'
        ? input.lastOutput
        : JSON.stringify(input.lastOutput, null, 2)
      fields.push({ key: 'upstream', label: '上游输出', value: preview, multiline: true, tone: 'muted' })
    }
  }

  return fields
}

function extractHitlItems(record: AgentNodeRecord): { message?: string; items: HitlDetailItem[] } {
  const output = asRecord(record.output)
  if (!output) return { items: [] }

  const message = output.message != null ? String(output.message) : undefined
  const items: HitlDetailItem[] = []
  const answers = asRecord(output.answers)

  const questions = Array.isArray(output.confirmQuestions)
    ? output.confirmQuestions.filter((q): q is Record<string, unknown> => q != null && typeof q === 'object')
    : []

  for (const q of questions) {
    const id = String(q.id ?? '')
    const question = String(q.question ?? q.text ?? '')
    if (!question.trim()) continue
    const answer = answers?.[id] != null ? String(answers[id]) : '—'
    items.push({ question, answer })
  }

  if (answers && items.length === 0) {
    for (const [id, answer] of Object.entries(answers)) {
      items.push({ question: id, answer: String(answer) })
    }
  }

  return { message, items }
}

export function buildAgentNodeExecutionDetail(
  record: AgentNodeRecord,
  nodeData?: AgentWorkflowNodeData | null,
): AgentNodeExecutionDetailViewModel {
  const palette = getPaletteItem(record.nodeType)
  const data = nodeData ?? { label: record.nodeName }
  const preview = getAgentNodePreviewSections(record.nodeType, data, record)
  const hitl = record.nodeType === 'hitl' ? extractHitlItems(record) : { items: [] }

  return {
    typeLabel: palette?.label ?? record.nodeType,
    typeIcon: palette?.icon ?? 'connection',
    accentColor: AGENT_NODE_COLORS[record.nodeType as AgentNodeType] ?? '#909399',
    overview: [
      { key: 'nodeId', label: '节点 ID', value: record.nodeId, mono: true },
      { key: 'nodeType', label: '节点类型', value: palette?.label ?? record.nodeType },
      { key: 'startedAt', label: '开始时间', value: formatTime(record.startedAt), mono: true },
      { key: 'finishedAt', label: '结束时间', value: formatTime(record.finishedAt), mono: true },
      { key: 'duration', label: '耗时', value: formatDuration(record.durationMs), mono: true },
    ],
    config: preview.config,
    runtimeSummary: preview.runtime.filter((row) => row.key !== 'rt-input' && row.key !== 'rt-output'),
    highlights: extractHighlights(record),
    hitlMessage: hitl.message,
    hitlItems: hitl.items,
  }
}
