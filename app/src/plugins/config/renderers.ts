/**
 * 内置渲染器预设（builtin bundle）：组件导入 + 预设注册表数据。
 * 迁移自 components/message/RendererRegistry.ts（迁完即删，禁双轨）。
 */

import type { MessageRenderer } from '../plugins/renderers/types'
import ImageGenerateRenderer from '@/components/message/renderers/ImageGenerateRenderer.vue'
import PptGenerateRenderer from '@/components/message/renderers/PptGenerateRenderer.vue'
import RequirementRenderer from '@/components/message/renderers/RequirementRenderer.vue'
import ActionProposalRenderer from '@/components/message/renderers/ActionProposalRenderer.vue'
import ImageInlineRenderer from '@/components/message/renderers/ImageInlineRenderer.vue'
import DocumentAttachmentRenderer from '@/components/message/renderers/DocumentAttachmentRenderer.vue'
import DocumentSummaryRenderer from '@/components/message/renderers/DocumentSummaryRenderer.vue'
import WorkflowExecutionRenderer from '@/components/message/renderers/WorkflowExecutionRenderer.vue'
import CodeRenderer from '@/components/message/renderers/CodeRenderer.vue'
import ArtifactRenderer from '@/components/message/renderers/ArtifactRenderer.vue'
import ThinkingRenderer from '@/components/message/renderers/ThinkingRenderer.vue'
import ToolCallRenderer from '@/components/message/renderers/ToolCallRenderer.vue'
import SchemaResultRenderer from '@/components/message/renderers/SchemaResultRenderer.vue'
import FlowResultRenderer from '@/components/message/renderers/FlowResultRenderer.vue'
import TextRenderer from '@/components/message/renderers/TextRenderer.vue'
import SubWorkflowRenderer from '@/components/message/renderers/SubWorkflowRenderer.vue'
import AgentHandoffRenderer from '@/components/message/renderers/AgentHandoffRenderer.vue'
import CostUsageRenderer from '@/components/message/renderers/CostUsageRenderer.vue'
import ApprovalRenderer from '@/components/message/renderers/ApprovalRenderer.vue'
import VariableChangeRenderer from '@/components/message/renderers/VariableChangeRenderer.vue'
import ErrorRecoveryRenderer from '@/components/message/renderers/ErrorRecoveryRenderer.vue'
import type { StepData } from '@/types'

/** 尚未加入 StepType 联合的渲染器类型，matcher 中用此函数安全判断。 */
function isStepType(step: StepData, type: string): boolean {
  return step.type === (type as StepData['type'])
}

export const presetRenderers: MessageRenderer[] = [
  {
    type: 'image_generate',
    component: ImageGenerateRenderer,
    matcher: (step) => step.type === 'image_generate',
    priority: 10,
    emitEvents: ['image-retry', 'image-download'],
  },
  {
    type: 'ppt_generate',
    component: PptGenerateRenderer,
    matcher: (step) => step.type === 'ppt_generate',
    priority: 11,
    emitEvents: ['ppt-download', 'ppt-retry'],
  },
  {
    type: 'requirement_confirm',
    component: RequirementRenderer,
    matcher: (step) => step.type === 'requirement_confirm',
    priority: 15,
    emitEvents: ['requirement-confirm', 'requirement-answer', 'requirement-skip'],
  },
  {
    type: 'action_proposal',
    component: ActionProposalRenderer,
    matcher: (step) => step.type === 'action_proposal',
    priority: 16,
    emitEvents: ['proposal-approve', 'proposal-reject', 'proposal-toggle-item', 'proposal-toggle-all', 'proposal-modify', 'proposal-reset'],
  },
  {
    type: 'image_inline',
    component: ImageInlineRenderer,
    matcher: (step) => step.type === 'text' && /\!\[.*?\]\(.*?\)/.test(step.content ?? ''),
    priority: 18,
    emitEvents: ['image-preview'],
  },
  {
    type: 'document_attachment',
    component: DocumentAttachmentRenderer,
    matcher: (step) => isStepType(step, 'document_attachment'),
    priority: 19,
    emitEvents: ['document-download'],
  },
  {
    type: 'document_summary',
    component: DocumentSummaryRenderer,
    matcher: (step) => isStepType(step, 'document_summary'),
    priority: 20,
    emitEvents: ['document-expand'],
  },
  {
    type: 'workflow_execution',
    component: WorkflowExecutionRenderer,
    matcher: (step) => isStepType(step, 'workflow_execution'),
    priority: 21,
    emitEvents: ['workflow-retry', 'workflow-detail'],
  },
  {
    type: 'code',
    component: CodeRenderer,
    matcher: (step) => step.type === 'code',
    priority: 30,
    emitEvents: ['code-copy', 'code-insert'],
  },
  {
    type: 'artifact',
    component: ArtifactRenderer,
    matcher: (step) => step.type === 'artifact',
    priority: 25,
    emitEvents: ['artifact-sendback'],
  },
  {
    type: 'thinking',
    component: ThinkingRenderer,
    matcher: (step) => step.type === 'thinking',
    priority: 40,
  },
  {
    type: 'tool_call',
    component: ToolCallRenderer,
    matcher: (step) => step.type === 'tool_call',
    priority: 50,
    emitEvents: ['tool-retry', 'tool-expand'],
  },
  {
    type: 'tool_error',
    component: ToolCallRenderer,
    matcher: (step) => step.type === 'tool_error',
    priority: 51,
    emitEvents: ['tool-retry'],
  },
  {
    type: 'schema_result',
    component: SchemaResultRenderer,
    matcher: (step) => step.type === 'result' && step.cardType === 'schema',
    priority: 60,
    emitEvents: ['schema-publish', 'schema-preview'],
  },
  {
    type: 'flow_result',
    component: FlowResultRenderer,
    matcher: (step) => step.type === 'result' && step.cardType === 'flow',
    priority: 61,
    emitEvents: ['flow-publish', 'flow-preview'],
  },
  {
    type: 'text',
    component: TextRenderer,
    matcher: () => true,
    priority: 100,
    emitEvents: ['copy'],
  },
  {
    type: 'sub_workflow',
    component: SubWorkflowRenderer,
    matcher: (step) => step.type === 'sub_workflow',
    priority: 12,
    emitEvents: ['workflow-retry', 'workflow-detail'],
  },
  {
    type: 'agent_handoff',
    component: AgentHandoffRenderer,
    matcher: (step) => step.type === 'agent_handoff',
    priority: 13,
  },
  {
    type: 'cost_usage',
    component: CostUsageRenderer,
    matcher: (step) => step.type === 'cost_usage',
    priority: 14,
  },
  {
    type: 'approval_gate',
    component: ApprovalRenderer,
    matcher: (step) => step.type === 'approval_gate',
    priority: 15,
    emitEvents: ['approval-approve', 'approval-reject', 'approval-answer'],
  },
  {
    type: 'variable_change',
    component: VariableChangeRenderer,
    matcher: (step) => step.type === 'variable_change',
    priority: 22,
  },
  {
    type: 'error_recovery',
    component: ErrorRecoveryRenderer,
    matcher: (step) => step.type === 'error_recovery',
    priority: 23,
    emitEvents: ['error-retry', 'error-skip', 'error-rollback'],
  },
]
