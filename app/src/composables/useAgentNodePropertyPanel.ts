import { markRaw, type Component } from 'vue'
import type { AgentNodeType } from '@/types/agentWorkflow'
import DefaultNodePanel from '@/components/agent-workflow/property-panel/panels/DefaultNodePanel.vue'
import TriggerNodePanel from '@/components/agent-workflow/property-panel/panels/TriggerNodePanel.vue'
import WebhookTriggerNodePanel from '@/components/agent-workflow/property-panel/panels/WebhookTriggerNodePanel.vue'
import LlmNodePanel from '@/components/agent-workflow/property-panel/panels/LlmNodePanel.vue'
import AgentNodePanel from '@/components/agent-workflow/property-panel/panels/AgentNodePanel.vue'
import ToolNodePanel from '@/components/agent-workflow/property-panel/panels/ToolNodePanel.vue'
import IfNodePanel from '@/components/agent-workflow/property-panel/panels/IfNodePanel.vue'
import HitlNodePanel from '@/components/agent-workflow/property-panel/panels/HitlNodePanel.vue'

const registry = new Map<AgentNodeType, Component>([
  ['manual-trigger', markRaw(TriggerNodePanel)],
  ['webhook-trigger', markRaw(WebhookTriggerNodePanel)],
  ['llm', markRaw(LlmNodePanel)],
  ['agent', markRaw(AgentNodePanel)],
  ['tool', markRaw(ToolNodePanel)],
  ['if', markRaw(IfNodePanel)],
  ['hitl', markRaw(HitlNodePanel)],
  ['end', markRaw(DefaultNodePanel)],
])

export const AGENT_NODE_TYPE_LABELS: Record<AgentNodeType, string> = {
  'manual-trigger': '手动触发',
  'webhook-trigger': 'Webhook 触发',
  llm: 'LLM',
  agent: '专家 Agent',
  tool: '工具',
  if: '条件分支',
  hitl: '人工确认',
  end: '结束',
}

export function useAgentNodePropertyPanel() {
  function getPanelComponent(nodeType: string): Component {
    return registry.get(nodeType as AgentNodeType) ?? DefaultNodePanel
  }

  function getNodeTypeLabel(nodeType: string): string {
    return AGENT_NODE_TYPE_LABELS[nodeType as AgentNodeType] ?? nodeType
  }

  return { getPanelComponent, getNodeTypeLabel }
}
