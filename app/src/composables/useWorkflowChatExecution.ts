import {
  continueExecution,
  executeWorkflow,
  getExecution,
  resumeExecution,
} from '@/api/agentWorkflowApi'
import type { AgentWorkflowExecution } from '@/types/agentWorkflow'
import type { MessageDocumentAttachment } from '@/types'
import { extractWorkflowChatResponse } from '@/utils/workflowChatResponse'

const TERMINAL_STATUSES = new Set(['success', 'error', 'waiting', 'cancelled'])

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function buildWorkflowInput(
  message: string,
  attachments?: MessageDocumentAttachment[],
): Record<string, unknown> {
  const input: Record<string, unknown> = { message }
  if (attachments?.length) {
    input.documentAttachments = attachments
    input.documentIds = attachments.map((item) => item.documentId)
  }
  return input
}

export async function pollWorkflowExecution(
  executionId: string,
  isAborted: () => boolean,
): Promise<AgentWorkflowExecution> {
  while (true) {
    if (isAborted()) {
      throw new Error('已停止生成')
    }

    const execution = await getExecution(executionId)
    if (TERMINAL_STATUSES.has(execution.status)) {
      return execution
    }

    await sleep(1500)
  }
}

export async function runWorkflowChatTurn(params: {
  workflowId: string
  message: string
  attachments?: MessageDocumentAttachment[]
  lastExecutionId: string | null
  pendingExecutionId: string | null
  hitlApproved?: boolean
  isAborted?: () => boolean
  onExecutionStarted?: (executionId: string) => void
}): Promise<{
  execution: AgentWorkflowExecution
  responseText: string
  lastExecutionId: string | null
  pendingExecutionId: string | null
}> {
  const input = buildWorkflowInput(params.message, params.attachments)
  let started: AgentWorkflowExecution

  if (params.pendingExecutionId) {
    started = await resumeExecution(params.pendingExecutionId, {
      approved: params.hitlApproved !== false,
      comment: params.message,
    })
  } else if (params.lastExecutionId) {
    started = await continueExecution(params.lastExecutionId, input)
  } else {
    started = await executeWorkflow(params.workflowId, input)
  }

  params.onExecutionStarted?.(started.id)

  const execution = await pollWorkflowExecution(
    started.id,
    params.isAborted ?? (() => false),
  )

  return {
    execution,
    responseText: extractWorkflowChatResponse(execution),
    lastExecutionId: execution.id,
    pendingExecutionId: execution.status === 'waiting' ? execution.id : null,
  }
}
