import type { AgentWorkflowExecution } from '@/types/agentWorkflow'
import type { WorkflowMessageExecution } from '@/types'

export function buildWorkflowMessageExecution(
  execution: AgentWorkflowExecution,
): WorkflowMessageExecution {
  return {
    executionId: execution.id,
    workflowName: execution.workflowName,
    status: execution.status,
    nodeRecords: execution.nodeRecords,
    streamingNodeId: execution.streamingOutput?.nodeId ?? null,
  }
}

export function getWorkflowNodeDisplayName(record: {
  nodeId: string
  nodeType: string
  nodeName: string
}): string {
  const name = record.nodeName?.trim()
  if (name && name !== record.nodeId) return name
  return record.nodeType
}
