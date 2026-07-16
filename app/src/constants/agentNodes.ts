/**
 * Agent 编排节点面板配置（n8n 风格分类）
 */

import type { AgentNodeType } from '@/types/agentWorkflow'
import { EXPERT_NODE_TYPE_META } from '@/constants/expertNodeTypes'

export interface AgentPaletteItem {
  type: AgentNodeType
  label: string
  icon: string
  category: 'trigger' | 'ai' | 'experts' | 'logic' | 'tools' | 'action'
  description: string
  defaultData: Partial<import('@/types/agentWorkflow').AgentWorkflowNodeData>
}

export const AGENT_PALETTE_ITEMS: AgentPaletteItem[] = [
  {
    type: 'manual-trigger',
    label: '手动触发',
    icon: 'video-play',
    category: 'trigger',
    description: '设计器测试或内部 API 手动启动（入口节点）',
    defaultData: { label: '手动触发' },
  },
  {
    type: 'webhook-trigger',
    label: 'Webhook 触发',
    icon: 'bell',
    category: 'trigger',
    description: '外部 HTTP 调用 Webhook 地址时从此入口进入',
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
    type: 'audio-transcribe',
    label: '音频转录',
    icon: 'microphone',
    category: 'ai',
    description: '使用 Whisper 将音频文件转录为文字',
    defaultData: {
      label: '音频转录',
      documentSource: 'stream',
      streamField: 'file',
      language: 'zh',
    },
  },
  {
    type: 'video-analyze',
    label: '视频分析',
    icon: 'video-camera',
    category: 'ai',
    description: '提取视频关键帧并使用视觉模型分析内容',
    defaultData: {
      label: '视频分析',
      documentSource: 'stream',
      streamField: 'file',
      visionPrompt: '',
      maxFrames: 10,
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
  {
    type: 'image-generate',
    label: '图片生成',
    icon: 'picture',
    category: 'ai',
    description: '调用 AI 生成图片（DALL-E 3 / Mimo 等）',
    defaultData: {
      label: '图片生成',
      imagePrompt: '{{$input.message}}',
      imageModel: 'dall-e-3',
      imageSize: '1024x1024',
      imageStyle: 'vivid',
      imageQuality: 'standard',
    },
  },
  {
    type: 'ppt-generate',
    label: 'PPT 生成',
    icon: 'data-board',
    category: 'ai',
    description: '根据文本内容自动生成演示文稿',
    defaultData: {
      label: 'PPT 生成',
      pptTemplate: 'business',
      pptMaxSlides: 10,
      pptStyle: 'professional',
      pptIncludeImages: false,
    },
  },
  {
    type: 'intent-router',
    label: '意图路由',
    icon: 'share',
    category: 'logic',
    description: '自动识别用户意图并路由到对应专家',
    defaultData: {
      label: '意图路由',
      routingMode: 'auto',
      enableMultiIntentChain: false,
      fallbackExpertId: '',
    },
  },
  {
    type: 'summarizer',
    label: '多步总结',
    icon: 'document',
    category: 'ai',
    description: '汇总任务链输出或自定义内容生成摘要',
    defaultData: {
      label: '多步总结',
      summarySource: 'taskChain',
      customPrompt: '',
      stream: false,
      model: 'default',
    },
  },
  {
    type: 'requirement-analyzer',
    label: '需求分析',
    icon: 'search',
    category: 'ai',
    description: '分析用户需求的完整性与可行性',
    defaultData: {
      label: '需求分析',
      enableRag: true,
      enableTools: true,
      completenessThreshold: 80,
      model: 'default',
    },
  },
  {
    type: 'task-planner',
    label: '任务规划',
    icon: 'list',
    category: 'ai',
    description: '将需求拆解为可执行的任务步骤',
    defaultData: {
      label: '任务规划',
      inputSource: 'message',
      maxSteps: 8,
      strategy: 'sequential',
      model: 'default',
    },
  },
  {
    type: 'task-chain',
    label: '任务链',
    icon: 'connection',
    category: 'logic',
    description: '按步骤依次执行任务链中的每个任务',
    defaultData: {
      label: '任务链',
      chainSource: 'upstream',
      staticChain: [],
      onStepOutput: '',
    },
  },
  {
    type: 'collaboration-router',
    label: '协作路由',
    icon: 'coordinate',
    category: 'logic',
    description: '检测协作工具并路由多轮协作交互',
    defaultData: {
      label: '协作路由',
      detectCollaborationTool: true,
      maxCollaborationRounds: 3,
    },
  },
]

export const AGENT_NODE_COLORS: Record<string, string> = {
  'manual-trigger': '#67C23A',
  'webhook-trigger': '#67C23A',
  'document-parse': '#409EFF',
  'vision-analyze': '#9B59B6',
  'audio-transcribe': '#67C23A',
  'video-analyze': '#E6A23C',
  'conversation-memory': '#E6A23C',
  llm: '#00D4FF',
  'agent-intent': '#9B59B6',
  expert: '#9B59B6',
  tool: '#E6A23C',
  if: '#9B59B6',
  hitl: '#F56C6C',
  end: '#909399',
  'image-generate': '#FF6B35',
  'ppt-generate': '#67C23A',
  'intent-router': '#9B59B6',
  summarizer: '#409EFF',
  'requirement-analyzer': '#409EFF',
  'task-planner': '#409EFF',
  'task-chain': '#E6A23C',
  'collaboration-router': '#9B59B6',
}

export function getPaletteItem(type: AgentNodeType): AgentPaletteItem | undefined {
  const found = AGENT_PALETTE_ITEMS.find((i) => i.type === type)
  if (found) return found
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
  if (type === 'tool') {
    return {
      type: 'tool',
      label: '工具',
      icon: 'set-up',
      category: 'tools',
      description: '从插件中心选择 MCP / 内置工具',
      defaultData: { label: '工具' },
    }
  }
  return undefined
}
