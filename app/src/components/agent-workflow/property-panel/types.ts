import type { Node } from '@vue-flow/core'

export interface AgentNodePanelProps {
  node: Node
}

export interface AgentNodePanelEmits {
  updateNodeData: [key: string, value: unknown]
}
