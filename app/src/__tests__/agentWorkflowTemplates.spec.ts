import { describe, it, expect } from 'vitest'
import {
  AGENT_WORKFLOW_TEMPLATES,
  createAgentWorkflowGraphByTemplate,
  createCsKbReplyWorkflowGraph,
  createCsSentimentEscalateWorkflowGraph,
  createCsTicketTriageWorkflowGraph,
  createDocImageRecognitionWorkflowGraph,
  createDocumentSummaryWorkflowGraph,
  createIntelligentAssistantWorkflowGraph,
  validateAgentWorkflowGraph,
} from '@schema-platform/platform-shared/ai'

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
    expect(rag?.type).toBe('tool')
    expect(rag?.data?.toolName).toBe('rag__search')
    expect(validateAgentWorkflowGraph(graph).every((i) => i.level !== 'error')).toBe(true)
  })

  it('createAgentWorkflowGraphByTemplate resolves all template ids', () => {
    for (const tpl of AGENT_WORKFLOW_TEMPLATES) {
      const graph = createAgentWorkflowGraphByTemplate(tpl.id)
      expect(graph.nodes.length).toBeGreaterThan(0)
    }
  })

  it('includes customer-service industry templates', () => {
    const cs = AGENT_WORKFLOW_TEMPLATES.filter((t) => t.category === 'customer-service')
    expect(cs.map((t) => t.id).sort()).toEqual([
      'cs-kb-reply',
      'cs-sentiment-escalate',
      'cs-ticket-triage',
    ])
    for (const tpl of cs) {
      const graph = createAgentWorkflowGraphByTemplate(tpl.id)
      expect(validateAgentWorkflowGraph(graph).every((i) => i.level !== 'error')).toBe(true)
    }
  })

  it('includes audit templates with HITL branch', () => {
    const audit = AGENT_WORKFLOW_TEMPLATES.filter((t) => t.category === 'audit')
    expect(audit.map((t) => t.id).sort()).toEqual([
      'content-compliance',
      'contract-risk-tag',
      'faq-quality-check',
    ])
    for (const tpl of audit) {
      const graph = createAgentWorkflowGraphByTemplate(tpl.id)
      expect(graph.nodes.some((n) => n.type === 'hitl')).toBe(true)
      expect(validateAgentWorkflowGraph(graph).every((i) => i.level !== 'error')).toBe(true)
    }
  })

  it('includes generic data/integration templates', () => {
    const ids = AGENT_WORKFLOW_TEMPLATES.map((t) => t.id)
    expect(ids).toContain('excel-report')
    expect(ids).toContain('multi-doc-compare')
    expect(ids).toContain('structured-extract')
    expect(ids).toContain('webhook-batch-dispatch')
    const batch = createAgentWorkflowGraphByTemplate('webhook-batch-dispatch')
    expect(batch.nodes.some((n) => n.type === 'task-planner')).toBe(true)
    expect(batch.nodes.some((n) => n.type === 'task-chain')).toBe(true)
    expect(batch.nodes.some((n) => n.type === 'summarizer')).toBe(true)
    expect(validateAgentWorkflowGraph(batch).every((i) => i.level !== 'error')).toBe(true)
  })

  it('includes multimodal templates producing copy/script via LLM', () => {
    const ids = AGENT_WORKFLOW_TEMPLATES.map((t) => t.id)
    expect(ids).toContain('multimodal-image-text')
    expect(ids).toContain('multimodal-video-promo')

    const imageText = createAgentWorkflowGraphByTemplate('multimodal-image-text')
    expect(imageText.nodes.filter((n) => n.type === 'llm').length).toBeGreaterThanOrEqual(2)
    expect(validateAgentWorkflowGraph(imageText).every((i) => i.level !== 'error')).toBe(true)

    const videoPromo = createAgentWorkflowGraphByTemplate('multimodal-video-promo')
    expect(videoPromo.nodes.filter((n) => n.type === 'llm').length).toBeGreaterThanOrEqual(2)
    expect(validateAgentWorkflowGraph(videoPromo).every((i) => i.level !== 'error')).toBe(true)
  })

  it('includes handoff and form-query demo templates', () => {
    const ids = AGENT_WORKFLOW_TEMPLATES.map((t) => t.id)
    expect(ids).toContain('handoff-demo')
    expect(ids).toContain('form-query-demo')
    const handoff = createAgentWorkflowGraphByTemplate('handoff-demo')
    expect(handoff.nodes.some((n) => n.type === 'handoff')).toBe(true)
    expect(validateAgentWorkflowGraph(handoff).every((i) => i.level !== 'error')).toBe(true)
    const formQ = createAgentWorkflowGraphByTemplate('form-query-demo')
    expect(formQ.nodes.some((n) => n.type === 'form-query')).toBe(true)
    expect(validateAgentWorkflowGraph(formQ).every((i) => i.level !== 'error')).toBe(true)
  })

  it('cs-ticket-triage classifies then branches', () => {
    const graph = createCsTicketTriageWorkflowGraph()
    expect(graph.entryNodeId).toBe('webhook-1')
    expect(graph.nodes.some((n) => n.type === 'llm')).toBe(true)
    expect(graph.nodes.some((n) => n.type === 'if')).toBe(true)
    expect(graph.edges.filter((e) => e.data?.branch).length).toBe(2)
  })

  it('cs-kb-reply uses RAG then LLM', () => {
    const graph = createCsKbReplyWorkflowGraph()
    const rag = graph.nodes.find((n) => n.id === 'rag-1')
    expect(rag?.type).toBe('tool')
    expect(rag?.data?.toolName).toBe('rag__search')
    expect(graph.nodes.some((n) => n.type === 'llm')).toBe(true)
  })

  it('cs-sentiment-escalate escalates negative via HITL', () => {
    const graph = createCsSentimentEscalateWorkflowGraph()
    expect(graph.nodes.some((n) => n.type === 'hitl')).toBe(true)
    expect(graph.edges.some((e) => e.target === 'hitl-1' && e.data?.branch === 'true')).toBe(true)
  })

  it('layout keeps sequential template nodes separated horizontally', () => {
    const graph = createDocumentSummaryWorkflowGraph()
    const xs = graph.nodes.map((n) => n.position.x).sort((a, b) => a - b)
    for (let i = 1; i < xs.length; i += 1) {
      expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(300)
    }
  })
})
