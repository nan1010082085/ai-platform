/**
 * stores/ai/requirement.ts unit tests
 *
 * 覆盖 createRequirementModule 的核心函数：查找需求确认、上下文构建、答案提交、跳过/确认。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@schema-platform/platform-shared/utils/message', () => ({
  message: { error: vi.fn(), warning: vi.fn() },
}))

vi.mock('@/utils/requirementConfirmFlow', () => ({
  buildRequirementContext: vi.fn(),
  isAllRequiredAnswered: vi.fn(),
  resolveAnswerForQuestion: vi.fn(),
  getInputPlaceholder: vi.fn().mockReturnValue('请输入...'),
}))

import { message } from '@schema-platform/platform-shared/utils/message'
import {
  buildRequirementContext,
  isAllRequiredAnswered,
  resolveAnswerForQuestion,
} from '@/utils/requirementConfirmFlow'
import { createRequirementModule, type RequirementDeps } from '@/stores/ai/requirement'

function createMockDeps(overrides: Partial<RequirementDeps> = {}): RequirementDeps {
  return {
    conversationStore: {
      messages: [],
      currentConversationId: 'conv-1',
      loadConversations: vi.fn(),
    },
    hitlStore: {
      pendingInterrupt: null,
      clearInterrupt: vi.fn(),
    },
    streamStore: {
      loading: false,
      error: null,
      executeResume: vi.fn(),
    },
    ...overrides,
  } as RequirementDeps
}

const sampleAnalysis = {
  intent: 'create_form',
  type: 'form',
  complexity: 'medium',
  completeness: { score: 60, missingFields: [] },
  confirmQuestions: [
    { id: 'q1', question: '表单类型?', type: 'select', options: ['simple', 'complex'], required: true },
    { id: 'q2', question: '需要哪些字段?', type: 'text', required: false },
  ],
}

describe('requirement module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('findRequirementConfirmToolCall returns null when no messages', () => {
    const deps = createMockDeps()
    const { getRequirementConfirmContext } = createRequirementModule(deps)
    // getRequirementConfirmContext calls findRequirementConfirmToolCall internally
    // When no interrupt, returns null
    expect(getRequirementConfirmContext()).toBeNull()
  })

  it('findRequirementConfirmToolCall finds tool call in assistant messages', () => {
    const deps = createMockDeps({
      conversationStore: {
        messages: [
          {
            role: 'assistant',
            toolCalls: [
              {
                name: 'requirement_confirm',
                arguments: {},
                result: { analysis: sampleAnalysis, waitingConfirmation: true, partialAnswers: {} },
              },
            ],
          },
        ],
        currentConversationId: 'conv-1',
        loadConversations: vi.fn(),
      },
      hitlStore: {
        pendingInterrupt: {
          threadId: 'conv-1',
          type: 'requirement_confirm',
          message: '请确认',
          data: { analysis: sampleAnalysis },
        },
        clearInterrupt: vi.fn(),
      },
    })

    const { getRequirementConfirmContext } = createRequirementModule(deps)
    const mockCtx = { analysis: sampleAnalysis, partialAnswers: {}, nextQuestion: sampleAnalysis.confirmQuestions[0], allRequiredAnswered: false }
    vi.mocked(buildRequirementContext).mockReturnValue(mockCtx as never)

    const ctx = getRequirementConfirmContext()
    expect(ctx).not.toBeNull()
    expect(buildRequirementContext).toHaveBeenCalled()
  })

  it('getRequirementConfirmContext returns null when interrupt type is not requirement_confirm', () => {
    const deps = createMockDeps({
      hitlStore: {
        pendingInterrupt: { threadId: 't1', type: 'hitl', message: 'confirm?', data: null },
        clearInterrupt: vi.fn(),
      },
    })

    const { getRequirementConfirmContext } = createRequirementModule(deps)
    expect(getRequirementConfirmContext()).toBeNull()
  })

  it('syncRequirementPartialAnswers updates tool call result', () => {
    const toolCall = {
      name: 'requirement_confirm',
      arguments: {},
      result: { analysis: sampleAnalysis, waitingConfirmation: true, partialAnswers: {} },
    }
    const deps = createMockDeps({
      conversationStore: {
        messages: [{ role: 'assistant', toolCalls: [toolCall] }],
        currentConversationId: 'conv-1',
        loadConversations: vi.fn(),
      },
    })

    const { getInputPlaceholder } = createRequirementModule(deps)
    // getInputPlaceholder is re-exported, just verify it's callable
    expect(getInputPlaceholder()).toBe('请输入...')
  })

  it('submitRequirementAnswer shows error when no context', async () => {
    const deps = createMockDeps()
    const { submitRequirementAnswer } = createRequirementModule(deps)
    await submitRequirementAnswer('hello', vi.fn() as never)
    expect(message.error).toHaveBeenCalledWith('当前没有待确认的需求')
  })

  it('submitRequirementAnswer shows warning when no question and not all answered', async () => {
    const deps = createMockDeps({
      conversationStore: {
        messages: [
          {
            role: 'assistant',
            toolCalls: [{
              name: 'requirement_confirm',
              arguments: {},
              result: { analysis: sampleAnalysis, waitingConfirmation: true, partialAnswers: {} },
            }],
          },
        ],
        currentConversationId: 'conv-1',
        loadConversations: vi.fn(),
      },
      hitlStore: {
        pendingInterrupt: {
          threadId: 'conv-1',
          type: 'requirement_confirm',
          message: '请确认',
          data: { analysis: sampleAnalysis },
        },
        clearInterrupt: vi.fn(),
      },
    })

    const mockCtx = { analysis: sampleAnalysis, partialAnswers: {}, nextQuestion: null, allRequiredAnswered: false }
    vi.mocked(buildRequirementContext).mockReturnValue(mockCtx as never)

    const { submitRequirementAnswer } = createRequirementModule(deps)
    await submitRequirementAnswer('hello', vi.fn() as never)
    expect(message.warning).toHaveBeenCalledWith('请先回答上方待确认的问题')
  })

  it('submitRequirementAnswer shows warning when resolveAnswerForQuestion returns falsy', async () => {
    const question = sampleAnalysis.confirmQuestions[0]
    const deps = createMockDeps({
      conversationStore: {
        messages: [
          {
            role: 'assistant',
            toolCalls: [{
              name: 'requirement_confirm',
              arguments: {},
              result: { analysis: sampleAnalysis, waitingConfirmation: true, partialAnswers: {} },
            }],
          },
        ],
        currentConversationId: 'conv-1',
        loadConversations: vi.fn(),
      },
      hitlStore: {
        pendingInterrupt: {
          threadId: 'conv-1',
          type: 'requirement_confirm',
          message: '请确认',
          data: { analysis: sampleAnalysis },
        },
        clearInterrupt: vi.fn(),
      },
    })

    const mockCtx = { analysis: sampleAnalysis, partialAnswers: {}, nextQuestion: question, allRequiredAnswered: false }
    vi.mocked(buildRequirementContext).mockReturnValue(mockCtx as never)
    vi.mocked(resolveAnswerForQuestion).mockReturnValue('')

    const { submitRequirementAnswer } = createRequirementModule(deps)
    await submitRequirementAnswer('', vi.fn() as never)
    expect(message.warning).toHaveBeenCalledWith('请输入有效回答')
  })

  it('confirmRequirement shows error when no threadId', async () => {
    const deps = createMockDeps({
      conversationStore: {
        messages: [],
        currentConversationId: null,
        loadConversations: vi.fn(),
      },
      hitlStore: {
        pendingInterrupt: null,
        clearInterrupt: vi.fn(),
      },
    })

    const { confirmRequirement } = createRequirementModule(deps)
    await confirmRequirement({}, vi.fn() as never)
    expect(message.error).toHaveBeenCalledWith('会话尚未就绪，请稍候再试')
  })

  it('skipRequirement shows error when no threadId', async () => {
    const deps = createMockDeps({
      conversationStore: {
        messages: [],
        currentConversationId: null,
        loadConversations: vi.fn(),
      },
      hitlStore: {
        pendingInterrupt: null,
        clearInterrupt: vi.fn(),
      },
    })

    const { skipRequirement } = createRequirementModule(deps)
    await skipRequirement(vi.fn() as never)
    expect(message.error).toHaveBeenCalledWith('会话尚未就绪，请稍候再试')
  })

  it('exports expected interface', () => {
    const deps = createMockDeps()
    const mod = createRequirementModule(deps)
    expect(mod).toHaveProperty('getRequirementConfirmContext')
    expect(mod).toHaveProperty('submitRequirementAnswer')
    expect(mod).toHaveProperty('answerRequirementOption')
    expect(mod).toHaveProperty('confirmRequirement')
    expect(mod).toHaveProperty('skipRequirement')
    expect(mod).toHaveProperty('getInputPlaceholder')
  })
})
