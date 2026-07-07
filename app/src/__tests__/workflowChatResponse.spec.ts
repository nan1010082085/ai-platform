import { describe, it, expect } from 'vitest'
import type { AgentWorkflowExecution } from '@/types/agentWorkflow'
import { extractWorkflowChatResponse, extractWorkflowStreamingText, isWorkflowHitlApprovalMessage } from '@/utils/workflowChatResponse'

function makeExecution(partial: Partial<AgentWorkflowExecution>): AgentWorkflowExecution {
  return {
    id: 'exec-1',
    workflowId: 'wf-1',
    workflowName: 'Test',
    versionId: null,
    version: '20260101000000',
    status: 'success',
    trigger: 'manual',
    startedAt: new Date().toISOString(),
    nodeRecords: [],
    ...partial,
  }
}

describe('workflowChatResponse', () => {
  it('prefers last assistant conversation turn', () => {
    const text = extractWorkflowChatResponse(makeExecution({
      conversationHistory: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'world' },
      ],
    }))
    expect(text).toBe('world')
  })

  it('falls back to llm node output', () => {
    const text = extractWorkflowChatResponse(makeExecution({
      nodeRecords: [{
        nodeId: 'llm-1',
        nodeType: 'llm',
        nodeName: 'LLM',
        status: 'success',
        output: { text: 'generated' },
      }],
    }))
    expect(text).toBe('generated')
  })

  it('detects hitl approval keywords', () => {
    expect(isWorkflowHitlApprovalMessage('确认')).toBe(true)
    expect(isWorkflowHitlApprovalMessage('拒绝')).toBe(false)
    expect(isWorkflowHitlApprovalMessage('请继续处理')).toBe(null)
  })

  it('reads partial streaming output from execution', () => {
    const text = extractWorkflowStreamingText(makeExecution({
      status: 'running',
      streamingOutput: {
        nodeId: 'llm-1',
        nodeType: 'llm',
        text: 'partial',
        updatedAt: new Date().toISOString(),
      },
    }))
    expect(text).toBe('partial')
  })
})
