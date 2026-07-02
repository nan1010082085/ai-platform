import type { AgentWorkflowExecution } from '@/types/agentWorkflow'

function extractTextFromOutput(output: unknown): string | null {
  if (output == null) return null
  if (typeof output === 'string') return output.trim() || null
  if (typeof output !== 'object') return null

  const record = output as Record<string, unknown>
  if (typeof record.text === 'string' && record.text.trim()) return record.text
  if (typeof record.message === 'string' && record.message.trim()) return record.message
  if (typeof record.content === 'string' && record.content.trim()) return record.content

  try {
    return JSON.stringify(output, null, 2)
  } catch {
    return null
  }
}

export function extractWorkflowChatResponse(exec: AgentWorkflowExecution): string {
  const history = exec.conversationHistory ?? []
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i]
    if (turn.role === 'assistant' && turn.content.trim()) {
      return turn.content
    }
  }

  for (let i = exec.nodeRecords.length - 1; i >= 0; i -= 1) {
    const record = exec.nodeRecords[i]
    if (record.nodeType === 'llm' && record.status === 'success') {
      const text = extractTextFromOutput(record.output)
      if (text) return text
    }
  }

  for (let i = exec.nodeRecords.length - 1; i >= 0; i -= 1) {
    const record = exec.nodeRecords[i]
    if (record.status === 'success' && record.output != null) {
      const text = extractTextFromOutput(record.output)
      if (text) return text
    }
  }

  if (exec.status === 'waiting') {
    const waiting = exec.nodeRecords.find((record) => record.status === 'waiting')
    const output = waiting?.output as { message?: string } | undefined
    return output?.message ?? '工作流等待人工确认，请回复「确认」继续或「拒绝」终止。'
  }

  if (exec.status === 'error') {
    return exec.error ?? '工作流执行失败'
  }

  return '工作流执行完成'
}

export function isWorkflowHitlApprovalMessage(content: string): boolean | null {
  const trimmed = content.trim()
  if (/^(确认|继续|approve|yes|ok)$/i.test(trimmed)) return true
  if (/^(拒绝|取消|reject|no)$/i.test(trimmed)) return false
  return null
}
