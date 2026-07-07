/**
 * Agent 工作流类型 — 统一从 @schema-platform/ai-shared 导出。
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
} from '@schema-platform/ai-shared'

export {
  createDefaultAgentWorkflowGraph,
  createDocumentSummaryWorkflowGraph,
  createDocImageRecognitionWorkflowGraph,
  createIntelligentAssistantWorkflowGraph,
  createAgentWorkflowGraphByTemplate,
  layoutAgentWorkflowGraph,
  validateAgentWorkflowGraph,
  AGENT_WORKFLOW_TEMPLATES,
} from '@schema-platform/ai-shared'
