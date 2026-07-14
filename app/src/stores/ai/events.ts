/**
 * SSE 流事件处理
 *
 * 处理所有 StreamEvent 类型，更新消息状态和 Schema/Flow 状态。
 * 作为纯函数提取，通过参数接收 store 引用以避免循环依赖。
 */

import type {
  AIMessage,
  StreamEvent,
  Widget,
  FlowGraph,
  SchemaDiff,
  FlowDiff,
  TaskChainStep,
} from '@/types'
import type { PendingInterrupt } from '@/types'

/** handleStreamEvent 所需的外部依赖 */
export interface StreamEventDeps {
  schemaStore: {
    setBuildStep: (step: string | null) => void
    setCurrentSchema: (schema: Widget[]) => void
    setSchemaDiff: (diff: SchemaDiff, description?: string) => void
    setCurrentFlow: (flow: FlowGraph) => void
    setFlowDiff: (diff: FlowDiff) => void
  }
  streamStore: {
    error: string | null
  }
  hitlStore: {
    pendingInterrupt: PendingInterrupt | null
    setInterrupt: (interrupt: PendingInterrupt) => void
  }
  conversationStore: {
    currentConversationId: string | null
    loadConversations: () => Promise<void>
  }
  taskChain: { value: TaskChainStep[] }
  taskChainIndex: { value: number }
}

/**
 * 处理单个流式事件，更新对应 assistant 消息的状态。
 */
export function handleStreamEvent(
  event: StreamEvent,
  assistantIndex: number,
  messages: AIMessage[],
  deps: StreamEventDeps,
): void {
  const msg = messages[assistantIndex]
  if (!msg) {
    console.warn('[ai] handleStreamEvent: msg not found at index', assistantIndex)
    return
  }

  const { schemaStore, streamStore, hitlStore, conversationStore, taskChain, taskChainIndex } = deps

  // 强制触发响应式更新的辅助函数
  function updateMessage(updates: Partial<AIMessage>): void {
    Object.assign(msg, updates)
  }

  switch (event.type) {
    case 'agent_switch':
      if (event.agent) {
        const collaborationNote = event.collaboration && event.description
          ? `\n\n[协作] 请求 ${event.agent === 'editor' ? 'Editor' : 'Flow'} 专家协助：${event.description}`
          : ''
        updateMessage({
          agent: event.agent as 'editor' | 'flow' | 'general',
          thinking: (msg.thinking ?? '') + collaborationNote,
        })
      }
      break

    case 'thinking_delta':
      if (event.content) {
        updateMessage({ thinking: (msg.thinking ?? '') + event.content })
      }
      break

    case 'text_delta':
      if (event.content) {
        updateMessage({ content: (msg.content ?? '') + event.content })
      }
      break

    case 'document_summaries': {
      const summaries = (event as { summaries?: AIMessage['documentSummaries'] }).summaries
      if (summaries?.length) {
        updateMessage({ documentSummaries: summaries })
      }
      break
    }

    case 'schema_start':
      // Schema 开始生成
      break

    case 'schema_progress':
      if (event.step) {
        schemaStore.setBuildStep(event.step)
      }
      if (event.schema) {
        schemaStore.setCurrentSchema(event.schema as Widget[])
      }
      if (event.step && event.description) {
        const stepLabels: Record<string, string> = {
          layout: '布局结构',
          components: '表单组件',
          validation: '验证规则',
          styling: '样式配置',
        }
        const stepLabel = stepLabels[event.step] ?? event.step
        const progressNote = `\n\n[生成进度] ${stepLabel}: ${event.description}`
        updateMessage({ thinking: (msg.thinking ?? '') + progressNote })
      }
      break

    case 'schema_complete':
      schemaStore.setBuildStep(null)
      if (event.schema) {
        schemaStore.setCurrentSchema(event.schema as Widget[])
      }
      if (event.description) {
        updateMessage({
          schema: event.schema as Widget[],
          content: (msg.content ?? '') + event.description,
        })
      } else if (event.schema) {
        updateMessage({ schema: event.schema as Widget[] })
      }
      break

    case 'schema_diff':
      if (event.diff) {
        schemaStore.setSchemaDiff(event.diff as SchemaDiff, event.description)
      }
      break

    case 'flow_start':
      // Flow 开始生成
      break

    case 'flow_progress':
      if (event.step && event.description) {
        const progressNote = `\n\n[流程生成] ${event.step}: ${event.description}`
        updateMessage({ thinking: (msg.thinking ?? '') + progressNote })
      }
      break

    case 'flow_complete':
      if (event.flow) {
        schemaStore.setCurrentFlow(event.flow as FlowGraph)
      }
      if (event.description) {
        updateMessage({
          flow: event.flow as FlowGraph,
          content: (msg.content ?? '') + event.description,
        })
      } else if (event.flow) {
        updateMessage({ flow: event.flow as FlowGraph })
      }
      break

    case 'flow_diff':
      if (event.diff) {
        schemaStore.setFlowDiff(event.diff as FlowDiff)
      }
      break

    case 'tool_call_start': {
      const newToolCalls = [...(msg.toolCalls ?? [])]
      if (event.tools) {
        for (const tool of event.tools) {
          newToolCalls.push({
            id: tool.id,
            name: tool.name,
            arguments: tool.arguments ?? {},
          })
        }
      }
      updateMessage({ toolCalls: newToolCalls })
      break
    }

    case 'tool_call_end': {
      const updatedToolCalls = [...(msg.toolCalls ?? [])]
      if (event.tools) {
        for (const tool of event.tools) {
          const existing = tool.id
            ? updatedToolCalls.find((t) => t.id === tool.id && !t.result)
            : updatedToolCalls.find((t) => t.name === tool.name && !t.result)
          if (existing) {
            existing.result = tool.result
          }
        }
      }
      updateMessage({ toolCalls: updatedToolCalls })
      break
    }

    case 'tool_error': {
      const errorToolCalls = [...(msg.toolCalls ?? [])]
      const errorMsg = event.content ?? '工具执行失败'
      const existing = event.runId
        ? errorToolCalls.find((t) => t.id === event.runId)
        : errorToolCalls.find((t) => t.name === (event.toolName ?? 'unknown') && !t.result)
      if (existing) {
        existing.error = errorMsg
        existing.result = { error: errorMsg }
      } else {
        errorToolCalls.push({
          name: event.toolName ?? 'unknown',
          arguments: {},
          result: { error: errorMsg },
          error: errorMsg,
        })
      }
      updateMessage({ toolCalls: errorToolCalls })
      break
    }

    case 'chain_start':
    case 'chain_step':
      if (event.steps) {
        taskChain.value = event.steps
        taskChainIndex.value = event.currentIndex ?? 0
      }
      break

    case 'chain_complete':
      taskChain.value = []
      taskChainIndex.value = 0
      break

    case 'done':
      if (event.conversationId) {
        conversationStore.currentConversationId = event.conversationId
        conversationStore.loadConversations()
      }
      break

    case 'interrupt': {
      if (event.threadId) {
        conversationStore.currentConversationId = event.threadId
      }
      hitlStore.setInterrupt({
        threadId: event.threadId ?? '',
        type: event.interruptType ?? 'unknown',
        message: event.message ?? '需要您的确认',
        data: event.data,
      })

      if (event.interruptType === 'requirement_confirm') {
        const analysis = (event.data as Record<string, unknown> | undefined)?.analysis
        if (analysis) {
          const newToolCalls = [...(msg.toolCalls ?? [])]
          if (!newToolCalls.some((tc) => tc.name === 'requirement_confirm')) {
            newToolCalls.push({
              name: 'requirement_confirm',
              arguments: {},
              result: {
                analysis,
                waitingConfirmation: true,
                partialAnswers: {},
              },
            })
            updateMessage({ toolCalls: newToolCalls, status: 'received' })
          } else {
            updateMessage({ status: 'received' })
          }
        }
        break
      }

      updateMessage({ status: 'received' })

      messages.push({
        role: 'assistant',
        type: 'interrupt',
        content: event.message ?? '需要您的确认',
        data: hitlStore.pendingInterrupt as PendingInterrupt,
        timestamp: new Date(),
        status: 'received',
      })
      break
    }

    case 'error':
      streamStore.error = event.content ?? 'Unknown error'
      if (msg.status === 'streaming') {
        const agentLabel = event.agent ? ` [${event.agent}]` : ''
        updateMessage({
          content: (msg.content || msg.thinking || '')
            + `\n\n⚠️${agentLabel} ${event.content ?? '未知错误'}`,
          status: 'error',
        })
      }
      break

    // v2: 需求分析事件
    case 'requirement_analysis_start':
      updateMessage({
        thinking: (msg.thinking ?? '') + '\n\n🔍 正在分析需求...',
      })
      break

    case 'requirement_analysis_complete': {
      const analysis = event.analysis
      if (analysis) {
        if (event.needsConfirmation && analysis.confirmQuestions.length > 0) {
          updateMessage({
            thinking: (msg.thinking ?? '') + '\n\n📊 需求分析完成，等待确认…',
          })
        } else {
          const complexityLabel = analysis.complexity === 'complex' ? '复杂' :
            analysis.complexity === 'medium' ? '中等' : '简单'

          updateMessage({
            thinking: (msg.thinking ?? '')
              + `\n\n📊 需求分析完成`
              + `\n- 意图：${analysis.intent}`
              + `\n- 类型：${analysis.type}`
              + `\n- 复杂度：${complexityLabel}`
              + `\n- 完整性：${analysis.completeness.score}%`,
          })
        }
      }
      break
    }

    case 'requirement_confirm_response': {
      // 用户确认了需求，更新消息状态
      const newToolCalls = [...(msg.toolCalls ?? [])]
      const confirmIndex = newToolCalls.findIndex(tc => tc.name === 'requirement_confirm')
      if (confirmIndex >= 0) {
        newToolCalls[confirmIndex] = {
          ...newToolCalls[confirmIndex],
          result: {
            ...newToolCalls[confirmIndex].result as Record<string, unknown>,
            waitingConfirmation: false,
            userAnswers: event.answers,
          },
        }
        updateMessage({ toolCalls: newToolCalls })
      }
      break
    }

    // v2: 任务规划事件
    case 'task_plan_start':
      updateMessage({
        thinking: (msg.thinking ?? '') + '\n\n📋 正在规划任务...',
      })
      break

    case 'task_plan_complete': {
      const plan = event.plan
      if (plan && plan.chain) {
        const stepsText = plan.chain
          .map((step, i) => `${i + 1}. [${step.agent}] ${step.description}`)
          .join('\n')

        updateMessage({
          thinking: (msg.thinking ?? '')
            + `\n\n📋 任务规划完成`
            + `\n- 执行模式：${plan.strategy.mode}`
            + `\n- 步骤数：${plan.chain.length}`
            + `\n\n执行计划：\n${stepsText}`,
        })
      }
      break
    }

    // v2: 思考推理事件
    case 'thinker_start':
      updateMessage({
        thinking: (msg.thinking ?? '') + '\n\n🤔 正在思考执行策略...',
      })
      break

    case 'thinker_complete': {
      const { adjustments, risks, suggestions } = event
      let thinkerText = '\n\n🤔 思考完成'

      if (risks && risks.length > 0) {
        thinkerText += `\n\n风险评估：${risks.map(r => `\n- ${r.description}`).join('')}`
      }

      if (suggestions && suggestions.length > 0) {
        thinkerText += `\n\n建议：${suggestions.map(s => `\n- ${s.description}`).join('')}`
      }

      if (adjustments?.skipSteps && adjustments.skipSteps.length > 0) {
        thinkerText += `\n\n调整：跳过步骤 ${adjustments.skipSteps.join(', ')}`
      }

      updateMessage({
        thinking: (msg.thinking ?? '') + thinkerText,
      })
      break
    }

    // v2: 质量检查事件
    case 'quality_check_start':
      updateMessage({
        thinking: (msg.thinking ?? '') + '\n\n✅ 正在检查质量...',
      })
      break

    case 'quality_check_complete': {
      const result = event.result
      if (result) {
        let qualityText = '\n\n✅ 质量检查完成'
        qualityText += `\n- 结构有效：${result.structure.valid ? '是' : '否'}`
        qualityText += `\n- 完整性：${result.completeness.score}%`
        qualityText += `\n- 一致性：${result.consistency.score}%`

        if (result.suggestions && result.suggestions.length > 0) {
          qualityText += `\n\n改进建议：${result.suggestions.map(s => `\n- ${s.description}`).join('')}`
        }

        updateMessage({
          thinking: (msg.thinking ?? '') + qualityText,
        })
      }
      break
    }
  }
}
