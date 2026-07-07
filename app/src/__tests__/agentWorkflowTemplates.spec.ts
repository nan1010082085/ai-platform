import { describe, it, expect } from 'vitest'
import {
  AGENT_WORKFLOW_TEMPLATES,
  createAgentWorkflowGraphByTemplate,
  createDocImageRecognitionWorkflowGraph,
  createDocumentSummaryWorkflowGraph,
  createIntelligentAssistantWorkflowGraph,
  validateAgentWorkflowGraph,
} from '@schema-platform/ai-shared'

describe('agent workflow templates', () => {
  it('includes doc-image and assistant templates', () => {
    const ids = AGENT_WORKFLOW_TEMPLATES.map((t) => t.id)
    expect(ids).toContain('doc-image-recognition')
    expect(ids).toContain('intelligent-assistant')
  })

  it('doc-image graph includes vision-analyze node', () => {
    const graph = createDocImageRecognitionWorkflowGraph()
    expect(graph.nodes.some((n) => n.type === 'vision-analyze')).toBe(true)
    expect(graph.nodes.some((n) => n.type === 'document-parse')).toBe(true)
    expect(graph.nodes.some((n) => n.type === 'if')).toBe(true)
    expect(graph.edges.some((e) => e.data?.branch === 'true')).toBe(true)
    expect(validateAgentWorkflowGraph(graph).every((i) => i.level !== 'error')).toBe(true)
  })

  it('doc-image graph uses upload stream by default', () => {
    const graph = createDocImageRecognitionWorkflowGraph()
    const parse = graph.nodes.find((n) => n.type === 'document-parse')
    const vision = graph.nodes.find((n) => n.type === 'vision-analyze')
    expect(parse?.data?.documentSource).toBe('stream')
    expect(parse?.data?.streamField).toBe('file')
    expect(vision?.data?.documentSource).toBe('stream')
  })

  it('assistant graph uses conversation memory and LLM history', () => {
    const graph = createIntelligentAssistantWorkflowGraph()
    const memory = graph.nodes.find((n) => n.type === 'conversation-memory')
    const llm = graph.nodes.find((n) => n.id === 'llm-1')
    expect(memory?.data?.memoryMode).toBe('append')
    expect(llm?.data?.useConversationHistory).toBe(true)
    expect(llm?.data?.appendAssistantReply).toBe(true)
  })

  it('assistant graph uses RAG tool then LLM', () => {
    const graph = createIntelligentAssistantWorkflowGraph()
    const rag = graph.nodes.find((n) => n.id === 'rag-1')
    expect(rag?.type).toBe('tool-mcp-rag')
    expect(rag?.data?.toolName).toBe('rag__search')
    expect(validateAgentWorkflowGraph(graph).every((i) => i.level !== 'error')).toBe(true)
  })

  it('createAgentWorkflowGraphByTemplate resolves all template ids', () => {
    for (const tpl of AGENT_WORKFLOW_TEMPLATES) {
      const graph = createAgentWorkflowGraphByTemplate(tpl.id)
      expect(graph.nodes.length).toBeGreaterThan(0)
    }
  })

  it('layout keeps sequential template nodes separated horizontally', () => {
    const graph = createDocumentSummaryWorkflowGraph()
    const xs = graph.nodes.map((n) => n.position.x).sort((a, b) => a - b)
    for (let i = 1; i < xs.length; i += 1) {
      expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(300)
    }
  })
})
