/**
 * 插件 Registry composable：fetch + 租户 + 只读 Cordis 投影。
 * Cordis overlay 写入只允许经 registryBridge.ingest。
 */

import { ref, computed } from 'vue'
import {
  fetchPluginRegistry,
  type PluginExpertSummary,
  type PluginSkillSummary,
  type PluginToolSummary,
  type PluginMcpServerSummary,
  type PluginWorkflowTemplateSummary,
} from '@/api/pluginApi'
import { fetchTenants, type TenantInfo } from '@/api/tenantApi'
import { useAuth } from '@schema-platform/platform-shared/utils/useAuth'
import {
  ensurePluginHost,
  getBuiltInTool,
  getPluginHost,
  getToolsByCategory,
  type ToolCategory,
  type ToolDef,
} from '@/plugins'
import {
  expertToPaletteItem,
  toolToPaletteItem,
  LEGACY_EXPERT_COLOR,
} from '@/plugins/plugins/registry-bridge/palette'

const experts = ref<PluginExpertSummary[]>([])
const skills = ref<PluginSkillSummary[]>([])
const tools = ref<PluginToolSummary[]>([])
const toolDefs = ref<ToolDef[]>([])
const mcpServers = ref<PluginMcpServerSummary[]>([])
const workflows = ref<PluginWorkflowTemplateSummary[]>([])
const loaded = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const tenants = ref<TenantInfo[]>([])
const tenantsLoading = ref(false)
const selectedTenantId = ref<string>('')

let cordisBound = false

/**
 * 从 Cordis bridge / Service 投影刷新本地 UI ref（第二份状态仅为 Vue 消费缓存）。
 */
function syncFromCordis(): void {
  const host = getPluginHost()
  const snap = host.registryBridge.getSnapshot()
  if (snap) {
    experts.value = snap.experts
    skills.value = snap.skills
    tools.value = snap.tools
    workflows.value = snap.workflows ?? []
  }
  toolDefs.value = host.chatTools.listOverlay()
  mcpServers.value = host.mcpDefs.list().map((d) => ({
    id: d.id,
    transport: d.transport,
    namespace: d.namespace,
    builtin: d.builtin,
  }))
}

/**
 * 绑定 Service 变更 → 投影（幂等）；保证 UI 只读 Cordis。
 * @returns 宿主 Context
 */
async function bindCordis() {
  const host = await ensurePluginHost()
  if (!cordisBound) {
    cordisBound = true
    host.on('registryBridge/changed', () => {
      syncFromCordis()
    })
    host.on('chatTools/changed', () => {
      toolDefs.value = host.chatTools.listOverlay()
    })
    host.on('mcpDefs/changed', () => {
      mcpServers.value = host.mcpDefs.list().map((d) => ({
        id: d.id,
        transport: d.transport,
        namespace: d.namespace,
        builtin: d.builtin,
      }))
    })
  }
  return host
}

export function usePluginRegistry() {
  const toolPaletteItems = computed(() => toolDefs.value.map(toolToPaletteItem))

  const expertPaletteItems = computed(() =>
    experts.value
      .filter((e) => !e.runtime?.length || e.runtime.includes('workflow'))
      .map(expertToPaletteItem),
  )

  async function load() {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      const tenantId = selectedTenantId.value || undefined
      const data = await fetchPluginRegistry(tenantId)
      const host = await bindCordis()
      host.registryBridge.ingest(data)
      syncFromCordis()
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
    const host = getPluginHost()
    const fromCordis = category
      ? host.chatTools.getByCategory(category, 'all')
      : host.chatTools.list()
    if (fromCordis.length > 0) return fromCordis
    return category ? getToolsByCategory(category) : []
  }

  function resolveToolDef(name: string): ToolDef | undefined {
    try {
      const host = getPluginHost()
      return host.chatTools.get(name) ?? getBuiltInTool(name)
    } catch {
      return getBuiltInTool(name)
    }
  }

  return {
    experts,
    skills,
    tools,
    mcpServers,
    workflows,
    loaded,
    loading,
    error,
    toolPaletteItems,
    expertPaletteItems,
    load,
    expertColor,
    getToolsForPanel,
    resolveToolDef,
    tenants,
    tenantsLoading,
    selectedTenantId,
    loadTenants,
    setTenant,
  }
}

export function getExpertColorByLegacy(legacy?: string): string {
  return LEGACY_EXPERT_COLOR[legacy ?? ''] ?? '#909399'
}
