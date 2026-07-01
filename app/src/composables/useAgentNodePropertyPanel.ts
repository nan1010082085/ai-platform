import { markRaw, type Component } from 'vue'
import type { AgentNodeType } from '@/types/agentWorkflow'
import { TOOL_NODE_TYPES, getToolNodeTypeLabel } from '@/constants/toolNodeTypes'
import { EXPERT_NODE_TYPES, getExpertNodeTypeLabel } from '@/constants/expertNodeTypes'
import DefaultNodePanel from '@/components/agent-workflow/property-panel/panels/DefaultNodePanel.vue'
import TriggerNodePanel from '@/components/agent-workflow/property-panel/panels/TriggerNodePanel.vue'
import WebhookTriggerNodePanel from '@/components/agent-workflow/property-panel/panels/WebhookTriggerNodePanel.vue'
import LlmNodePanel from '@/components/agent-workflow/property-panel/panels/LlmNodePanel.vue'
import AgentNodePanel from '@/components/agent-workflow/property-panel/panels/AgentNodePanel.vue'
import ToolNodePanel from '@/components/agent-workflow/property-panel/panels/ToolNodePanel.vue'
import IfNodePanel from '@/components/agent-workflow/property-panel/panels/IfNodePanel.vue'
import HitlNodePanel from '@/components/agent-workflow/property-panel/panels/HitlNodePanel.vue'
import DocumentParseNodePanel from '@/components/agent-workflow/property-panel/panels/DocumentParseNodePanel.vue'

const toolPanel = markRaw(ToolNodePanel)
const agentPanel = markRaw(AgentNodePanel)

const registry = new Map<AgentNodeType, Component>([
  ['manual-trigger', markRaw(TriggerNodePanel)],
  ['webhook-trigger', markRaw(WebhookTriggerNodePanel)],
  ['document-parse', markRaw(DocumentParseNodePanel)],
  ['llm', markRaw(LlmNodePanel)],
  ['agent', agentPanel],
  ['tool', toolPanel],
  ['if', markRaw(IfNodePanel)],
  ['hitl', markRaw(HitlNodePanel)],
  ['end', markRaw(DefaultNodePanel)],
])

for (const type of TOOL_NODE_TYPES) {
  registry.set(type, toolPanel)
}

for (const type of EXPERT_NODE_TYPES) {
  registry.set(type, agentPanel)
}

export const AGENT_NODE_TYPE_LABELS: Record<string, string> = {
  'manual-trigger': '手动触发',
  'webhook-trigger': 'Webhook 触发',
  'document-parse': '文档解析',
  llm: 'LLM',
  agent: '专家 Agent',
  tool: '工具',
  if: '条件分支',
  hitl: '人工确认',
  end: '结束',
  ...Object.fromEntries(
    TOOL_NODE_TYPES.map((type) => [type, getToolNodeTypeLabel(type) ?? type]),
  ),
  ...Object.fromEntries(
    EXPERT_NODE_TYPES.map((type) => [type, getExpertNodeTypeLabel(type) ?? type]),
  ),
}

export function useAgentNodePropertyPanel() {
  function getPanelComponent(nodeType: string): Component {
    return registry.get(nodeType as AgentNodeType) ?? DefaultNodePanel
  }

  function getNodeTypeLabel(nodeType: string): string {
    return AGENT_NODE_TYPE_LABELS[nodeType] ?? nodeType
  }

  return { getPanelComponent, getNodeTypeLabel }
}
