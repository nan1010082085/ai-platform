/**
 * Agent 工作流编排 — 领域类型（n8n 风格 DAG）
 */

export type ExpertNodeType = 'agent-intent' | 'expert'

export type AgentNodeType =
  | 'manual-trigger'
  | 'webhook-trigger'
  | 'document-parse'
  | 'vision-analyze'
  | 'conversation-memory'
  | 'llm'
  | ExpertNodeType
  | 'tool'
  | 'if'
  | 'hitl'
  | 'end'

export type AgentWorkflowStatus = 'draft' | 'published' | 'archived'

export type AgentExecutionStatus = 'running' | 'success' | 'error' | 'waiting' | 'cancelled'

export type AgentNodeRecordStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'skipped'
  | 'waiting'

/** HITL 人工确认问题（与 Chat 需求分析 confirmQuestions 结构对齐） */
export interface AgentHitlConfirmQuestion {
  id: string
  question: string
  options?: string[]
  required?: boolean
}

export interface AgentConversationTurn {
  role: 'user' | 'assistant' | 'system'
  content: string
  at?: string
}

export interface AgentWorkflowNodeData {
  label: string
  /** llm */
  prompt?: string
  model?: string
  systemPrompt?: string
  useConversationHistory?: boolean
  maxHistoryTurns?: number
  appendAssistantReply?: boolean
  /** agent */
  agentType?: 'auto' | 'editor' | 'flow' | 'page' | 'general'
  /** expert — 插件中心专家 id */
  expertId?: string
  /** tool */
  toolCategory?:
    | 'mcp-schema'
    | 'mcp-flow'
    | 'mcp-widget'
    | 'mcp-rag'
    | 'mcp-industry'
    | 'langgraph'
    | 'workflow'
  toolName?: string
  toolArgs?: Record<string, unknown>
  /** if */
  expression?: string
  /** hitl */
  confirmMessage?: string
  confirmQuestions?: AgentHitlConfirmQuestion[]
  inheritUpstreamQuestions?: boolean
  /** webhook-trigger */
  webhookPath?: string
  webhookMethod?: 'GET' | 'POST'
  /** 发布时生成，用于 HMAC 验签 */
  webhookSecret?: string
  /** document-parse / vision-analyze */
  documentSource?: 'documentId' | 'inputField' | 'stream' | 'api'
  documentId?: string
  inputField?: string
  /** stream 来源：从 $input 读取文件对象字段，默认 file；支持 base64 或 documentId 引用 */
  streamField?: string
  /** api 来源：HTTP 查询接口 */
  fetchUrl?: string
  fetchMethod?: 'GET' | 'POST'
  fetchHeaders?: Record<string, string>
  fetchBody?: string
  /** binary=响应体即文件；json-base64=JSON 字段 base64；json-url=JSON 字段为下载 URL */
  fetchResponseMode?: 'binary' | 'json-base64' | 'json-url'
  fetchContentPath?: string
  fetchFilenamePath?: string
  fetchMimetypePath?: string
  fetchFilename?: string
  fetchMimetype?: string
  /** vision-analyze */
  visionPrompt?: string
  /** conversation-memory */
  memoryMode?: 'read' | 'append' | 'reset'
  memoryRole?: 'user' | 'assistant'
  messageField?: string
  contentSource?: 'input' | 'lastOutput'
  notes?: string
}

export interface AgentWorkflowNode {
  id: string
  type: AgentNodeType
  position: { x: number; y: number }
  data: AgentWorkflowNodeData
}

export interface AgentWorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  data?: {
    label?: string
    branch?: 'true' | 'false' | 'default'
  }
}

export interface AgentWorkflowGraph {
  nodes: AgentWorkflowNode[]
  edges: AgentWorkflowEdge[]
  entryNodeId: string
  viewport?: { x: number; y: number; zoom: number }
}

export interface AgentWorkflowSummary {
  id: string
  name: string
  /** 租户内唯一 slug，Open API by-slug 执行 */
  slug?: string | null
  description?: string
  status: AgentWorkflowStatus
  /** 当前草稿版本号 (yyyymmddhhmmss) */
  version: string
  /** 稳定发布 ID (UUID) */
  publishId: string | null
  /** 已发布版本号 (yyyymmddhhmmss) */
  publishedVersion: string | null
  /** 是否有执行中的实例 */
  hasRunningExecution: boolean
  updatedAt: string
  createdAt: string
}

export interface AgentWorkflowDetail extends AgentWorkflowSummary {
  draftGraph: AgentWorkflowGraph
  onCompleteWebhook?: { url: string; secret?: string } | null
  /** 脱敏后的调用密钥 */
  invokeKeyMasked?: string | null
  /** 统一调用路径，如 /api/ai/workflows/invoke/my-slug */
  invokePath?: string | null
}

export interface AgentWorkflowPublishResult {
  publishId: string
  version: string
  slug?: string | null
  /** 完整密钥，仅在发布/轮换时返回一次 */
  invokeKey?: string | null
}

export interface AgentWorkflowOpenWebhook {
  url: string
  secret?: string
}

export interface AgentWorkflowVersionEntry {
  version: string
  createdAt: string
  published: boolean
  current: boolean
}

export interface AgentWorkflowVersionDetail {
  version: string
  graph: AgentWorkflowGraph
  createdAt: string
  current: boolean
}

export interface AgentNodeRecord {
  nodeId: string
  nodeType: AgentNodeType
  nodeName: string
  status: AgentNodeRecordStatus
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  input?: unknown
  output?: unknown
  error?: string
}

export interface AgentWorkflowStreamingOutput {
  nodeId: string
  nodeType: string
  text: string
  updatedAt: string
}

export interface AgentWorkflowExecution {
  id: string
  workflowId: string
  workflowName: string
  versionId: string | null
  version: string
  status: AgentExecutionStatus
  trigger: 'manual' | 'chat' | 'webhook' | 'api'
  startedAt: string
  finishedAt?: string
  durationMs?: number
  nodeRecords: AgentNodeRecord[]
  conversationHistory?: AgentConversationTurn[]
  parentExecutionId?: string | null
  error?: string
  streamingOutput?: AgentWorkflowStreamingOutput | null
}

export interface AgentWorkflowValidationIssue {
  level: 'error' | 'warning'
  nodeId?: string
  message: string
}

export function createDefaultAgentWorkflowGraph(): AgentWorkflowGraph {
  return layoutAgentWorkflowGraph({
    entryNodeId: 'trigger-1',
    nodes: [
      {
        id: 'trigger-1',
        type: 'manual-trigger',
        position: { x: 80, y: 200 },
        data: { label: '手动触发' },
      },
      {
        id: 'llm-1',
        type: 'llm',
        position: { x: 320, y: 200 },
        data: { label: 'LLM', prompt: '{{$input.message}}', model: 'default' },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 560, y: 200 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'llm-1' },
      { id: 'e2', source: 'llm-1', target: 'end-1' },
    ],
  })
}

const AGENT_NODE_LAYOUT_STEP_X = 340
const AGENT_NODE_LAYOUT_STEP_Y = 180
const AGENT_NODE_LAYOUT_BASE_X = 80
const AGENT_NODE_LAYOUT_BASE_Y = 200

/** 按 DAG 层级自动拉开节点间距，避免宽节点卡片重叠 */
export function layoutAgentWorkflowGraph(graph: AgentWorkflowGraph): AgentWorkflowGraph {
  if (!graph.nodes.length) return graph

  const levels = new Map<string, number>()
  for (const node of graph.nodes) levels.set(node.id, 0)
  if (graph.entryNodeId && levels.has(graph.entryNodeId)) {
    levels.set(graph.entryNodeId, 0)
  }

  let changed = true
  let guard = 0
  while (changed && guard < graph.nodes.length + graph.edges.length + 4) {
    changed = false
    guard += 1
    for (const edge of graph.edges) {
      const next = (levels.get(edge.source) ?? 0) + 1
      if (next > (levels.get(edge.target) ?? 0)) {
        levels.set(edge.target, next)
        changed = true
      }
    }
  }

  const byLevel = new Map<number, string[]>()
  for (const node of graph.nodes) {
    const level = levels.get(node.id) ?? 0
    const bucket = byLevel.get(level) ?? []
    bucket.push(node.id)
    byLevel.set(level, bucket)
  }

  for (const ids of byLevel.values()) {
    ids.sort((a, b) => {
      const ay = graph.nodes.find((n) => n.id === a)?.position.y ?? 0
      const by = graph.nodes.find((n) => n.id === b)?.position.y ?? 0
      return ay - by || a.localeCompare(b)
    })
  }

  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      const level = levels.get(node.id) ?? 0
      const peers = byLevel.get(level) ?? [node.id]
      const peerIndex = peers.indexOf(node.id)
      const peerCount = peers.length
      const yOffset = (peerIndex - (peerCount - 1) / 2) * AGENT_NODE_LAYOUT_STEP_Y
      return {
        ...node,
        position: {
          x: AGENT_NODE_LAYOUT_BASE_X + level * AGENT_NODE_LAYOUT_STEP_X,
          y: AGENT_NODE_LAYOUT_BASE_Y + yOffset,
        },
      }
    }),
  }
}

/** 文档解析 + 摘要工作流模板（Webhook → 解析 → LLM 摘要 → 结束） */
export function createDocumentSummaryWorkflowGraph(): AgentWorkflowGraph {
  return layoutAgentWorkflowGraph({
    entryNodeId: 'webhook-1',
    nodes: [
      {
        id: 'webhook-1',
        type: 'webhook-trigger',
        position: { x: 80, y: 200 },
        data: {
          label: 'Webhook 触发',
          webhookPath: '/document-summary',
          webhookMethod: 'POST',
        },
      },
      {
        id: 'parse-1',
        type: 'document-parse',
        position: { x: 320, y: 200 },
        data: {
          label: '文档解析',
          documentSource: 'stream',
          streamField: 'file',
        },
      },
      {
        id: 'llm-1',
        type: 'llm',
        position: { x: 560, y: 200 },
        data: {
          label: '生成摘要',
          model: 'default',
          systemPrompt: '你是文档摘要助手，请根据解析后的文档内容生成简洁的中文摘要。',
          prompt: '请为以下文档生成结构化摘要：\n\n文件名：{{$node.parse-1.filename}}\n\n正文：\n{{$node.parse-1.text}}',
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 800, y: 200 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'webhook-1', target: 'parse-1' },
      { id: 'e2', source: 'parse-1', target: 'llm-1' },
      { id: 'e3', source: 'llm-1', target: 'end-1' },
    ],
  })
}

/** 文档 / 图片识别编排：上传文件流 → 解析 → 按 OCR/文档分支结构化提取 */
export function createDocImageRecognitionWorkflowGraph(): AgentWorkflowGraph {
  return layoutAgentWorkflowGraph({
    entryNodeId: 'trigger-1',
    nodes: [
      {
        id: 'trigger-1',
        type: 'manual-trigger',
        position: { x: 80, y: 220 },
        data: { label: '手动触发' },
      },
      {
        id: 'parse-1',
        type: 'document-parse',
        position: { x: 280, y: 220 },
        data: {
          label: '文档/图片解析',
          documentSource: 'stream',
          streamField: 'file',
        },
      },
      {
        id: 'if-1',
        type: 'if',
        position: { x: 480, y: 220 },
        data: {
          label: '是否图片 OCR',
          expression: "lastOutput && lastOutput.extractionMethod === 'ocr'",
        },
      },
      {
        id: 'vision-1',
        type: 'vision-analyze',
        position: { x: 680, y: 120 },
        data: {
          label: '图片视觉描述',
          documentSource: 'stream',
          streamField: 'file',
          visionPrompt:
            '描述图片中的场景、UI/表单布局、图表与视觉结构。文字内容可简要概括，重点不是逐字 OCR。',
        },
      },
      {
        id: 'llm-image',
        type: 'llm',
        position: { x: 880, y: 120 },
        data: {
          label: '图片结构化识别',
          model: 'default',
          systemPrompt:
            '你是图片识别助手。结合 OCR 文本与视觉描述，输出 JSON：{ "type": "image", "filename": "...", "summary": "...", "visualDescription": "...", "fields": [], "tables": [] }。只输出 JSON。',
          prompt:
            'OCR 文本：{{$node.parse-1.text}}\n\n视觉描述：{{$node.vision-1.description}}\n\n请输出结构化 JSON。',
        },
      },
      {
        id: 'llm-doc',
        type: 'llm',
        position: { x: 680, y: 320 },
        data: {
          label: '文档结构化提取',
          model: 'default',
          systemPrompt:
            '你是文档解析助手。根据文档正文，输出 JSON：{ "type": "document", "filename": "...", "summary": "...", "sections": [{"title":"","content":""}], "keyPoints": [] }。只输出 JSON，不要 markdown 代码块。',
          prompt:
            '文件名：{{$node.parse-1.filename}}\n\n解析结果：\n{{$node.parse-1.text}}\n\n请提取章节摘要与关键信息。',
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 1080, y: 220 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'parse-1' },
      { id: 'e2', source: 'parse-1', target: 'if-1' },
      { id: 'e3', source: 'if-1', target: 'vision-1', data: { branch: 'true' } },
      { id: 'e4', source: 'if-1', target: 'llm-doc', data: { branch: 'false' } },
      { id: 'e5', source: 'vision-1', target: 'llm-image' },
      { id: 'e6', source: 'llm-image', target: 'end-1' },
      { id: 'e7', source: 'llm-doc', target: 'end-1' },
    ],
  })
}

/** 智能助手问答编排：用户提问 → RAG 检索 → LLM 生成回答 */
export function createIntelligentAssistantWorkflowGraph(): AgentWorkflowGraph {
  return layoutAgentWorkflowGraph({
    entryNodeId: 'trigger-1',
    nodes: [
      {
        id: 'trigger-1',
        type: 'manual-trigger',
        position: { x: 80, y: 200 },
        data: { label: '手动触发' },
      },
      {
        id: 'memory-1',
        type: 'conversation-memory',
        position: { x: 240, y: 200 },
        data: {
          label: '记录用户问题',
          memoryMode: 'append',
          memoryRole: 'user',
          messageField: 'message',
          maxHistoryTurns: 20,
        },
      },
      {
        id: 'rag-1',
        type: 'tool',
        position: { x: 400, y: 200 },
        data: {
          label: '知识库检索',
          toolCategory: 'mcp-rag',
          toolName: 'rag__search',
          toolArgs: {
            query: '{{$input.message}}',
            limit: 5,
          },
        },
      },
      {
        id: 'llm-1',
        type: 'llm',
        position: { x: 600, y: 200 },
        data: {
          label: '生成回答',
          model: 'default',
          useConversationHistory: true,
          appendAssistantReply: true,
          maxHistoryTurns: 20,
          systemPrompt:
            '你是 Schema 平台智能助手。根据知识库检索结果与对话历史回答用户问题，语气简洁专业。若检索无相关内容，说明未找到并给出可操作建议。回答使用中文。',
          prompt:
            '对话历史：\n{{$conversation}}\n\n当前问题：{{$input.message}}\n\n知识库检索结果：\n{{$node.rag-1}}\n\n请给出完整回答。',
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 800, y: 200 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger-1', target: 'memory-1' },
      { id: 'e2', source: 'memory-1', target: 'rag-1' },
      { id: 'e3', source: 'rag-1', target: 'llm-1' },
      { id: 'e4', source: 'llm-1', target: 'end-1' },
    ],
  })
}

export type AgentWorkflowTemplateId =
  | 'blank'
  | 'document-summary'
  | 'doc-image-recognition'
  | 'intelligent-assistant'
  | 'contract-extract'
  | 'kb-faq'
  | 'http-notify'
  | 'rag-ingest-qa'
  | 'multi-doc-batch'

export interface AgentWorkflowTemplateMeta {
  id: AgentWorkflowTemplateId
  name: string
  description: string
  category: 'general' | 'document' | 'assistant' | 'integration' | 'batch'
}

export const AGENT_WORKFLOW_TEMPLATES: AgentWorkflowTemplateMeta[] = [
  {
    id: 'blank',
    name: '空白工作流',
    description: '手动触发 + LLM + 结束，从零开始搭建',
    category: 'general',
  },
  {
    id: 'document-summary',
    name: '文档摘要',
    description: 'Webhook 接收 documentId，解析后生成摘要',
    category: 'document',
  },
  {
    id: 'doc-image-recognition',
    name: '文档 / 图片识别',
    description: '解析上传文件，图片走 OCR 分支，文档走结构化提取',
    category: 'document',
  },
  {
    id: 'intelligent-assistant',
    name: '智能助手问答',
    description: 'RAG 检索知识库后由 LLM 生成帮助回答',
    category: 'assistant',
  },
  {
    id: 'contract-extract',
    name: '合同条款提取',
    description: '上传合同文档，解析后由 LLM 结构化提取关键条款与风险点',
    category: 'document',
  },
  {
    id: 'kb-faq',
    name: '知识库 FAQ 生成',
    description: 'Webhook 接收文档，由 LLM 自动生成问答对并写入知识库',
    category: 'assistant',
  },
  {
    id: 'http-notify',
    name: 'HTTP 回调通知',
    description: 'Webhook 接收数据 → LLM 处理 → HTTP POST 结果到外部系统',
    category: 'integration',
  },
  {
    id: 'rag-ingest-qa',
    name: 'RAG 入库质检',
    description: '文档解析后经 LLM 质检，合格文档自动入库，不合格触发人工审核',
    category: 'assistant',
  },
  {
    id: 'multi-doc-batch',
    name: '单文档摘要处理',
    description: 'Webhook 接收文档，解析后由 LLM 生成摘要并汇总结果（多次调用可累积）',
    category: 'batch',
  },
]

/** 合同条款提取：Webhook 接收合同文档 → 解析 → LLM 结构化提取 → 结束 */
export function createContractExtractWorkflowGraph(): AgentWorkflowGraph {
  return layoutAgentWorkflowGraph({
    entryNodeId: 'webhook-1',
    nodes: [
      {
        id: 'webhook-1',
        type: 'webhook-trigger',
        position: { x: 80, y: 200 },
        data: {
          label: 'Webhook 触发',
          webhookPath: '/contract-extract',
          webhookMethod: 'POST',
        },
      },
      {
        id: 'parse-1',
        type: 'document-parse',
        position: { x: 320, y: 200 },
        data: {
          label: '合同文档解析',
          documentSource: 'stream',
          streamField: 'file',
        },
      },
      {
        id: 'llm-1',
        type: 'llm',
        position: { x: 560, y: 200 },
        data: {
          label: '条款结构化提取',
          model: 'default',
          systemPrompt:
            '你是合同分析专家。从合同文本中提取关键条款，输出 JSON：{ "parties": [], "effectiveDate": "", "expiryDate": "", "totalAmount": "", "paymentTerms": "", "keyClauses": [{"clause": "", "content": "", "riskLevel": "low|medium|high"}], "risks": [] }。只输出 JSON，不要 markdown 代码块。',
          prompt:
            '文件名：{{$node.parse-1.filename}}\n\n合同正文：\n{{$node.parse-1.text}}\n\n请提取所有关键条款与潜在风险点。',
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 800, y: 200 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'webhook-1', target: 'parse-1' },
      { id: 'e2', source: 'parse-1', target: 'llm-1' },
      { id: 'e3', source: 'llm-1', target: 'end-1' },
    ],
  })
}

/** 知识库 FAQ 生成：手动触发 → 文档解析 → LLM 生成问答对 → RAG 写入 → 结束 */
export function createKbFaqWorkflowGraph(): AgentWorkflowGraph {
  return layoutAgentWorkflowGraph({
    entryNodeId: 'webhook-1',
    nodes: [
      {
        id: 'webhook-1',
        type: 'webhook-trigger',
        position: { x: 80, y: 200 },
        data: {
          label: 'Webhook 触发',
          webhookPath: '/kb-faq',
          webhookMethod: 'POST',
        },
      },
      {
        id: 'parse-1',
        type: 'document-parse',
        position: { x: 320, y: 200 },
        data: {
          label: '文档解析',
          documentSource: 'stream',
          streamField: 'file',
        },
      },
      {
        id: 'llm-1',
        type: 'llm',
        position: { x: 560, y: 200 },
        data: {
          label: '生成 FAQ 问答对',
          model: 'default',
          systemPrompt:
            '你是知识库内容专家。根据文档内容生成高质量的 FAQ 问答对。输出 JSON 数组：[{ "question": "...", "answer": "..." }]。问题应覆盖文档核心知识点，答案简洁准确。生成 5~15 对。只输出 JSON。',
          prompt:
            '文档标题：{{$node.parse-1.filename}}\n\n文档内容：\n{{$node.parse-1.text}}\n\n请生成 FAQ 问答对。',
        },
      },
      {
        id: 'rag-write',
        type: 'tool',
        position: { x: 800, y: 200 },
        data: {
          label: '写入知识库',
          toolCategory: 'mcp-rag',
          toolName: 'rag__ingest',
          toolArgs: {
            content: '{{$node.llm-1}}',
            metadata: { source: 'faq-generated', filename: '{{$node.parse-1.filename}}' },
          },
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 1040, y: 200 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'webhook-1', target: 'parse-1' },
      { id: 'e2', source: 'parse-1', target: 'llm-1' },
      { id: 'e3', source: 'llm-1', target: 'rag-write' },
      { id: 'e4', source: 'rag-write', target: 'end-1' },
    ],
  })
}

/** HTTP 回调通知：手动触发 → LLM 处理 → HTTP POST 结果 → 结束 */
export function createHttpNotifyWorkflowGraph(): AgentWorkflowGraph {
  return layoutAgentWorkflowGraph({
    entryNodeId: 'webhook-1',
    nodes: [
      {
        id: 'webhook-1',
        type: 'webhook-trigger',
        position: { x: 80, y: 200 },
        data: {
          label: 'Webhook 触发',
          webhookPath: '/process-and-notify',
          webhookMethod: 'POST',
        },
      },
      {
        id: 'llm-1',
        type: 'llm',
        position: { x: 320, y: 200 },
        data: {
          label: '内容处理',
          model: 'default',
          systemPrompt: '你是数据处理助手。对输入内容进行分析和摘要，输出结构化 JSON 结果。',
          prompt: '请处理以下输入并输出结构化结果：\n\n{{$input}}',
        },
      },
      {
        id: 'notify-1',
        type: 'tool',
        position: { x: 560, y: 200 },
        data: {
          label: 'HTTP 回调通知',
          toolCategory: 'workflow',
          toolName: 'http__request',
          toolArgs: {
            url: '{{$input.callbackUrl}}',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
              workflowId: '{{$execution.workflowId}}',
              status: 'completed',
              result: '{{$node.llm-1}}',
              timestamp: '{{$now}}',
            },
          },
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 800, y: 200 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'webhook-1', target: 'llm-1' },
      { id: 'e2', source: 'llm-1', target: 'notify-1' },
      { id: 'e3', source: 'notify-1', target: 'end-1' },
    ],
  })
}

/** RAG 入库质检：Webhook 接收文档 → 解析 → LLM 质检 → 判断是否合格 → 合格入库 / 不合格人工审核 */
export function createRagIngestQaWorkflowGraph(): AgentWorkflowGraph {
  return layoutAgentWorkflowGraph({
    entryNodeId: 'webhook-1',
    nodes: [
      {
        id: 'webhook-1',
        type: 'webhook-trigger',
        position: { x: 80, y: 200 },
        data: {
          label: 'Webhook 触发',
          webhookPath: '/rag-ingest-qa',
          webhookMethod: 'POST',
        },
      },
      {
        id: 'parse-1',
        type: 'document-parse',
        position: { x: 320, y: 200 },
        data: {
          label: '文档解析',
          documentSource: 'stream',
          streamField: 'file',
        },
      },
      {
        id: 'llm-qa',
        type: 'llm',
        position: { x: 560, y: 200 },
        data: {
          label: '内容质量检查',
          model: 'default',
          systemPrompt:
            '你是文档质检员。检查文档内容是否适合入库：内容是否完整、是否有实质信息、是否为乱码或空白。输出 JSON：{ "passed": true/false, "reason": "..." }。只输出 JSON。',
          prompt:
            '文件名：{{$node.parse-1.filename}}\n\n文档内容：\n{{$node.parse-1.text}}\n\n请判断该文档是否适合写入知识库。',
        },
      },
      {
        id: 'if-1',
        type: 'if',
        position: { x: 800, y: 200 },
        data: {
          label: '质检是否通过',
          expression: "lastOutput && lastOutput.passed === true",
        },
      },
      {
        id: 'rag-ingest',
        type: 'tool',
        position: { x: 1040, y: 100 },
        data: {
          label: '写入知识库',
          toolCategory: 'mcp-rag',
          toolName: 'rag__ingest',
          toolArgs: {
            content: '{{$node.parse-1.text}}',
            metadata: { source: 'qa-passed', filename: '{{$node.parse-1.filename}}' },
          },
        },
      },
      {
        id: 'hitl-1',
        type: 'hitl',
        position: { x: 1040, y: 300 },
        data: {
          label: '人工审核',
          confirmMessage: '文档「{{$node.parse-1.filename}}」质检未通过，原因：{{$node.llm-qa.reason}}。请确认是否仍要入库？',
          confirmQuestions: [
            { id: 'q1', question: '是否强制入库？', options: ['入库', '丢弃'], required: true },
            { id: 'q2', question: '备注说明', required: false },
          ],
        },
      },
      {
        id: 'if-hitl',
        type: 'if',
        position: { x: 1280, y: 300 },
        data: {
          label: '用户选择',
          expression: "hitlResult && hitlResult.q1 === '入库'",
        },
      },
      {
        id: 'rag-ingest-force',
        type: 'tool',
        position: { x: 1520, y: 250 },
        data: {
          label: '强制入库',
          toolCategory: 'mcp-rag',
          toolName: 'rag__ingest',
          toolArgs: {
            content: '{{$node.parse-1.text}}',
            metadata: { source: 'qa-manual-override', filename: '{{$node.parse-1.filename}}' },
          },
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 1520, y: 400 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'webhook-1', target: 'parse-1' },
      { id: 'e2', source: 'parse-1', target: 'llm-qa' },
      { id: 'e3', source: 'llm-qa', target: 'if-1' },
      { id: 'e4', source: 'if-1', target: 'rag-ingest', data: { branch: 'true' } },
      { id: 'e5', source: 'if-1', target: 'hitl-1', data: { branch: 'false' } },
      { id: 'e6', source: 'rag-ingest', target: 'end-1' },
      { id: 'e7', source: 'hitl-1', target: 'if-hitl' },
      { id: 'e8', source: 'if-hitl', target: 'rag-ingest-force', data: { branch: 'true' } },
      { id: 'e9', source: 'if-hitl', target: 'end-1', data: { branch: 'false' } },
      { id: 'e10', source: 'rag-ingest-force', target: 'end-1' },
    ],
  })
}

/** 多文档批量处理：Webhook 接收文档列表 → 解析 → LLM 摘要 → 汇总 → 结束 */
export function createMultiDocBatchWorkflowGraph(): AgentWorkflowGraph {
  return layoutAgentWorkflowGraph({
    entryNodeId: 'webhook-1',
    nodes: [
      {
        id: 'webhook-1',
        type: 'webhook-trigger',
        position: { x: 80, y: 200 },
        data: {
          label: 'Webhook 触发',
          webhookPath: '/multi-doc-batch',
          webhookMethod: 'POST',
        },
      },
      {
        id: 'parse-1',
        type: 'document-parse',
        position: { x: 320, y: 200 },
        data: {
          label: '文档解析',
          documentSource: 'stream',
          streamField: 'file',
        },
      },
      {
        id: 'llm-single',
        type: 'llm',
        position: { x: 560, y: 200 },
        data: {
          label: '单文档摘要',
          model: 'default',
          systemPrompt: '你是文档摘要助手。为每篇文档生成简洁的中文摘要，提取关键信息。输出 JSON：{ "filename": "...", "summary": "...", "keyPoints": [] }。只输出 JSON。',
          prompt:
            '文件名：{{$node.parse-1.filename}}\n\n文档内容：\n{{$node.parse-1.text}}\n\n请生成摘要。',
        },
      },
      {
        id: 'memory-1',
        type: 'conversation-memory',
        position: { x: 800, y: 200 },
        data: {
          label: '追加摘要到记忆',
          memoryMode: 'append',
          memoryRole: 'assistant',
          contentSource: 'lastOutput',
          maxHistoryTurns: 50,
        },
      },
      {
        id: 'llm-summary',
        type: 'llm',
        position: { x: 1040, y: 200 },
        data: {
          label: '汇总所有摘要',
          model: 'default',
          systemPrompt: '你是文档汇总助手。根据已处理的所有文档摘要，生成一份综合报告。输出 JSON：{ "totalDocuments": N, "summaries": [...], "overallSummary": "...", "commonThemes": [] }。只输出 JSON。',
          prompt: '已处理的文档摘要：\n{{$conversation}}\n\n请生成综合汇总报告。',
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 1280, y: 200 },
        data: { label: '结束' },
      },
    ],
    edges: [
      { id: 'e1', source: 'webhook-1', target: 'parse-1' },
      { id: 'e2', source: 'parse-1', target: 'llm-single' },
      { id: 'e3', source: 'llm-single', target: 'memory-1' },
      { id: 'e4', source: 'memory-1', target: 'llm-summary' },
      { id: 'e5', source: 'llm-summary', target: 'end-1' },
    ],
  })
}

export function createAgentWorkflowGraphByTemplate(
  templateId: AgentWorkflowTemplateId,
): AgentWorkflowGraph {
  switch (templateId) {
    case 'document-summary':
      return createDocumentSummaryWorkflowGraph()
    case 'doc-image-recognition':
      return createDocImageRecognitionWorkflowGraph()
    case 'intelligent-assistant':
      return createIntelligentAssistantWorkflowGraph()
    case 'contract-extract':
      return createContractExtractWorkflowGraph()
    case 'kb-faq':
      return createKbFaqWorkflowGraph()
    case 'http-notify':
      return createHttpNotifyWorkflowGraph()
    case 'rag-ingest-qa':
      return createRagIngestQaWorkflowGraph()
    case 'multi-doc-batch':
      return createMultiDocBatchWorkflowGraph()
    case 'blank':
    default:
      return createDefaultAgentWorkflowGraph()
  }
}

export function validateAgentWorkflowGraph(graph: AgentWorkflowGraph): AgentWorkflowValidationIssue[] {
  const issues: AgentWorkflowValidationIssue[] = []
  if (!graph.nodes.length) {
    issues.push({ level: 'error', message: '工作流至少需要一个节点' })
    return issues
  }
  if (!graph.entryNodeId || !graph.nodes.some((n) => n.id === graph.entryNodeId)) {
    issues.push({ level: 'error', message: '缺少有效的入口节点' })
  }
  const nodeIds = new Set(graph.nodes.map((n) => n.id))
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({ level: 'error', message: `连线 ${edge.id} 引用了不存在的节点` })
    }
  }
  const triggers = graph.nodes.filter((n) => n.type === 'manual-trigger' || n.type === 'webhook-trigger')
  if (triggers.length === 0) {
    issues.push({ level: 'error', message: '需要至少一个触发节点（手动或 Webhook）' })
  }
  if (triggers.length > 1) {
    issues.push({ level: 'warning', message: '存在多个手动触发节点，仅 entryNodeId 指定的节点作为入口' })
  }
  const ends = graph.nodes.filter((n) => n.type === 'end')
  if (ends.length === 0) {
    issues.push({ level: 'warning', message: '建议添加「结束」节点' })
  }
  for (const node of graph.nodes) {
    if (!node.data?.label?.trim()) {
      issues.push({ level: 'warning', nodeId: node.id, message: '节点缺少显示名称' })
    }
    if (node.type === 'llm' && !node.data.prompt?.trim()) {
      issues.push({ level: 'warning', nodeId: node.id, message: 'LLM 节点未配置 Prompt' })
    }
    if (node.type === 'tool' && !node.data.toolName?.trim()) {
      issues.push({ level: 'warning', nodeId: node.id, message: '工具节点未选择具体工具' })
    }
    if (node.type === 'expert' && !node.data.expertId?.trim()) {
      issues.push({ level: 'warning', nodeId: node.id, message: '专家节点未选择插件专家' })
    }
  }
  return issues
}
