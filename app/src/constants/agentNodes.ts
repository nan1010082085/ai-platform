/**
 * Agent 编排节点面板配置（n8n 风格分类）
 */

import type { AgentNodeType, AgentWorkflowNodeData } from '@/types/agentWorkflow'
import {
  TOOL_NODE_TYPES,
  TOOL_NODE_TYPE_META,
  isToolNodeType,
  type ToolNodeType,
} from '@/constants/toolNodeTypes'
import {
  EXPERT_NODE_TYPES,
  EXPERT_NODE_TYPE_META,
  isExpertNodeType,
  type ExpertNodeType,
} from '@/constants/expertNodeTypes'

export interface AgentPaletteItem {
  type: AgentNodeType
  label: string
  icon: string
  category: 'trigger' | 'ai' | 'experts' | 'logic' | 'tools' | 'action'
  description: string
  defaultData: Partial<AgentWorkflowNodeData>
}

const TOOL_PALETTE_ITEMS: AgentPaletteItem[] = TOOL_NODE_TYPES.map((type) => {
  const meta = TOOL_NODE_TYPE_META[type]
  return {
    type,
    label: meta.label,
    icon: meta.icon,
    category: 'tools' as const,
    description: meta.description,
    defaultData: { label: meta.label, toolCategory: meta.category },
  }
})

// 遗留专家节点元数据（旧工作流兼容；Palette 已改从插件中心加载）
const _LEGACY_EXPERT_PALETTE_ITEMS: AgentPaletteItem[] = EXPERT_NODE_TYPES.map((type) => {
  const meta = EXPERT_NODE_TYPE_META[type]
  return {
    type,
    label: meta.label,
    icon: meta.icon,
    category: 'experts' as const,
    description: meta.description,
    defaultData: {
      label: meta.label,
      ...(meta.agentType ? { agentType: meta.agentType } : {}),
    },
  }
})

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
    type: 'document-parse',
    label: '文档解析',
    icon: 'document',
    category: 'ai',
    description: '解析已上传文档，输出全文与分块',
    defaultData: {
      label: '文档解析',
      documentSource: 'stream',
      streamField: 'file',
    },
  },
  {
    type: 'vision-analyze',
    label: '图片视觉分析',
    icon: 'picture',
    category: 'ai',
    description: '对已上传图片做纯视觉语义描述（非 OCR）',
    defaultData: {
      label: '图片视觉分析',
      documentSource: 'stream',
      streamField: 'file',
      visionPrompt: '',
    },
  },
  {
    type: 'conversation-memory',
    label: '对话记忆',
    icon: 'chat-dot-round',
    category: 'logic',
    description: '读取/追加/重置多轮对话历史',
    defaultData: {
      label: '对话记忆',
      memoryMode: 'append',
      memoryRole: 'user',
      messageField: 'message',
      maxHistoryTurns: 20,
    },
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
    type: 'agent-intent',
    label: EXPERT_NODE_TYPE_META['agent-intent'].label,
    icon: EXPERT_NODE_TYPE_META['agent-intent'].icon,
    category: 'experts',
    description: EXPERT_NODE_TYPE_META['agent-intent'].description,
    defaultData: { label: EXPERT_NODE_TYPE_META['agent-intent'].label },
  },
  ...TOOL_PALETTE_ITEMS,
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

const LEGACY_AGENT_PALETTE: AgentPaletteItem = {
  type: 'agent',
  label: '专家 Agent',
  icon: 'user',
  category: 'experts',
  description: '旧版通用专家节点',
  defaultData: { label: '专家 Agent', agentType: 'general' },
}

const LEGACY_TOOL_PALETTE: AgentPaletteItem = {
  type: 'tool',
  label: '工具',
  icon: 'set-up',
  category: 'tools',
  description: '旧版通用工具节点',
  defaultData: { label: '工具' },
}

export const AGENT_NODE_COLORS: Record<string, string> = {
  'manual-trigger': '#67C23A',
  'webhook-trigger': '#67C23A',
  'document-parse': '#409EFF',
  'vision-analyze': '#9B59B6',
  'conversation-memory': '#E6A23C',
  llm: '#00D4FF',
  agent: '#409EFF',
  expert: '#9B59B6',
  tool: '#E6A23C',
  if: '#9B59B6',
  hitl: '#F56C6C',
  end: '#909399',
  ...Object.fromEntries(
    TOOL_NODE_TYPES.map((type) => [type, TOOL_NODE_TYPE_META[type].color]),
  ),
  ...Object.fromEntries(
    EXPERT_NODE_TYPES.map((type) => [type, EXPERT_NODE_TYPE_META[type].color]),
  ),
}

export function getPaletteItem(type: AgentNodeType): AgentPaletteItem | undefined {
  const found = AGENT_PALETTE_ITEMS.find((i) => i.type === type)
  if (found) return found
  if (type === 'agent') return LEGACY_AGENT_PALETTE
  if (type === 'tool') return LEGACY_TOOL_PALETTE
  if (isToolNodeType(type) && type !== 'tool') {
    const meta = TOOL_NODE_TYPE_META[type as ToolNodeType]
    return {
      type,
      label: meta.label,
      icon: meta.icon,
      category: 'tools',
      description: meta.description,
      defaultData: { label: meta.label, toolCategory: meta.category },
    }
  }
  if (type === 'expert') {
    return {
      type: 'expert',
      label: '插件专家',
      icon: 'cpu',
      category: 'experts',
      description: '从插件中心选择注册专家',
      defaultData: { label: '插件专家' },
    }
  }
  if (isExpertNodeType(type) && type !== 'agent' && type !== 'expert') {
    const meta = EXPERT_NODE_TYPE_META[type as ExpertNodeType]
    return {
      type,
      label: meta.label,
      icon: meta.icon,
      category: 'experts',
      description: meta.description,
      defaultData: {
        label: meta.label,
        ...(meta.agentType ? { agentType: meta.agentType } : {}),
      },
    }
  }
  return undefined
}
