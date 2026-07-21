/**
 * stores/ai/events.ts unit tests
 *
 * 覆盖 handleStreamEvent 的各种 StreamEvent 类型。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleStreamEvent, type StreamEventDeps } from '@/stores/ai/events'
import type { AIMessage, StreamEvent } from '@/types'

function createMockDeps(overrides: Partial<StreamEventDeps> = {}): StreamEventDeps {
  return {
    schemaStore: {
      setBuildStep: vi.fn(),
      setCurrentSchema: vi.fn(),
      setSchemaDiff: vi.fn(),
      setCurrentFlow: vi.fn(),
      setFlowDiff: vi.fn(),
    },
    streamStore: { error: null },
    hitlStore: {
      pendingInterrupt: null,
      setInterrupt: vi.fn(),
    },
    conversationStore: {
      currentConversationId: 'conv-1',
      loadConversations: vi.fn(),
    },
    taskChain: { value: [] },
    taskChainIndex: { value: 0 },
    ...overrides,
  } as StreamEventDeps
}

function createMessage(overrides: Partial<AIMessage> = {}): AIMessage {
  return {
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    status: 'streaming',
    ...overrides,
  } as AIMessage
}

describe('handleStreamEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('warns and returns when message not found at index', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const deps = createMockDeps()
    const messages: AIMessage[] = []
    handleStreamEvent({ type: 'text_delta', content: 'hi' } as StreamEvent, 0, messages, deps)
    expect(warnSpy).toHaveBeenCalledWith('[ai] handleStreamEvent: msg not found at index', 0)
    warnSpy.mockRestore()
  })

  it('agent_switch updates agent and thinking', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({ type: 'agent_switch', agent: 'editor' } as StreamEvent, 0, [msg], deps)
    expect(msg.agent).toBe('editor')
    expect(msg.thinking).toBe('')
  })

  it('agent_switch with collaboration appends note', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: 'thinking...' })
    handleStreamEvent({ type: 'agent_switch', agent: 'flow', collaboration: true, description: '需要流程专家' } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('协作')
    expect(msg.thinking).toContain('需要流程专家')
  })

  it('thinking_delta appends content', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: 'a' })
    handleStreamEvent({ type: 'thinking_delta', content: 'b' } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toBe('ab')
  })

  it('text_delta appends content', () => {
    const deps = createMockDeps()
    const msg = createMessage({ content: 'hello' })
    handleStreamEvent({ type: 'text_delta', content: ' world' } as StreamEvent, 0, [msg], deps)
    expect(msg.content).toBe('hello world')
  })

  it('document_summaries sets summaries', () => {
    const deps = createMockDeps()
    const msg = createMessage()
    const summaries = [{ id: 's1', title: 'Summary', text: 'content' }]
    handleStreamEvent({ type: 'document_summaries', summaries } as StreamEvent, 0, [msg], deps)
    expect(msg.documentSummaries).toEqual(summaries)
  })

  it('schema_progress updates build step and schema', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    const schema = [{ type: 'input', id: 'i1' }]
    handleStreamEvent({ type: 'schema_progress', step: 'layout', schema, description: '构建布局' } as StreamEvent, 0, [msg], deps)
    expect(deps.schemaStore.setBuildStep).toHaveBeenCalledWith('layout')
    expect(deps.schemaStore.setCurrentSchema).toHaveBeenCalledWith(schema)
    expect(msg.thinking).toContain('布局结构')
  })

  it('schema_complete clears build step and sets schema', () => {
    const deps = createMockDeps()
    const msg = createMessage({ content: '' })
    const schema = [{ type: 'form', id: 'f1' }]
    handleStreamEvent({ type: 'schema_complete', schema, description: '生成完成' } as StreamEvent, 0, [msg], deps)
    expect(deps.schemaStore.setBuildStep).toHaveBeenCalledWith(null)
    expect(msg.schema).toEqual(schema)
    expect(msg.content).toContain('生成完成')
  })

  it('schema_complete without description sets schema only', () => {
    const deps = createMockDeps()
    const msg = createMessage()
    const schema = [{ type: 'form', id: 'f1' }]
    handleStreamEvent({ type: 'schema_complete', schema } as StreamEvent, 0, [msg], deps)
    expect(msg.schema).toEqual(schema)
  })

  it('schema_diff calls setSchemaDiff', () => {
    const deps = createMockDeps()
    const msg = createMessage()
    const diff = { added: [], removed: [], modified: [] }
    handleStreamEvent({ type: 'schema_diff', diff, description: '更新' } as StreamEvent, 0, [msg], deps)
    expect(deps.schemaStore.setSchemaDiff).toHaveBeenCalledWith(diff, '更新')
  })

  it('flow_progress appends thinking note', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({ type: 'flow_progress', step: '审批节点', description: '配置审批人' } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('审批节点')
  })

  it('flow_complete sets flow and content', () => {
    const deps = createMockDeps()
    const msg = createMessage({ content: '' })
    const flow = { nodes: [], edges: [] }
    handleStreamEvent({ type: 'flow_complete', flow, description: '流程完成' } as StreamEvent, 0, [msg], deps)
    expect(deps.schemaStore.setCurrentFlow).toHaveBeenCalledWith(flow)
    expect(msg.flow).toEqual(flow)
  })

  it('flow_diff calls setFlowDiff', () => {
    const deps = createMockDeps()
    const msg = createMessage()
    const diff = { added: [], removed: [], modified: [] }
    handleStreamEvent({ type: 'flow_diff', diff } as StreamEvent, 0, [msg], deps)
    expect(deps.schemaStore.setFlowDiff).toHaveBeenCalledWith(diff)
  })

  it('tool_call_start adds tool calls', () => {
    const deps = createMockDeps()
    const msg = createMessage()
    const tools = [{ id: 'tc1', name: 'search', arguments: { q: 'test' } }]
    handleStreamEvent({ type: 'tool_call_start', tools } as StreamEvent, 0, [msg], deps)
    expect(msg.toolCalls).toHaveLength(1)
    expect(msg.toolCalls![0].name).toBe('search')
  })

  it('tool_call_end updates existing tool call result', () => {
    const deps = createMockDeps()
    const msg = createMessage({
      toolCalls: [{ id: 'tc1', name: 'search', arguments: {}, result: undefined }],
    })
    const tools = [{ id: 'tc1', name: 'search', result: { data: 'found' } }]
    handleStreamEvent({ type: 'tool_call_end', tools } as StreamEvent, 0, [msg], deps)
    expect(msg.toolCalls![0].result).toEqual({ data: 'found' })
  })

  it('tool_error adds error to existing tool call', () => {
    const deps = createMockDeps()
    const msg = createMessage({
      toolCalls: [{ id: 'tc1', name: 'search', arguments: {} }],
    })
    handleStreamEvent({ type: 'tool_error', runId: 'tc1', content: 'timeout' } as StreamEvent, 0, [msg], deps)
    expect(msg.toolCalls![0].error).toBe('timeout')
  })

  it('tool_error creates new tool call when not found', () => {
    const deps = createMockDeps()
    const msg = createMessage()
    handleStreamEvent({ type: 'tool_error', toolName: 'fetch', content: 'network error' } as StreamEvent, 0, [msg], deps)
    expect(msg.toolCalls).toHaveLength(1)
    expect(msg.toolCalls![0].name).toBe('fetch')
    expect(msg.toolCalls![0].error).toBe('network error')
  })

  it('chain_start/chain_step updates task chain', () => {
    const deps = createMockDeps()
    const msg = createMessage()
    const steps = [{ agent: 'editor', description: '生成表单', status: 'running' }]
    handleStreamEvent({ type: 'chain_start', steps, currentIndex: 0 } as StreamEvent, 0, [msg], deps)
    expect(deps.taskChain.value).toEqual(steps)
    expect(deps.taskChainIndex.value).toBe(0)
  })

  it('chain_complete clears task chain', () => {
    const deps = createMockDeps()
    const msg = createMessage()
    deps.taskChain.value = [{ agent: 'editor', description: 'step', status: 'done' }] as never
    handleStreamEvent({ type: 'chain_complete' } as StreamEvent, 0, [msg], deps)
    expect(deps.taskChain.value).toEqual([])
    expect(deps.taskChainIndex.value).toBe(0)
  })

  it('done sets conversationId and loads conversations', () => {
    const deps = createMockDeps()
    const msg = createMessage()
    handleStreamEvent({ type: 'done', conversationId: 'conv-2' } as StreamEvent, 0, [msg], deps)
    expect(deps.conversationStore.currentConversationId).toBe('conv-2')
    expect(deps.conversationStore.loadConversations).toHaveBeenCalled()
  })

  it('interrupt sets interrupt and pushes interrupt message', () => {
    const deps = createMockDeps()
    const msg = createMessage({ status: 'streaming' })
    const messages: AIMessage[] = [msg]
    handleStreamEvent({
      type: 'interrupt',
      threadId: 't1',
      interruptType: 'hitl',
      message: '请确认',
    } as StreamEvent, 0, messages, deps)
    expect(deps.hitlStore.setInterrupt).toHaveBeenCalled()
    expect(messages).toHaveLength(2)
    expect(messages[1].type).toBe('interrupt')
  })

  it('interrupt with requirement_confirm adds tool call', () => {
    const deps = createMockDeps()
    const msg = createMessage({ status: 'streaming' })
    const messages: AIMessage[] = [msg]
    handleStreamEvent({
      type: 'interrupt',
      threadId: 't1',
      interruptType: 'requirement_confirm',
      message: '请确认需求',
      data: { analysis: { intent: 'create', confirmQuestions: [] } },
    } as StreamEvent, 0, messages, deps)
    expect(msg.toolCalls).toHaveLength(1)
    expect(msg.toolCalls![0].name).toBe('requirement_confirm')
  })

  it('error sets streamStore error and updates message', () => {
    const deps = createMockDeps()
    const msg = createMessage({ status: 'streaming', content: 'partial' })
    handleStreamEvent({ type: 'error', content: 'LLM timeout', agent: 'editor' } as StreamEvent, 0, [msg], deps)
    expect(deps.streamStore.error).toBe('LLM timeout')
    expect(msg.status).toBe('error')
    expect(msg.content).toContain('LLM timeout')
  })

  it('requirement_analysis_start appends thinking', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({ type: 'requirement_analysis_start' } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('正在分析需求')
  })

  it('requirement_analysis_complete with confirmation appends thinking', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({
      type: 'requirement_analysis_complete',
      needsConfirmation: true,
      analysis: { intent: 'create', type: 'form', complexity: 'medium', completeness: { score: 60 }, confirmQuestions: [{ id: 'q1' }] },
    } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('等待确认')
  })

  it('requirement_analysis_complete without confirmation shows analysis', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({
      type: 'requirement_analysis_complete',
      needsConfirmation: false,
      analysis: { intent: 'create', type: 'form', complexity: 'complex', completeness: { score: 90 }, confirmQuestions: [] },
    } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('需求分析完成')
    expect(msg.thinking).toContain('复杂')
    expect(msg.thinking).toContain('90%')
  })

  it('task_plan_start appends thinking', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({ type: 'task_plan_start' } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('正在规划任务')
  })

  it('task_plan_complete shows plan details', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({
      type: 'task_plan_complete',
      plan: {
        strategy: { mode: 'sequential' },
        chain: [
          { agent: 'editor', description: '生成表单' },
          { agent: 'flow', description: '生成流程' },
        ],
      },
    } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('任务规划完成')
    expect(msg.thinking).toContain('sequential')
    expect(msg.thinking).toContain('2')
  })

  it('thinker_start appends thinking', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({ type: 'thinker_start' } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('正在思考执行策略')
  })

  it('thinker_complete shows risks and suggestions', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({
      type: 'thinker_complete',
      risks: [{ description: '可能超时' }],
      suggestions: [{ description: '增加超时设置' }],
      adjustments: { skipSteps: ['step1'] },
    } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('思考完成')
    expect(msg.thinking).toContain('可能超时')
    expect(msg.thinking).toContain('增加超时设置')
    expect(msg.thinking).toContain('跳过步骤 step1')
  })

  it('quality_check_start appends thinking', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({ type: 'quality_check_start' } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('正在检查质量')
  })

  it('quality_check_complete shows result details', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({
      type: 'quality_check_complete',
      result: {
        structure: { valid: true },
        completeness: { score: 95 },
        consistency: { score: 90 },
        suggestions: [{ description: '增加验证规则' }],
      },
    } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('质量检查完成')
    expect(msg.thinking).toContain('95%')
    expect(msg.thinking).toContain('增加验证规则')
  })

  it('requirement_confirm_response updates tool call result', () => {
    const deps = createMockDeps()
    const msg = createMessage({
      toolCalls: [{
        name: 'requirement_confirm',
        arguments: {},
        result: { analysis: {}, waitingConfirmation: true, partialAnswers: {} },
      }],
    })
    handleStreamEvent({
      type: 'requirement_confirm_response',
      answers: { q1: '表单', q2: '输入框' },
    } as StreamEvent, 0, [msg], deps)
    expect(msg.toolCalls![0].result).toMatchObject({
      waitingConfirmation: false,
      userAnswers: { q1: '表单', q2: '输入框' },
    })
  })

  it('requirement_confirm_response does nothing when no matching tool call', () => {
    const deps = createMockDeps()
    const msg = createMessage({ toolCalls: [] })
    handleStreamEvent({
      type: 'requirement_confirm_response',
      answers: { q1: 'test' },
    } as StreamEvent, 0, [msg], deps)
    expect(msg.toolCalls).toEqual([])
  })

  it('interrupt with requirement_confirm and existing tool call updates status only', () => {
    const deps = createMockDeps()
    const msg = createMessage({
      status: 'streaming',
      toolCalls: [{
        name: 'requirement_confirm',
        arguments: {},
        result: { analysis: { intent: 'create', confirmQuestions: [] }, waitingConfirmation: true },
      }],
    })
    const messages: AIMessage[] = [msg]
    handleStreamEvent({
      type: 'interrupt',
      threadId: 't1',
      interruptType: 'requirement_confirm',
      message: '请确认需求',
      data: { analysis: { intent: 'create', confirmQuestions: [] } },
    } as StreamEvent, 0, messages, deps)
    // Should update status but not add duplicate tool call
    expect(msg.toolCalls).toHaveLength(1)
    expect(msg.status).toBe('received')
  })

  it('requirement_analysis_complete with medium complexity shows 中等', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({
      type: 'requirement_analysis_complete',
      needsConfirmation: false,
      analysis: { intent: 'create', type: 'form', complexity: 'medium', completeness: { score: 70 }, confirmQuestions: [] },
    } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('中等')
  })

  it('requirement_analysis_complete with simple complexity shows 简单', () => {
    const deps = createMockDeps()
    const msg = createMessage({ thinking: '' })
    handleStreamEvent({
      type: 'requirement_analysis_complete',
      needsConfirmation: false,
      analysis: { intent: 'create', type: 'form', complexity: 'simple', completeness: { score: 90 }, confirmQuestions: [] },
    } as StreamEvent, 0, [msg], deps)
    expect(msg.thinking).toContain('简单')
  })

  it('flow_complete sets flow without description', () => {
    const deps = createMockDeps()
    const msg = createMessage()
    const flow = { nodes: [{ id: 'n1' }], edges: [] }
    handleStreamEvent({ type: 'flow_complete', flow } as StreamEvent, 0, [msg], deps)
    expect(deps.schemaStore.setCurrentFlow).toHaveBeenCalledWith(flow)
    expect(msg.flow).toEqual(flow)
  })

  it('tool_call_end matches by name when tool.id is missing', () => {
    const deps = createMockDeps()
    const msg = createMessage({
      toolCalls: [{ name: 'search', arguments: {}, result: undefined }],
    })
    const tools = [{ name: 'search', result: { data: 'found' } }]
    handleStreamEvent({ type: 'tool_call_end', tools } as StreamEvent, 0, [msg], deps)
    expect(msg.toolCalls![0].result).toEqual({ data: 'found' })
  })
})
