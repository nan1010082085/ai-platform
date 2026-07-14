/**
 * Agent 工作流类型 — 统一从 @schema-platform/platform-shared/ai 导出。
 * 保留此文件作为 app 内 @/types/agentWorkflow 入口，避免全量改 import 路径。
 */

export type {
  ExpertNodeType,
  AgentHitlConfirmQuestion,
  AgentNodeType,
  AgentWorkflowStatus,
  AgentExecutionStatus,
  AgentNodeRecordStatus,
  AgentWorkflowNodeData,
  ImageGenerateNodeData,
  TaskPlanStep,
  IntentRouterNodeData,
  SummarizerNodeData,
  RequirementAnalyzerNodeData,
  TaskPlannerNodeData,
  TaskChainNodeData,
  CollaborationRouterNodeData,
  AgentWorkflowNode,
  AgentWorkflowEdge,
  AgentWorkflowGraph,
  AgentWorkflowSummary,
  AgentWorkflowDetail,
  AgentWorkflowPublishResult,
  AgentWorkflowVersionEntry,
  AgentWorkflowVersionDetail,
  AgentNodeRecord,
  AgentWorkflowExecution,
  AgentWorkflowValidationIssue,
  AgentWorkflowTemplateId,
  AgentWorkflowTemplateMeta,
  AgentConversationTurn,
} from '@schema-platform/platform-shared/ai'

export {
  createDefaultAgentWorkflowGraph,
  createDefaultNodeData,
  createDocumentSummaryWorkflowGraph,
  createDocImageRecognitionWorkflowGraph,
  createIntelligentAssistantWorkflowGraph,
  createAgentWorkflowGraphByTemplate,
  layoutAgentWorkflowGraph,
  validateAgentWorkflowGraph,
  AGENT_WORKFLOW_TEMPLATES,
} from '@schema-platform/platform-shared/ai'
