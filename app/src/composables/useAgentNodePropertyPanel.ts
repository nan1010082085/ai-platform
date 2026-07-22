import { markRaw, type Component } from 'vue'
import type { AgentNodeType } from '@/types/agentWorkflow'
import { getToolNodeTypeLabel } from '@/constants/toolNodeTypes'
import { getExpertNodeTypeLabel } from '@/constants/expertNodeTypes'
import DefaultNodePanel from '@/components/agent-workflow/property-panel/panels/DefaultNodePanel.vue'
import TriggerNodePanel from '@/components/agent-workflow/property-panel/panels/TriggerNodePanel.vue'
import WebhookTriggerNodePanel from '@/components/agent-workflow/property-panel/panels/WebhookTriggerNodePanel.vue'
import LlmNodePanel from '@/components/agent-workflow/property-panel/panels/LlmNodePanel.vue'
import AgentNodePanel from '@/components/agent-workflow/property-panel/panels/AgentNodePanel.vue'
import ToolNodePanel from '@/components/agent-workflow/property-panel/panels/ToolNodePanel.vue'
import IfNodePanel from '@/components/agent-workflow/property-panel/panels/IfNodePanel.vue'
import HitlNodePanel from '@/components/agent-workflow/property-panel/panels/HitlNodePanel.vue'
import DocumentParseNodePanel from '@/components/agent-workflow/property-panel/panels/DocumentParseNodePanel.vue'
import VisionAnalyzeNodePanel from '@/components/agent-workflow/property-panel/panels/VisionAnalyzeNodePanel.vue'
import AudioTranscribeNodePanel from '@/components/agent-workflow/property-panel/panels/AudioTranscribeNodePanel.vue'
import VideoAnalyzeNodePanel from '@/components/agent-workflow/property-panel/panels/VideoAnalyzeNodePanel.vue'
import ConversationMemoryNodePanel from '@/components/agent-workflow/property-panel/panels/ConversationMemoryNodePanel.vue'
import ExpertPluginNodePanel from '@/components/agent-workflow/property-panel/panels/ExpertPluginNodePanel.vue'
import ImageGenerateNodePanel from '@/components/agent-workflow/property-panel/panels/ImageGenerateNodePanel.vue'
import VideoGenerateNodePanel from '@/components/agent-workflow/property-panel/panels/VideoGenerateNodePanel.vue'
import PptGenerateNodePanel from '@/components/agent-workflow/property-panel/panels/PptGenerateNodePanel.vue'
import EndNodePanel from '@/components/agent-workflow/property-panel/panels/EndNodePanel.vue'
import IntentRouterNodePanel from '@/components/agent-workflow/property-panel/panels/IntentRouterNodePanel.vue'
import SummarizerNodePanel from '@/components/agent-workflow/property-panel/panels/SummarizerNodePanel.vue'
import RequirementAnalyzerNodePanel from '@/components/agent-workflow/property-panel/panels/RequirementAnalyzerNodePanel.vue'
import TaskPlannerNodePanel from '@/components/agent-workflow/property-panel/panels/TaskPlannerNodePanel.vue'
import TaskChainNodePanel from '@/components/agent-workflow/property-panel/panels/TaskChainNodePanel.vue'
import CollaborationRouterNodePanel from '@/components/agent-workflow/property-panel/panels/CollaborationRouterNodePanel.vue'
import AgentLoopNodePanel from '@/components/agent-workflow/property-panel/panels/AgentLoopNodePanel.vue'

const toolPanel = markRaw(ToolNodePanel)
const agentPanel = markRaw(AgentNodePanel)
const expertPluginPanel = markRaw(ExpertPluginNodePanel)

const registry = new Map<AgentNodeType, Component>([
  ['manual-trigger', markRaw(TriggerNodePanel)],
  ['webhook-trigger', markRaw(WebhookTriggerNodePanel)],
  ['document-parse', markRaw(DocumentParseNodePanel)],
  ['vision-analyze', markRaw(VisionAnalyzeNodePanel)],
  ['audio-transcribe', markRaw(AudioTranscribeNodePanel)],
  ['video-analyze', markRaw(VideoAnalyzeNodePanel)],
  ['conversation-memory', markRaw(ConversationMemoryNodePanel)],
  ['llm', markRaw(LlmNodePanel)],
  ['agent-intent', agentPanel],
  ['tool', toolPanel],
  ['expert', expertPluginPanel],
  ['if', markRaw(IfNodePanel)],
  ['hitl', markRaw(HitlNodePanel)],
  ['end', markRaw(EndNodePanel)],
  ['image-generate', markRaw(ImageGenerateNodePanel)],
  ['video-generate', markRaw(VideoGenerateNodePanel)],
  ['ppt-generate', markRaw(PptGenerateNodePanel)],
  ['intent-router', markRaw(IntentRouterNodePanel)],
  ['summarizer', markRaw(SummarizerNodePanel)],
  ['requirement-analyzer', markRaw(RequirementAnalyzerNodePanel)],
  ['task-planner', markRaw(TaskPlannerNodePanel)],
  ['task-chain', markRaw(TaskChainNodePanel)],
  ['collaboration-router', markRaw(CollaborationRouterNodePanel)],
  ['agent-loop', markRaw(AgentLoopNodePanel)],
])

export const AGENT_NODE_TYPE_LABELS: Record<string, string> = {
  'manual-trigger': '手动触发',
  'webhook-trigger': 'Webhook 触发',
  'document-parse': '文档解析',
  'vision-analyze': '图片视觉分析',
  'audio-transcribe': '音频转录',
  'video-analyze': '视频分析',
  'conversation-memory': '对话记忆',
  llm: 'LLM',
  'agent-intent': getExpertNodeTypeLabel('agent-intent') ?? '意图识别',
  tool: getToolNodeTypeLabel('tool') ?? '工具',
  expert: '插件专家',
  if: '条件分支',
  hitl: '人工确认',
  end: '结束',
  'image-generate': '图片生成',
  'video-generate': '视频生成',
  'ppt-generate': 'PPT 生成',
  'intent-router': '意图路由',
  summarizer: '多步总结',
  'requirement-analyzer': '需求分析',
  'task-planner': '任务规划',
  'task-chain': '任务链',
  'collaboration-router': '协作路由',
  'agent-loop': '智能体循环',
}

export function useAgentNodePropertyPanel() {
  function getPanelComponent(nodeType: string): Component {
    return registry.get(nodeType as AgentNodeType) ?? DefaultNodePanel
  }

  function getNodeTypeLabel(nodeType: string): string {
    return AGENT_NODE_TYPE_LABELS[nodeType] ?? nodeType
  }

  return { getPanelComponent, getNodeTypeLabel }
}
