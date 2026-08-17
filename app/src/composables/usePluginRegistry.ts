import { ref, computed } from 'vue'
import { fetchPluginRegistry, type PluginExpertSummary, type PluginToolSummary, type PluginSkillSummary, type PluginMcpServerSummary } from '@/api/pluginApi'
import { fetchTenants, type TenantInfo } from '@/api/tenantApi'
import { useAuth } from '@schema-platform/platform-shared/utils/useAuth'
import type { AgentPaletteItem } from '@/plugins'
import type { AgentNodeType } from '@/types/agentWorkflow'
import {
  ensurePluginHost,
  getBuiltInTool,
  getToolsByCategory,
  registryToolsToDefs,
  TOOL_CATEGORY_LABELS,
  type ToolCategory,
  type ToolDef,
} from '@/plugins'

const experts = ref<PluginExpertSummary[]>([])
const skills = ref<PluginSkillSummary[]>([])
const tools = ref<PluginToolSummary[]>([])
const toolDefs = ref<ToolDef[]>([])
const mcpServers = ref<PluginMcpServerSummary[]>([])
const loaded = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

// ── 租户隔离 ──
const tenants = ref<TenantInfo[]>([])
const tenantsLoading = ref(false)
const selectedTenantId = ref<string>('')

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

function toolPaletteItem(tool: ToolDef): AgentPaletteItem {
  const ns = tool.name.includes('__') ? tool.name.split('__')[0] : tool.category
  const categoryHint = TOOL_CATEGORY_LABELS[tool.category] ?? tool.category
  const sourceHint = tool.source ? ` · ${tool.source}` : ''
  return {
    type: 'tool' as AgentNodeType,
    label: tool.label,
    icon: TOOL_NS_ICON[ns] ?? (tool.category === 'langgraph' ? 'cpu' : 'setting'),
    category: 'tools',
    description: `${categoryHint}${sourceHint}`,
    defaultData: {
      label: tool.label,
      toolName: tool.name,
    },
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
    },
  }
}

export function usePluginRegistry() {
  const toolPaletteItems = computed(() => toolDefs.value.map(toolPaletteItem))

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
      const tenantId = selectedTenantId.value || undefined
      const data = await fetchPluginRegistry(tenantId)
      experts.value = data.experts
      skills.value = data.skills
      tools.value = data.tools
      mcpServers.value = data.mcpServers
      const host = await ensurePluginHost()
      host.chatTools.setOverlay(registryToolsToDefs(data.tools))
      toolDefs.value = host.chatTools.listOverlay()
      // 动态节点条目同步进 nodeTypes 服务（palette 扩展点，M6 智能体节点同源注册）
      host.nodeTypes.setDynamic([
        ...toolDefs.value.map(toolPaletteItem),
        ...experts.value
          .filter((e) => !e.runtime?.length || e.runtime.includes('workflow'))
          .map(expertPaletteItem),
      ])
      loaded.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  async function loadTenants() {
    if (tenantsLoading.value) return
    tenantsLoading.value = true
    try {
      tenants.value = await fetchTenants()
      // 默认选中当前用户的租户
      if (!selectedTenantId.value) {
        const { user } = useAuth()
        const currentTenantId = user.value?.tenantId
        if (currentTenantId && tenants.value.some((t) => t.id === currentTenantId)) {
          selectedTenantId.value = currentTenantId
        }
      }
    } catch {
      // 租户加载失败不阻塞主流程
    } finally {
      tenantsLoading.value = false
    }
  }

  function setTenant(tenantId: string) {
    selectedTenantId.value = tenantId
    void load()
  }

  function expertColor(expertId: string): string {
    const expert = experts.value.find((e) => e.id === expertId)
    const legacy = expert?.legacyAgentKey ?? ''
    return LEGACY_EXPERT_COLOR[legacy] ?? '#9B59B6'
  }

  function getToolsForPanel(category?: ToolCategory): ToolDef[] {
    const fromRegistry = (category
      ? tools.value.filter((t) => registryToolsToDefs([t])[0].category === category)
      : tools.value
    ).map((t) => registryToolsToDefs([t])[0])
    if (fromRegistry.length > 0) return fromRegistry
    return category ? getToolsByCategory(category) : registryToolsToDefs(tools.value)
  }

  function resolveToolDef(name: string): ToolDef | undefined {
    const fromRegistry = tools.value.find((t) => t.name === name)
    if (fromRegistry) return registryToolsToDefs([fromRegistry])[0]
    return getBuiltInTool(name)
  }

  return {
    experts,
    skills,
    tools,
    mcpServers,
    loaded,
    loading,
    error,
    toolPaletteItems,
    expertPaletteItems,
    load,
    expertColor,
    getToolsForPanel,
    resolveToolDef,
    // ── 租户隔离 ──
    tenants,
    tenantsLoading,
    selectedTenantId,
    loadTenants,
    setTenant,
  }
}

export function getExpertColorByLegacy(legacy?: string): string {
  return LEGACY_EXPERT_COLOR[legacy ?? ''] ?? '#9B59B6'
}
