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
  createSmartSuggestionsWorkflowGraph,
  createSmartActionProposalsWorkflowGraph,
  createImageTextGenerationWorkflowGraph,
  createPptGenerationWorkflowGraph,
  createImageAnalysisWorkflowGraph,
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
      expect(nodesByType(g, 'if')).toHaveLength(2)
      expect(nodesByType(g, 'hitl')).toHaveLength(1)
      // 两个 tool 节点：合格入库 + 强制入库
      expect(nodesByType(g, 'tool')).toHaveLength(2)
      expect(nodesByType(g, 'end')).toHaveLength(1)
    })

    it('第一个 if 节点的 true/false 分支分别指向 rag-ingest 和 hitl', () => {
      const g = createRagIngestQaWorkflowGraph()
      const firstIf = g.nodes.find((n) => n.type === 'if' && n.id === 'if-1')!
      expect(firstIf).toBeDefined()
      const branchEdges = g.edges.filter((e) => e.data?.branch)
      expect(branchEdges.length).toBeGreaterThanOrEqual(2)
      const trueEdge = branchEdges.find((e) => e.data?.branch === 'true' && e.source === 'if-1')!
      const falseEdge = branchEdges.find((e) => e.data?.branch === 'false' && e.source === 'if-1')!
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

  // ─────────────────── 高级功能模板 ───────────────────

  describe('createSmartSuggestionsWorkflowGraph', () => {
    it('返回 trigger → memory → rag → llm → if → hitl/end DAG', () => {
      const g = createSmartSuggestionsWorkflowGraph()
      expectValidGraph(g, 'trigger-1')
      expect(nodesByType(g, 'manual-trigger')).toHaveLength(1)
      expect(nodesByType(g, 'conversation-memory')).toHaveLength(1)
      expect(nodesByType(g, 'tool')).toHaveLength(1)
      expect(nodesByType(g, 'llm')).toHaveLength(1)
      expect(nodesByType(g, 'if')).toHaveLength(1)
      expect(nodesByType(g, 'hitl')).toHaveLength(1)
      expect(nodesByType(g, 'end')).toHaveLength(1)
    })

    it('if 节点有 true/false 分支', () => {
      const g = createSmartSuggestionsWorkflowGraph()
      const branchEdges = g.edges.filter((e) => e.data?.branch)
      expect(branchEdges).toHaveLength(2)
    })

    it('验证通过无 error 级 issue', () => {
      const g = createSmartSuggestionsWorkflowGraph()
      const issues = validateAgentWorkflowGraph(g)
      expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)
    })
  })

  describe('createSmartActionProposalsWorkflowGraph', () => {
    it('返回 webhook → parse → llm → hitl → if → notify/end DAG', () => {
      const g = createSmartActionProposalsWorkflowGraph()
      expectValidGraph(g, 'webhook-1')
      expect(nodesByType(g, 'webhook-trigger')).toHaveLength(1)
      expect(nodesByType(g, 'document-parse')).toHaveLength(1)
      expect(nodesByType(g, 'llm')).toHaveLength(1)
      expect(nodesByType(g, 'hitl')).toHaveLength(1)
      expect(nodesByType(g, 'if')).toHaveLength(1)
      expect(nodesByType(g, 'tool')).toHaveLength(1)
      expect(nodesByType(g, 'end')).toHaveLength(1)
    })

    it('hitl 节点配置了确认选项', () => {
      const g = createSmartActionProposalsWorkflowGraph()
      const hitl = g.nodes.find((n) => n.type === 'hitl')!
      expect(hitl.data.confirmMessage).toBeTruthy()
      expect(hitl.data.confirmQuestions).toHaveLength(2)
      expect(hitl.data.confirmQuestions![0].options).toEqual(['确认', '需要修改', '取消'])
    })

    it('验证通过无 error 级 issue', () => {
      const g = createSmartActionProposalsWorkflowGraph()
      const issues = validateAgentWorkflowGraph(g)
      expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)
    })
  })

  describe('createImageTextGenerationWorkflowGraph', () => {
    it('返回 trigger → llm-outline → llm-content → end DAG', () => {
      const g = createImageTextGenerationWorkflowGraph()
      expectValidGraph(g, 'trigger-1')
      expect(nodesByType(g, 'manual-trigger')).toHaveLength(1)
      expect(nodesByType(g, 'llm')).toHaveLength(2)
      expect(nodesByType(g, 'end')).toHaveLength(1)
    })

    it('LLM prompt 包含图文生成关键词', () => {
      const g = createImageTextGenerationWorkflowGraph()
      const outline = g.nodes.find((n) => n.id === 'llm-outline')!
      expect(outline.data.systemPrompt).toContain('文案')
      expect(outline.data.systemPrompt).toContain('图片')
    })

    it('验证通过无 error 级 issue', () => {
      const g = createImageTextGenerationWorkflowGraph()
      const issues = validateAgentWorkflowGraph(g)
      expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)
    })
  })

  describe('createPptGenerationWorkflowGraph', () => {
    it('返回 trigger → memory → llm-outline → llm-detail → end DAG', () => {
      const g = createPptGenerationWorkflowGraph()
      expectValidGraph(g, 'trigger-1')
      expect(nodesByType(g, 'manual-trigger')).toHaveLength(1)
      expect(nodesByType(g, 'conversation-memory')).toHaveLength(1)
      expect(nodesByType(g, 'llm')).toHaveLength(2)
      expect(nodesByType(g, 'end')).toHaveLength(1)
    })

    it('LLM prompt 包含 PPT 关键词', () => {
      const g = createPptGenerationWorkflowGraph()
      const outline = g.nodes.find((n) => n.id === 'llm-outline')!
      expect(outline.data.systemPrompt).toContain('PPT')
      expect(outline.data.systemPrompt).toContain('演示文稿')
    })

    it('验证通过无 error 级 issue', () => {
      const g = createPptGenerationWorkflowGraph()
      const issues = validateAgentWorkflowGraph(g)
      expect(issues.filter((i) => i.level === 'error')).toHaveLength(0)
    })
  })

  // ─────────────────── 模板注册表 ───────────────────

  describe('AGENT_WORKFLOW_TEMPLATES', () => {
    it('包含全部 14 个模板（blank + 13 业务模板）', () => {
      expect(AGENT_WORKFLOW_TEMPLATES).toHaveLength(14)
    })

    it('每个模板 id 在 createAgentWorkflowGraphByTemplate 中都有对应实现', () => {
      for (const meta of AGENT_WORKFLOW_TEMPLATES) {
        const graph = createAgentWorkflowGraphByTemplate(meta.id)
        expect(graph.nodes.length).toBeGreaterThan(0)
      }
    })

    it('新增 10 个模板全部存在', () => {
      const ids = AGENT_WORKFLOW_TEMPLATES.map((t) => t.id)
      for (const expected of ['contract-extract', 'kb-faq', 'http-notify', 'rag-ingest-qa', 'multi-doc-batch', 'smart-suggestions', 'smart-action-proposals', 'image-text-generation', 'ppt-generation', 'image-analysis'] as AgentWorkflowTemplateId[]) {
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
      'smart-suggestions',
      'smart-action-proposals',
      'image-text-generation',
      'ppt-generation',
      'image-analysis',
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

  // ─────────────────── 图片智能分析模板（两阶段架构）───────────────────

  describe('createImageAnalysisWorkflowGraph', () => {
    it('返回包含两个 vision-analyze 节点的有效 DAG', () => {
      const graph = createImageAnalysisWorkflowGraph()
      expectValidGraph(graph, 'trigger-1')
      const visionNodes = graph.nodes.filter((n) => n.type === 'vision-analyze')
      expect(visionNodes).toHaveLength(2)
    })

    it('Phase1 小图 400px/quality50 做结构化提取', () => {
      const graph = createImageAnalysisWorkflowGraph()
      const phase1 = graph.nodes.find((n) => n.id === 'vision-phase1')
      expect(phase1).toBeTruthy()
      expect(phase1!.data.visionImageWidth).toBe(400)
      expect(phase1!.data.visionImageQuality).toBe(50)
      expect(phase1!.data.visionPrompt).toContain('EXACTLY three lines')
    })

    it('Phase2 大图 1024px/quality85 做情感深度分析', () => {
      const graph = createImageAnalysisWorkflowGraph()
      const phase2 = graph.nodes.find((n) => n.id === 'vision-phase2')
      expect(phase2).toBeTruthy()
      expect(phase2!.data.visionImageWidth).toBe(1024)
      expect(phase2!.data.visionImageQuality).toBe(85)
      expect(phase2!.data.visionPrompt).toContain('高清照片')
    })

    it('emotion 路径：Phase2 大图 → LLM 润色', () => {
      const graph = createImageAnalysisWorkflowGraph()
      const branchEdges = graph.edges.filter((e) => e.data?.branch === 'true')
      expect(branchEdges).toHaveLength(1)
      expect(branchEdges[0].target).toBe('vision-phase2')
      const phase2ToLlm = graph.edges.find((e) => e.source === 'vision-phase2')
      expect(phase2ToLlm!.target).toBe('llm-emotion')
    })

    it('非 emotion 路径直接到事件/信息摘要', () => {
      const graph = createImageAnalysisWorkflowGraph()
      const falseBranch = graph.edges.filter((e) => e.data?.branch === 'false')
      expect(falseBranch).toHaveLength(1)
      expect(falseBranch[0].target).toBe('llm-event')
    })

    it('两条路径都汇入 end-1', () => {
      const graph = createImageAnalysisWorkflowGraph()
      const endEdges = graph.edges.filter((e) => e.target === 'end-1')
      expect(endEdges).toHaveLength(2)
    })

    it('通过模板 ID 分发返回相同结构', () => {
      const graph = createAgentWorkflowGraphByTemplate('image-analysis')
      expect(graph.nodes).toHaveLength(8)
      expect(graph.edges).toHaveLength(8)
    })
  })

  // ─────────────────── 验证器增强测试 ───────────────────

  describe('validateAgentWorkflowGraph 增强规则', () => {
    it('检测重复节点 ID', () => {
      const graph = createDefaultAgentWorkflowGraph()
      const dupNode = { ...graph.nodes[0], id: graph.nodes[1].id }
      graph.nodes.push(dupNode)
      const issues = validateAgentWorkflowGraph(graph)
      expect(issues.some((i) => i.message.includes('重复'))).toBe(true)
    })

    it('检测 if 节点缺少 false 分支', () => {
      const graph = createImageAnalysisWorkflowGraph()
      // 移除 false 分支
      graph.edges = graph.edges.filter((e) => !(e.source === 'if-1' && e.data?.branch === 'false'))
      const issues = validateAgentWorkflowGraph(graph)
      expect(issues.some((i) => i.message.includes('缺少 true 或 false 分支'))).toBe(true)
    })

    it('检测 webhook-trigger 缺少路径', () => {
      const graph = createDefaultAgentWorkflowGraph()
      // 添加一个没有 webhookPath 的 webhook-trigger
      graph.nodes.push({
        id: 'webhook-bad',
        type: 'webhook-trigger',
        position: { x: 0, y: 0 },
        data: { label: '坏的 Webhook' },
      })
      const issues = validateAgentWorkflowGraph(graph)
      expect(issues.some((i) => i.message.includes('未配置路径'))).toBe(true)
    })

    it('所有模板通过增强验证（无 error 级 issue）', () => {
      const allIds: AgentWorkflowTemplateId[] = [
        'blank', 'document-summary', 'doc-image-recognition', 'intelligent-assistant',
        'contract-extract', 'kb-faq', 'http-notify', 'rag-ingest-qa', 'multi-doc-batch',
        'smart-suggestions', 'smart-action-proposals', 'image-text-generation',
        'ppt-generation', 'image-analysis',
      ]
      for (const id of allIds) {
        const graph = createAgentWorkflowGraphByTemplate(id)
        const issues = validateAgentWorkflowGraph(graph)
        const errors = issues.filter((i) => i.level === 'error')
        expect(errors).toHaveLength(0)
      }
    })
  })
})
