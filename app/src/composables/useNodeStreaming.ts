/**
 * useNodeStreaming — 节点级实时流式订阅（复用 server 现有的 streamingOutput + workflow:node-event）。
 *
 * 服务端已有能力：
 * - `setStreamingOutput`：按 executionId + nodeId 写 streamingOutput 字段（LLM 输出、agent-loop 进度）
 * - `emitWorkflowNodeEvent`：per-node 事件（tool-call / flow_started / approval_analyzed 等）
 * - `workflow:event` 全量快照（含 streamingOutput 字段）
 *
 * 前端原未消费这些信号——本 composable 把它们桥接为 Vue 响应式状态。
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
  updatedAt: string | null
  events: WorkflowNodeEvent[]
}

/** 一次执行的节点级流状态 */
export interface ExecutionStreamState {
  /** streamingOutput（server 推送的全量快照中提取） */
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
    current: null,
    nodeEvents: [],
    eventCounts: {},
  })

  let offEvent: (() => void) | null = null
  let offNodeEvent: (() => void) | null = null

  function handleEvent(data: WorkflowEvent) {
    if (!executionId.value || data.executionId !== executionId.value) return
    const so = data.execution.streamingOutput
    if (so) {
      stream.value.current = {
        nodeId: so.nodeId,
        nodeType: so.nodeType,
        text: so.text,
        updatedAt: so.updatedAt,
      }
    } else {
      // streamingOutput 被 clear（节点完成）
      stream.value.current = null
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
    stream.value = { current: null, nodeEvents: [], eventCounts: {} }
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
