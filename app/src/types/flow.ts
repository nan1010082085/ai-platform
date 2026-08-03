/**
 * FlowGraph 类型定义
 *
 * 对齐后端 FlowGraph 结构。
 */

export interface FlowNodeData {
  bpmnType: string
  label?: string
  description?: string
  [key: string]: unknown
}

export interface FlowNode {
  id: string
  data: FlowNodeData
  position?: { x: number; y: number }
  width?: number
  height?: number
}

export interface FlowEdgeData {
  conditionExpression?: string
  isDefault?: boolean
  [key: string]: unknown
}

export interface FlowEdge {
  id: string
  source: { cell: string }
  target: { cell: string }
  data?: FlowEdgeData
}

export interface FlowGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
}
