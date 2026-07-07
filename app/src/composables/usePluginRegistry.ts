import { ref, computed } from 'vue'
import { fetchPluginRegistry, type PluginExpertSummary, type PluginToolSummary } from '@/api/pluginApi'
import type { AgentPaletteItem } from '@/constants/agentNodes'
import type { AgentNodeType } from '@/types/agentWorkflow'
import {
  getBuiltInTool,
  getToolsByCategory,
  resolveToolCategory,
  type BuiltInToolDef,
  type ToolCategory,
} from '@/constants/agentTools'

const experts = ref<PluginExpertSummary[]>([])
const tools = ref<PluginToolSummary[]>([])
const loaded = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const LEGACY_EXPERT_ICON: Record<string, string> = {
  editor: 'document',
  flow: 'connection',
  page: 'monitor',
  general: 'user',
}

const LEGACY_EXPERT_COLOR: Record<string, string> = {
  editor: '#409EFF',
  flow: '#00D4FF',
  page: '#67C23A',
  general: '#909399',
}

const TOOL_NS_ICON: Record<string, string> = {
  schema: 'document',
  flow: 'connection',
  widget: 'grid',
  rag: 'search',
  industry: 'office-building',
}

function toolPaletteItem(tool: PluginToolSummary): AgentPaletteItem {
  const ns = tool.name.includes('__') ? tool.name.split('__')[0] : tool.kind
  return {
    type: 'tool' as AgentNodeType,
    label: tool.description?.trim() || tool.name,
    icon: TOOL_NS_ICON[ns] ?? (tool.kind === 'graph' ? 'cpu' : 'setting'),
    category: 'tools',
    description: [tool.kind, tool.source].filter(Boolean).join(' · ') || tool.name,
    defaultData: {
      label: tool.name,
      toolName: tool.name,
    },
  }
}

function registryToolToDef(tool: PluginToolSummary): BuiltInToolDef {
  const builtin = getBuiltInTool(tool.name)
  const category = builtin?.category
    ?? resolveToolCategory(tool.name)
    ?? (tool.kind === 'graph' ? 'langgraph' : tool.kind === 'http' ? 'workflow' : undefined)
  return {
    name: tool.name,
    label: builtin?.label ?? tool.description?.trim() ?? tool.name,
    description: builtin?.description ?? tool.description?.trim() ?? tool.name,
    argsHint: builtin?.argsHint ?? '{}',
    category: category ?? 'langgraph',
  }
}

function expertPaletteItem(expert: PluginExpertSummary): AgentPaletteItem {
  const legacy = expert.legacyAgentKey ?? ''
  return {
    type: 'expert' as AgentNodeType,
    label: expert.label,
    icon: LEGACY_EXPERT_ICON[legacy] ?? 'cpu',
    category: 'experts',
    description: expert.description ?? expert.id,
    defaultData: {
      label: expert.label,
      expertId: expert.id,
      ...(expert.legacyAgentKey ? { agentType: expert.legacyAgentKey as 'editor' | 'flow' | 'page' | 'general' } : {}),
    },
  }
}

export function usePluginRegistry() {
  const toolPaletteItems = computed(() => tools.value.map(toolPaletteItem))

  const expertPaletteItems = computed(() =>
    experts.value
      .filter((e) => !e.runtime?.length || e.runtime.includes('workflow'))
      .map(expertPaletteItem),
  )

  async function load() {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      const data = await fetchPluginRegistry()
      experts.value = data.experts
      tools.value = data.tools
      loaded.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  function expertColor(expertId: string): string {
    const expert = experts.value.find((e) => e.id === expertId)
    const legacy = expert?.legacyAgentKey ?? ''
    return LEGACY_EXPERT_COLOR[legacy] ?? '#9B59B6'
  }

  function getToolsForPanel(category?: ToolCategory): BuiltInToolDef[] {
    const fromRegistry = (category
      ? tools.value.filter((t) => registryToolToDef(t).category === category)
      : tools.value
    ).map(registryToolToDef)
    if (fromRegistry.length > 0) return fromRegistry
    return category ? getToolsByCategory(category) : tools.value.map(registryToolToDef)
  }

  function resolveToolDef(name: string): BuiltInToolDef | undefined {
    const fromRegistry = tools.value.find((t) => t.name === name)
    if (fromRegistry) return registryToolToDef(fromRegistry)
    return getBuiltInTool(name)
  }

  return {
    experts,
    tools,
    loaded,
    loading,
    error,
    toolPaletteItems,
    expertPaletteItems,
    load,
    expertColor,
    getToolsForPanel,
    resolveToolDef,
  }
}

export function getExpertColorByLegacy(legacy?: string): string {
  return LEGACY_EXPERT_COLOR[legacy ?? ''] ?? '#9B59B6'
}
