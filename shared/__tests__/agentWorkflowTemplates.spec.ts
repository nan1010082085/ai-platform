import { describe, it, expect } from 'vitest'
import {
  createDefaultAgentWorkflowGraph,
  createDocumentSummaryWorkflowGraph,
  createDocImageRecognitionWorkflowGraph,
  createIntelligentAssistantWorkflowGraph,
  createContractExtractWorkflowGraph,
  createKbFaqWorkflowGraph,
  createHttpNotifyWorkflowGraph,
  createRagIngestQaWorkflowGraph,
  createMultiDocBatchWorkflowGraph,
  createAgentWorkflowGraphByTemplate,
  validateAgentWorkflowGraph,
  AGENT_WORKFLOW_TEMPLATES,
  type AgentWorkflowGraph,
  type AgentWorkflowTemplateId,
} from '../agentWorkflow'

/** 每个模板工厂共用的基础断言 */
function expectValidGraph(graph: AgentWorkflowGraph, expectedEntryId?: string) {
  expect(graph.nodes.length).toBeGreaterThan(0)
  expect(graph.edges.length).toBeGreaterThan(0)
  expect(graph.entryNodeId).toBeTruthy()
  if (expectedEntryId) {
    expect(graph.entryNodeId).toBe(expectedEntryId)
  }
  // entryNodeId 必须对应一个真实节点
  expect(graph.nodes.some((n) => n.id === graph.entryNodeId)).toBe(true)
  // 每条 edge 的 source / target 都必须存在
  const nodeIds = new Set(graph.nodes.map((n) => n.id))
  for (const edge of graph.edges) {
    expect(nodeIds.has(edge.source)).toBe(true)
    expect(nodeIds.has(edge.target)).toBe(true)
  }
  // 每个节点必须有 label
  for (const node of graph.nodes) {
    expect(node.data.label?.trim()).toBeTruthy()
  }
}

/** 按类型收集节点 */
function nodesByType(graph: AgentWorkflowGraph, type: string) {
  return graph.nodes.filter((n) => n.type === type)
}

describe('agentWorkflow templates', () => {
  // ─────────────────── 现有模板 ───────────────────

  describe('createDefaultAgentWorkflowGraph (blank)', () => {
    it('返回 trigger → llm → end 三节点 DAG', () => {
      const g = createDefaultAgentWorkflowGraph()
      expectValidGraph(g, 'trigger-1')
      expect(nodesByType(g, 'manual-trigger')).toHaveLength(1)
      expect(nodesByType(g, 'llm')).toHaveLength(1)
      expect(nodesByType(g, 'end')).toHaveLength(1)
    })
  })

  describe('createDocumentSummaryWorkflowGraph', () => {
    it('返回 webhook → parse → llm → end DAG', () => {
      const g = createDocumentSummaryWorkflowGraph()
      expectValidGraph(g, 'webhook-1')
      expect(nodesByType(g, 'webhook-trigger')).toHaveLength(1)
      expect(nodesByType(g, 'document-parse')).toHaveLength(1)
      expect(nodesByType(g, 'llm')).toHaveLength(1)
      expect(nodesByType(g, 'end')).toHaveLength(1)
    })
  })

  describe('createDocImageRecognitionWorkflowGraph', () => {
    it('包含 if 分支：OCR 走 vision，文档走 llm-doc', () => {
      const g = createDocImageRecognitionWorkflowGraph()
      expectValidGraph(g, 'trigger-1')
      expect(nodesByType(g, 'if')).toHaveLength(1)
      expect(nodesByType(g, 'vision-analyze')).toHaveLength(1)
      // 两个 llm 节点：图片结构化 + 文档结构化
      expect(nodesByType(g, 'llm')).toHaveLength(2)
      // if 的 true/false 分支 edge
      const branchEdges = g.edges.filter((e) => e.data?.branch)
      expect(branchEdges).toHaveLength(2)
    })
  })

  describe('createIntelligentAssistantWorkflowGraph', () => {
    it('返回 trigger → memory → rag → llm → end DAG', () => {
      const g = createIntelligentAssistantWorkflowGraph()
      expectValidGraph(g, 'trigger-1')
      expect(nodesByType(g, 'conversation-memory')).toHaveLength(1)
      expect(nodesByType(g, 'tool')).toHaveLength(1)
      expect(nodesByType(g, 'llm')).toHaveLength(1)
      const ragNode = g.nodes.find((n) => n.id === 'rag-1')
      expect(ragNode?.data.toolCategory).toBe('mcp-rag')
      expect(ragNode?.data.toolName).toBe('rag__search')
    })
  })

  // ─────────────────── 新增模板 ───────────────────

  describe('createContractExtractWorkflowGraph', () => {
    it('返回 webhook → parse → llm → end 四节点 DAG', () => {
      const g = createContractExtractWorkflowGraph()
      expectValidGraph(g, 'webhook-1')
      expect(nodesByType(g, 'webhook-trigger')).toHaveLength(1)
      expect(nodesByType(g, 'document-parse')).toHaveLength(1)
      expect(nodesByType(g, 'llm')).toHaveLength(1)
      expect(nodesByType(g, 'end')).toHaveLength(1)
    })

    it('LLM prompt 包含合同提取关键词', () => {
      const g = createContractExtractWorkflowGraph()
      const llm = g.nodes.find((n) => n.type === 'llm')!
      expect(llm.data.prompt).toContain('条款')
      expect(llm.data.systemPrompt).toContain('合同')
    })

    it('验证通过无 error 级 issue', () => {
      const g = createContractExtractWorkflowGraph()
      const issues = validateAgentWorkflowGraph(g)
      expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)
    })
  })

  describe('createKbFaqWorkflowGraph', () => {
    it('返回 webhook → parse → llm → rag-write → end 五节点 DAG', () => {
      const g = createKbFaqWorkflowGraph()
      expectValidGraph(g, 'webhook-1')
      expect(nodesByType(g, 'webhook-trigger')).toHaveLength(1)
      expect(nodesByType(g, 'document-parse')).toHaveLength(1)
      expect(nodesByType(g, 'llm')).toHaveLength(1)
      expect(nodesByType(g, 'tool')).toHaveLength(1)
      expect(nodesByType(g, 'end')).toHaveLength(1)
    })

    it('rag-write 节点使用 rag__ingest 工具', () => {
      const g = createKbFaqWorkflowGraph()
      const ragNode = g.nodes.find((n) => n.id === 'rag-write')!
      expect(ragNode.data.toolCategory).toBe('mcp-rag')
      expect(ragNode.data.toolName).toBe('rag__ingest')
    })

    it('LLM prompt 包含 FAQ 关键词', () => {
      const g = createKbFaqWorkflowGraph()
      const llm = g.nodes.find((n) => n.type === 'llm')!
      expect(llm.data.prompt).toContain('FAQ')
      expect(llm.data.systemPrompt).toContain('问答对')
    })

    it('验证通过无 error 级 issue', () => {
      const g = createKbFaqWorkflowGraph()
      const issues = validateAgentWorkflowGraph(g)
      expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)
    })
  })

  describe('createHttpNotifyWorkflowGraph', () => {
    it('返回 webhook → llm → notify → end 四节点 DAG', () => {
      const g = createHttpNotifyWorkflowGraph()
      expectValidGraph(g, 'webhook-1')
      expect(nodesByType(g, 'webhook-trigger')).toHaveLength(1)
      expect(nodesByType(g, 'llm')).toHaveLength(1)
      expect(nodesByType(g, 'tool')).toHaveLength(1)
      expect(nodesByType(g, 'end')).toHaveLength(1)
    })

    it('notify 节点使用 http__request 工具', () => {
      const g = createHttpNotifyWorkflowGraph()
      const notifyNode = g.nodes.find((n) => n.id === 'notify-1')!
      expect(notifyNode.data.toolCategory).toBe('workflow')
      expect(notifyNode.data.toolName).toBe('http__request')
      expect(notifyNode.data.toolArgs).toBeDefined()
    })

    it('验证通过无 error 级 issue', () => {
      const g = createHttpNotifyWorkflowGraph()
      const issues = validateAgentWorkflowGraph(g)
      expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)
    })
  })

  describe('createRagIngestQaWorkflowGraph', () => {
    it('返回含 if 分支和 hitl 节点的 DAG', () => {
      const g = createRagIngestQaWorkflowGraph()
      expectValidGraph(g, 'webhook-1')
      expect(nodesByType(g, 'webhook-trigger')).toHaveLength(1)
      expect(nodesByType(g, 'document-parse')).toHaveLength(1)
      expect(nodesByType(g, 'llm')).toHaveLength(1)
      expect(nodesByType(g, 'if')).toHaveLength(1)
      expect(nodesByType(g, 'hitl')).toHaveLength(1)
      // 两个 tool 节点：合格入库 + 强制入库
      expect(nodesByType(g, 'tool')).toHaveLength(2)
      expect(nodesByType(g, 'end')).toHaveLength(1)
    })

    it('if 节点的 true/false 分支分别指向 rag-ingest 和 hitl', () => {
      const g = createRagIngestQaWorkflowGraph()
      const branchEdges = g.edges.filter((e) => e.data?.branch)
      expect(branchEdges).toHaveLength(2)
      const trueEdge = branchEdges.find((e) => e.data?.branch === 'true')!
      const falseEdge = branchEdges.find((e) => e.data?.branch === 'false')!
      expect(trueEdge.target).toBe('rag-ingest')
      expect(falseEdge.target).toBe('hitl-1')
    })

    it('hitl 节点配置了 confirmQuestions', () => {
      const g = createRagIngestQaWorkflowGraph()
      const hitl = g.nodes.find((n) => n.type === 'hitl')!
      expect(hitl.data.confirmMessage).toBeTruthy()
      expect(hitl.data.confirmQuestions).toHaveLength(2)
      expect(hitl.data.confirmQuestions![0].options).toEqual(['入库', '丢弃'])
    })

    it('验证通过无 error 级 issue', () => {
      const g = createRagIngestQaWorkflowGraph()
      const issues = validateAgentWorkflowGraph(g)
      expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)
    })
  })

  describe('createMultiDocBatchWorkflowGraph', () => {
    it('返回 webhook → parse → llm → memory → llm-summary → end 六节点 DAG', () => {
      const g = createMultiDocBatchWorkflowGraph()
      expectValidGraph(g, 'webhook-1')
      expect(nodesByType(g, 'webhook-trigger')).toHaveLength(1)
      expect(nodesByType(g, 'document-parse')).toHaveLength(1)
      expect(nodesByType(g, 'llm')).toHaveLength(2)
      expect(nodesByType(g, 'conversation-memory')).toHaveLength(1)
      expect(nodesByType(g, 'end')).toHaveLength(1)
    })

    it('memory 节点配置为 append 模式', () => {
      const g = createMultiDocBatchWorkflowGraph()
      const mem = g.nodes.find((n) => n.type === 'conversation-memory')!
      expect(mem.data.memoryMode).toBe('append')
      expect(mem.data.contentSource).toBe('lastOutput')
    })

    it('验证通过无 error 级 issue', () => {
      const g = createMultiDocBatchWorkflowGraph()
      const issues = validateAgentWorkflowGraph(g)
      expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)
    })
  })

  // ─────────────────── 模板注册表 ───────────────────

  describe('AGENT_WORKFLOW_TEMPLATES', () => {
    it('包含全部 9 个模板（blank + 8 业务模板）', () => {
      expect(AGENT_WORKFLOW_TEMPLATES).toHaveLength(9)
    })

    it('每个模板 id 在 createAgentWorkflowGraphByTemplate 中都有对应实现', () => {
      for (const meta of AGENT_WORKFLOW_TEMPLATES) {
        const graph = createAgentWorkflowGraphByTemplate(meta.id)
        expect(graph.nodes.length).toBeGreaterThan(0)
      }
    })

    it('新增 5 个模板全部存在', () => {
      const ids = AGENT_WORKFLOW_TEMPLATES.map((t) => t.id)
      for (const expected of ['contract-extract', 'kb-faq', 'http-notify', 'rag-ingest-qa', 'multi-doc-batch'] as AgentWorkflowTemplateId[]) {
        expect(ids).toContain(expected)
      }
    })
  })

  // ─────────────────── createAgentWorkflowGraphByTemplate 分发 ───────────────────

  describe('createAgentWorkflowGraphByTemplate', () => {
    const allTemplateIds: AgentWorkflowTemplateId[] = [
      'blank',
      'document-summary',
      'doc-image-recognition',
      'intelligent-assistant',
      'contract-extract',
      'kb-faq',
      'http-notify',
      'rag-ingest-qa',
      'multi-doc-batch',
    ]

    for (const id of allTemplateIds) {
      it(`模板 "${id}" 返回有效 DAG`, () => {
        const graph = createAgentWorkflowGraphByTemplate(id)
        expectValidGraph(graph)
        const issues = validateAgentWorkflowGraph(graph)
        expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)
      })
    }

    it('未知 templateId 回退到 blank', () => {
      const graph = createAgentWorkflowGraphByTemplate('nonexistent' as AgentWorkflowTemplateId)
      const blank = createDefaultAgentWorkflowGraph()
      expect(graph.nodes.length).toBe(blank.nodes.length)
    })
  })
})
