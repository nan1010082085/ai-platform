import { describe, it, expect } from 'vitest'
import type { AgentWorkflowExecution } from '@/types/agentWorkflow'
import {
  buildWorkflowMessageExecution,
  getWorkflowNodeDisplayName,
} from '@/utils/workflowMessageExecution'

function makeExecution(partial: Partial<AgentWorkflowExecution>): AgentWorkflowExecution {
  return {
    id: 'exec-1',
    workflowId: 'wf-1',
    workflowName: '文档摘要',
    versionId: null,
    version: '20260101000000',
    status: 'running',
    trigger: 'chat',
    startedAt: new Date().toISOString(),
    nodeRecords: [],
    ...partial,
  }
}

describe('workflowMessageExecution', () => {
  it('maps execution snapshot for chat message', () => {
    const snapshot = buildWorkflowMessageExecution(makeExecution({
      nodeRecords: [{
        nodeId: 'llm-1',
        nodeType: 'llm',
        nodeName: 'LLM',
        status: 'running',
      }],
      streamingOutput: {
        nodeId: 'llm-1',
        nodeType: 'llm',
        text: 'hello',
        updatedAt: new Date().toISOString(),
      },
    }))

    expect(snapshot.executionId).toBe('exec-1')
    expect(snapshot.workflowName).toBe('文档摘要')
    expect(snapshot.streamingNodeId).toBe('llm-1')
    expect(snapshot.nodeRecords).toHaveLength(1)
  })

  it('prefers node name over type label', () => {
    expect(getWorkflowNodeDisplayName({
      nodeId: 'n1',
      nodeType: 'llm',
      nodeName: '总结回复',
    })).toBe('总结回复')
  })

  it('falls back to node type when name equals id', () => {
    expect(getWorkflowNodeDisplayName({
      nodeId: 'llm-1',
      nodeType: 'llm',
      nodeName: 'llm-1',
    })).toBe('llm')
  })
})
