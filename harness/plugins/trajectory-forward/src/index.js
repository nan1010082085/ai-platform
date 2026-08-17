/**
 * 轨迹投影：在 ctx.sessionProjections 上注册 platform.nodeTrace 读模型。
 *
 * 把 DSH 会话事件（turn/step/tool/assistant）折叠为平台侧 AgentNodeTrace 结构，
 * 供 workflow 执行日志与前端轨迹页签消费。折叠规则与 DSH 官方 Trajectory 一致：
 * 按轮次组织、callId 配对工具调用、全量值状态（last-wins）。
 * 投影 schema 使用 zod（框架以 schema.parse 校验视图；schemastery 只用于插件 Config）。
 */

import { z } from 'zod'

export const name = 'ai-harness-trajectory-forward'

export const inject = ['sessionProjections']

/** platform.nodeTrace 视图 schema（与 AgentNodeTrace 协议类型一一对应） */
const traceSchema = z.object({
  turns: z.array(z.object({
    turn: z.number().int(),
    startSeq: z.number().int(),
    endSeq: z.number().int().nullable(),
    endReason: z.string().nullable(),
  })),
  toolCalls: z.array(z.object({
    callId: z.string(),
    turn: z.number().int(),
    step: z.number().int(),
    name: z.string(),
    arguments: z.string(),
    callSeq: z.number().int(),
    resultSeq: z.number().int().nullable(),
    isError: z.boolean().nullable(),
  })),
  messages: z.array(z.object({
    turn: z.number().int(),
    step: z.number().int(),
    text: z.string(),
  })),
})

function textOf(message) {
  return (message?.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

export function apply(ctx) {
  const unregister = ctx.sessionProjections.register({
    key: 'platform.nodeTrace',
    stateVersion: 1,
    schema: traceSchema,
    init: () => ({ turns: [], toolCalls: [], messages: [] }),
    apply(state, event) {
      const data = event.data ?? {}
      switch (event.type) {
        case 'turn/start':
          return {
            ...state,
            turns: [...state.turns, {
              turn: data.turn,
              startSeq: event.seq,
              endSeq: null,
              endReason: null,
            }],
          }
        case 'turn/end':
          return {
            ...state,
            turns: state.turns.map((turn) =>
              turn.turn === data.turn
                ? {
                    ...turn,
                    endSeq: event.seq,
                    endReason: data.reason?.kind ?? 'unknown',
                  }
                : turn,
            ),
          }
        case 'tool/call':
          return {
            ...state,
            toolCalls: [...state.toolCalls, {
              callId: data.callId,
              turn: data.turn,
              step: data.step,
              name: data.name,
              arguments: data.arguments,
              callSeq: event.seq,
              resultSeq: null,
              isError: null,
            }],
          }
        case 'tool/result': {
          const block = data.message?.content?.[0]
          const callId = block?.toolCallId
          return {
            ...state,
            toolCalls: state.toolCalls.map((call) =>
              call.callId === callId
                ? {
                    ...call,
                    resultSeq: event.seq,
                    isError: Boolean(block?.isError ?? false),
                  }
                : call,
            ),
          }
        }
        case 'assistant/message': {
          const text = textOf(data.message)
          if (text === '') return state
          return {
            ...state,
            messages: [...state.messages, {
              turn: data.turn,
              step: data.step,
              text,
            }],
          }
        }
        default:
          return state
      }
    },
    view: (state) => state,
  })
  return unregister
}
