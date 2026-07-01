/**
 * Agent 工作流编排 — 领域类型（n8n 风格 DAG）
 */

export type AgentNodeType =
  | 'manual-trigger'
  | 'webhook-trigger'
  | 'llm'
  | 'agent'
  | 'tool'
  | 'if'
  | 'hitl'
  | 'end'

export type AgentWorkflowStatus = 'draft' | 'published' | 'archived'

export type AgentExecutionStatus = 'running' | 'success' | 'error' | 'waiting' | 'cancelled'

export type AgentNodeRecordStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped'
  | 'waiting'

/** HITL 人工确认问题（与 Chat 需求分析 confirmQuestions 结构对齐） */
export interface AgentHitlConfirmQuestion {
  id: string
  question: string
  options?: string[]
  required?: boolean
}

export interface AgentWorkflowNodeData {
  label: string
  /** llm */
  prompt?: string
  model?: string
  systemPrompt?: string
  /** agent */
  agentType?: 'auto' | 'editor' | 'flow' | 'page' | 'general'
  /** tool */
  toolName?: string
  toolArgs?: Record<string, unknown>
  /** if */
  expression?: string
  /** hitl */
  confirmMessage?: string
  /** 静态配置的确认问题 */
  confirmQuestions?: AgentHitlConfirmQuestion[]
  /** 是否合并上游节点输出中的 confirmQuestions（默认 true） */
  inheritUpstreamQuestions?: boolean
  /** webhook-trigger */
  webhookPath?: string
  webhookMethod?: 'GET' | 'POST'
  notes?: string
}

export interface AgentWorkflowNode {
  id: string
  type: AgentNodeType
  position: { x: number; y: number }
  data: AgentWorkflowNodeData
}

export interface AgentWorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  data?: {
    label?: string
    branch?: 'true' | 'false' | 'default'
  }
}

export interface AgentWorkflowGraph {
  nodes: AgentWorkflowNode[]
  edges: AgentWorkflowEdge[]
  entryNodeId: string
  viewport?: { x: number; y: number; zoom: number }
}

export interface AgentWorkflowSummary {
  id: string
  name: string
  description?: string
  status: AgentWorkflowStatus
  /** 当前草稿版本号 (yyyymmddhhmmss) */
  version: string
  /** 稳定发布 ID (UUID) */
  publishId: string | null
  /** 已发布版本号 (yyyymmddhhmmss) */
  publishedVersion: string | null
  /** 是否有执行中的实例 */
  hasRunningExecution: boolean
  updatedAt: string
  createdAt: string
}

export interface AgentWorkflowDetail extends AgentWorkflowSummary {
  draftGraph: AgentWorkflowGraph
}

export interface AgentWorkflowVersionEntry {
  version: string
  createdAt: string
  published: boolean
  current: boolean
}

export interface AgentWorkflowVersionDetail {
  version: string
  graph: AgentWorkflowGraph
  createdAt: string
  current: boolean
}

export interface AgentNodeRecord {
  nodeId: string
  nodeType: AgentNodeType
  nodeName: string
  status: AgentNodeRecordStatus
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  input?: unknown
  output?: unknown
  error?: string
}

export interface AgentWorkflowExecution {
  id: string
  workflowId: string
  workflowName: string
  versionId: string | null
  version: string
  status: AgentExecutionStatus
  trigger: 'manual' | 'chat' | 'webhook'
  startedAt: string
  finishedAt?: string
  durationMs?: number
  nodeRecords: AgentNodeRecord[]
  error?: string
}

export interface AgentWorkflowValidationIssue {
  level: 'error' | 'warning'
  nodeId?: string
  message: string
}

export function createDefaultAgentWorkflowGraph(): AgentWorkflowGraph {
  return {
    entryNodeId: 'trigger-1',
    nodes: [
      {
        id: 'trigger-1',
        type: 'manual-trigger',
        position: { x: 80, y: 200 },
        data: { label: '手动触发' },
      },
      {
        id: 'llm-1',
        type: 'llm',
        position: { x: 320, y: 200 },
        data: { label: 'LLM', prompt: '{{$input.message}}', model: 'default' },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 560, y: 200 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'llm-1' },
      { id: 'e2', source: 'llm-1', target: 'end-1' },
    ],
  }
}

export function validateAgentWorkflowGraph(graph: AgentWorkflowGraph): AgentWorkflowValidationIssue[] {
  const issues: AgentWorkflowValidationIssue[] = []
  if (!graph.nodes.length) {
    issues.push({ level: 'error', message: '工作流至少需要一个节点' })
    return issues
  }
  if (!graph.entryNodeId || !graph.nodes.some((n) => n.id === graph.entryNodeId)) {
    issues.push({ level: 'error', message: '缺少有效的入口节点' })
  }
  const nodeIds = new Set(graph.nodes.map((n) => n.id))
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({ level: 'error', message: `连线 ${edge.id} 引用了不存在的节点` })
    }
  }
  const triggers = graph.nodes.filter((n) => n.type === 'manual-trigger' || n.type === 'webhook-trigger')
  if (triggers.length === 0) {
    issues.push({ level: 'error', message: '需要至少一个触发节点（手动或 Webhook）' })
  }
  if (triggers.length > 1) {
    issues.push({ level: 'warning', message: '存在多个手动触发节点，仅 entryNodeId 指定的节点作为入口' })
  }
  const ends = graph.nodes.filter((n) => n.type === 'end')
  if (ends.length === 0) {
    issues.push({ level: 'warning', message: '建议添加「结束」节点' })
  }
  for (const node of graph.nodes) {
    if (!node.data?.label?.trim()) {
      issues.push({ level: 'warning', nodeId: node.id, message: '节点缺少显示名称' })
    }
    if (node.type === 'llm' && !node.data.prompt?.trim()) {
      issues.push({ level: 'warning', nodeId: node.id, message: 'LLM 节点未配置 Prompt' })
    }
    if (node.type === 'tool' && !node.data.toolName?.trim()) {
      issues.push({ level: 'warning', nodeId: node.id, message: '工具节点未选择工具' })
    }
  }
  return issues
}
