/**
 * 内置节点属性面板表（由 node-panels 插件 register）。
 * 迁自原 useAgentNodePropertyPanel 静态 Map；迁完禁止在 composable 再堆 Map。
 */

import { markRaw, type Component } from 'vue'
import type { AgentNodeType } from '@/types/agentWorkflow'
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
import MemoryRecallNodePanel from '@/components/agent-workflow/property-panel/panels/MemoryRecallNodePanel.vue'
import MemoryWriteNodePanel from '@/components/agent-workflow/property-panel/panels/MemoryWriteNodePanel.vue'
import MemoryExtractNodePanel from '@/components/agent-workflow/property-panel/panels/MemoryExtractNodePanel.vue'
import HandoffNodePanel from '@/components/agent-workflow/property-panel/panels/HandoffNodePanel.vue'
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
import CodeExecuteNodePanel from '@/components/agent-workflow/property-panel/panels/CodeExecuteNodePanel.vue'
import VariableSetNodePanel from '@/components/agent-workflow/property-panel/panels/VariableSetNodePanel.vue'
import SwitchNodePanel from '@/components/agent-workflow/property-panel/panels/SwitchNodePanel.vue'
import MergeNodePanel from '@/components/agent-workflow/property-panel/panels/MergeNodePanel.vue'
import ScheduleTriggerNodePanel from '@/components/agent-workflow/property-panel/panels/ScheduleTriggerNodePanel.vue'
import AgentTeamNodePanel from '@/components/agent-workflow/property-panel/panels/AgentTeamNodePanel.vue'
import ApprovalAnalyzeNodePanel from '@/components/agent-workflow/property-panel/panels/ApprovalAnalyzeNodePanel.vue'
import FlowInteractNodePanel from '@/components/agent-workflow/property-panel/panels/FlowInteractNodePanel.vue'
import ComplianceCheckNodePanel from '@/components/agent-workflow/property-panel/panels/ComplianceCheckNodePanel.vue'
import ModuleAssembleNodePanel from '@/components/agent-workflow/property-panel/panels/ModuleAssembleNodePanel.vue'
import FormQueryNodePanel from '@/components/agent-workflow/property-panel/panels/FormQueryNodePanel.vue'
import AnomalyDetectNodePanel from '@/components/agent-workflow/property-panel/panels/AnomalyDetectNodePanel.vue'
import ChartGenerateNodePanel from '@/components/agent-workflow/property-panel/panels/ChartGenerateNodePanel.vue'

const toolPanel = markRaw(ToolNodePanel)
const agentPanel = markRaw(AgentNodePanel)
const expertPluginPanel = markRaw(ExpertPluginNodePanel)

/** 内置节点面板注册表 */
export const BUILTIN_NODE_PANELS: Array<[AgentNodeType, Component]> = [
  ['manual-trigger', markRaw(TriggerNodePanel)],
  ['webhook-trigger', markRaw(WebhookTriggerNodePanel)],
  ['schedule-trigger', markRaw(ScheduleTriggerNodePanel)],
  ['agent-team', markRaw(AgentTeamNodePanel)],
  ['approval-analyze', markRaw(ApprovalAnalyzeNodePanel)],
  ['flow-interact', markRaw(FlowInteractNodePanel)],
  ['compliance-check', markRaw(ComplianceCheckNodePanel)],
  ['module-assemble', markRaw(ModuleAssembleNodePanel)],
  ['form-query', markRaw(FormQueryNodePanel)],
  ['anomaly-detect', markRaw(AnomalyDetectNodePanel)],
  ['chart-generate', markRaw(ChartGenerateNodePanel)],
  ['document-parse', markRaw(DocumentParseNodePanel)],
  ['vision-analyze', markRaw(VisionAnalyzeNodePanel)],
  ['audio-transcribe', markRaw(AudioTranscribeNodePanel)],
  ['video-analyze', markRaw(VideoAnalyzeNodePanel)],
  ['conversation-memory', markRaw(ConversationMemoryNodePanel)],
  ['memory-recall', markRaw(MemoryRecallNodePanel)],
  ['memory-write', markRaw(MemoryWriteNodePanel)],
  ['memory-extract', markRaw(MemoryExtractNodePanel)],
  ['handoff', markRaw(HandoffNodePanel)],
  ['llm', markRaw(LlmNodePanel)],
  ['agent-intent', agentPanel],
  ['tool', toolPanel],
  ['expert', expertPluginPanel],
  ['if', markRaw(IfNodePanel)],
  ['merge', markRaw(MergeNodePanel)],
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
  ['code-execute', markRaw(CodeExecuteNodePanel)],
  ['variable-set', markRaw(VariableSetNodePanel)],
  ['switch', markRaw(SwitchNodePanel)],
]
