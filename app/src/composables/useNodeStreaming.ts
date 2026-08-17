/**
 * useNodeStreaming — 节点级实时流式订阅。
 *
 * 消费两种数据源：
 * - `workflow:event` 快照（含 streamingOutputs per-node map + 向后兼容 streamingOutput）
 * - `workflow:node-event` per-node 事件（tool-call / progress / dsh_session_started 等）
 *
 * 返回每个正在流式输出的节点状态 + 已收集的 node-event 事件流。
 */

import { ref, watch, onScopeDispose, type Ref } from 'vue'
import {
  subscribeWorkflowExecution,
  type WorkflowEvent,
} from '@/composables/useWorkflowExecutionStream'
import {
  onWorkflowNodeEvent,
  type WorkflowNodeEvent,
} from '@schema-platform/platform-shared/socket'

/** 单节点的实时流状态 */
export interface NodeStreamState {
  nodeId: string
  nodeType: string
  text: string
  updatedAt: string
}

/** 一次执行的节点级流状态 */
export interface ExecutionStreamState {
  /** 正在流式输出的所有节点（per-node map，可同时多个） */
  activeNodes: NodeStreamState[]
  /** 向后兼容：最近一条流式输出（单一节点，chat 消费链路仍在用） */
  current: NodeStreamState | null
  /** 已收集的 node-event 事件（按时间追加） */
  nodeEvents: WorkflowNodeEvent[]
  /** 最近 node-event 的事件类型统计 */
  eventCounts: Record<string, number>
}

/**
 * 订阅一次执行的节点级实时流。
 * 返回响应式状态 + 取消函数。
 */
export function useExecutionNodeStream(executionId: Ref<string | null>): {
  stream: Ref<ExecutionStreamState>
  stop: () => void
} {
  const stream = ref<ExecutionStreamState>({
    activeNodes: [],
    current: null,
    nodeEvents: [],
    eventCounts: {},
  })

  let offEvent: (() => void) | null = null
  let offNodeEvent: (() => void) | null = null

  function handleEvent(data: WorkflowEvent) {
    if (!executionId.value || data.executionId !== executionId.value) return

    // 优先用 streamingOutputs（per-node map，多节点并发流式）
    const streamingOutputs = data.execution.streamingOutputs
    if (streamingOutputs && Object.keys(streamingOutputs).length > 0) {
      const activeNodes: NodeStreamState[] = Object.entries(streamingOutputs).map(
        ([nodeId, entry]) => ({
          nodeId,
          nodeType: entry.nodeType,
          text: entry.text,
          updatedAt: entry.updatedAt,
        }),
      )
      stream.value.activeNodes = activeNodes
      // current 取最新的一条（向后兼容）
      const latest = activeNodes.reduce((a, b) =>
        (a.updatedAt > b.updatedAt ? a : b),
      )
      stream.value.current = latest
    } else {
      // 回退到 streamingOutput（向后兼容单一节点）
      const so = data.execution.streamingOutput
      if (so) {
        stream.value.current = {
          nodeId: so.nodeId,
          nodeType: so.nodeType,
          text: so.text,
          updatedAt: so.updatedAt,
        }
        stream.value.activeNodes = [stream.value.current]
      } else {
        stream.value.current = null
        stream.value.activeNodes = []
      }
    }
  }

  function handleNodeEvent(data: WorkflowNodeEvent) {
    if (!executionId.value || data.executionId !== executionId.value) return
    stream.value.nodeEvents = [...stream.value.nodeEvents, data]
    const t = data.eventType
    stream.value.eventCounts = {
      ...stream.value.eventCounts,
      [t]: (stream.value.eventCounts[t] ?? 0) + 1,
    }
  }

  function start() {
    stop()
    if (!executionId.value) return
    stream.value = { activeNodes: [], current: null, nodeEvents: [], eventCounts: {} }
    offEvent = subscribeWorkflowExecution(executionId.value, handleEvent)
    offNodeEvent = onWorkflowNodeEvent(handleNodeEvent)
  }

  function stop() {
    offEvent?.()
    offNodeEvent?.()
    offEvent = null
    offNodeEvent = null
  }

  watch(executionId, start, { immediate: true })
  onScopeDispose(stop)

  return { stream, stop }
}
