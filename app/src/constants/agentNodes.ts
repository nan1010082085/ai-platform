/**
 * Agent 编排节点面板配置（n8n 风格分类）
 */

import type { AgentNodeType, AgentWorkflowNodeData } from '@/types/agentWorkflow'

export interface AgentPaletteItem {
  type: AgentNodeType
  label: string
  icon: string
  category: 'trigger' | 'ai' | 'logic' | 'action'
  description: string
  defaultData: Partial<AgentWorkflowNodeData>
}

export const AGENT_PALETTE_ITEMS: AgentPaletteItem[] = [
  {
    type: 'manual-trigger',
    label: '手动触发',
    icon: 'video-play',
    category: 'trigger',
    description: '从设计器或 API 手动启动',
    defaultData: { label: '手动触发' },
  },
  {
    type: 'webhook-trigger',
    label: 'Webhook 触发',
    icon: 'bell',
    category: 'trigger',
    description: '通过 HTTP Webhook 自动触发',
    defaultData: { label: 'Webhook 触发', webhookPath: '/hook', webhookMethod: 'POST' },
  },
  {
    type: 'llm',
    label: 'LLM',
    icon: 'cpu',
    category: 'ai',
    description: '调用大模型处理文本',
    defaultData: { label: 'LLM', prompt: '{{$input.message}}', model: 'default' },
  },
  {
    type: 'agent',
    label: '专家 Agent',
    icon: 'user',
    category: 'ai',
    description: '调度 editor / flow / page 专家',
    defaultData: { label: '专家 Agent', agentType: 'general' },
  },
  {
    type: 'tool',
    label: '工具',
    icon: 'set-up',
    category: 'action',
    description: '调用平台 Tool',
    defaultData: { label: '工具', toolName: '' },
  },
  {
    type: 'if',
    label: '条件分支',
    icon: 'share',
    category: 'logic',
    description: '按表达式选择分支',
    defaultData: { label: 'IF', expression: 'lastOutput' },
  },
  {
    type: 'hitl',
    label: '人工确认',
    icon: 'bell',
    category: 'logic',
    description: '暂停等待人工输入',
    defaultData: {
      label: '人工确认',
      confirmMessage: '请确认是否继续',
      confirmQuestions: [],
      inheritUpstreamQuestions: true,
    },
  },
  {
    type: 'end',
    label: '结束',
    icon: 'circle-check',
    category: 'action',
    description: '结束工作流',
    defaultData: { label: '结束' },
  },
]

export const AGENT_NODE_COLORS: Record<AgentNodeType, string> = {
  'manual-trigger': '#67C23A',
  'webhook-trigger': '#67C23A',
  llm: '#00D4FF',
  agent: '#409EFF',
  tool: '#E6A23C',
  if: '#9B59B6',
  hitl: '#F56C6C',
  end: '#909399',
}

export function getPaletteItem(type: AgentNodeType): AgentPaletteItem | undefined {
  return AGENT_PALETTE_ITEMS.find((i) => i.type === type)
}
