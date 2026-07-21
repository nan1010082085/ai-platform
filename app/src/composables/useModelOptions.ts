/**
 * useModelOptions -- from configured Providers dynamically get model list
 *
 * Primary source: GET /api/providers + /api/models (via listProvidersWithModels).
 * Fallback: GET /api/model-configs (legacy).
 * Supports grouped-by-provider structure alongside flat model list.
 */
import { ref, readonly, computed, onMounted } from 'vue'
import {
  listProvidersWithModels,
  type ProviderWithModels,
} from '@/api/providerApi'
import { getModelConfigs, type ModelConfigItem, type ModelProvider } from '@/api/modelConfigApi'
import { checkAIHealth } from '@/api/aiApi'
import type { ModelCapability } from '@schema-platform/platform-shared/ai'

export interface ModelOption {
  value: string
  label: string
  shortLabel: string
  provider: string
  model: string
  capabilities: ModelCapability[]
  isDefault: boolean
  configId: string
  source: 'db' | 'env' | 'provider'
}

/** 按供应商分组的模型结构 */
export interface ProviderGroup {
  providerId: string
  providerName: string
  providerType: string
  models: ModelOption[]
}

// Module-level shared state (singleton across the app)
const modelOptions = ref<ModelOption[]>([])
const providerGroups = ref<ProviderGroup[]>([])
const loading = ref(false)
const loaded = ref(false)
const defaultModel = ref<string>('')
const dataSource = ref<'providers' | 'model-configs' | 'env'>('providers')

const HEALTH_PROVIDER_MAP: Record<string, ModelProvider> = {
  deepseek: 'deepseek',
  mimo: 'mimo',
}

/** 从 ProviderWithModels 构建 flat options + grouped 结构 */
function fromProviders(providers: ProviderWithModels[]): {
  flat: ModelOption[]
  groups: ProviderGroup[]
} {
  const flat: ModelOption[] = []
  const groups: ProviderGroup[] = []

  for (const p of providers) {
    if (!p.isActive) continue

    const groupModels: ModelOption[] = []
    for (const m of p.models) {
      if (!m.isActive) continue
      const displayName = m.name?.trim() || m.model
      const option: ModelOption = {
        value: m.model,
        label: `${p.name} · ${displayName}`,
        shortLabel: displayName,
        provider: p.type,
        model: m.model,
        capabilities: m.capabilities ?? ['chat'],
        isDefault: m.isDefault,
        configId: m.id,
        source: 'provider',
      }
      flat.push(option)
      groupModels.push(option)
    }

    if (groupModels.length > 0) {
      groups.push({
        providerId: p.id,
        providerName: p.name,
        providerType: p.type,
        models: groupModels,
      })
    }
  }

  return { flat, groups }
}

/** 从旧 model-configs 构建 flat options + 按 provider 分组 */
function fromLegacyConfigs(items: ModelConfigItem[]): {
  flat: ModelOption[]
  groups: ProviderGroup[]
} {
  const flat = items.map((item) => ({
    value: item.model,
    label: `${item.name} · ${item.model}`,
    shortLabel: item.name,
    provider: item.provider,
    model: item.model,
    capabilities: ['chat'] as ModelCapability[],
    isDefault: item.isDefault,
    configId: item.id,
    source: (item.id.startsWith('env:') ? 'env' : 'db') as ModelOption['source'],
  }))

  const map = new Map<string, ProviderGroup>()
  for (const option of flat) {
    const key = option.provider || 'other'
    let group = map.get(key)
    if (!group) {
      const metaLabel =
        key === 'deepseek' ? 'DeepSeek'
        : key === 'mimo' ? 'Mimo'
        : key === 'openai' ? 'OpenAI'
        : key === 'anthropic' ? 'Anthropic'
        : key === 'ollama' ? 'Ollama'
        : key
      group = {
        providerId: `legacy:${key}`,
        providerName: metaLabel,
        providerType: key,
        models: [],
      }
      map.set(key, group)
    }
    group.models.push(option)
  }

  return { flat, groups: [...map.values()] }
}

async function loadEnvModelOptions(): Promise<ModelConfigItem[]> {
  const health = await checkAIHealth()
  if (health.status !== 'ok' || health.providers.length === 0) return []

  return health.providers
    .filter((provider) => HEALTH_PROVIDER_MAP[provider.name])
    .map((provider) => {
    const mappedProvider = HEALTH_PROVIDER_MAP[provider.name]!
    const label = mappedProvider === 'deepseek' ? 'DeepSeek' : 'Mimo'
    return {
      id: `env:${provider.name}`,
      name: `${label}（环境变量）`,
      provider: mappedProvider,
      model: provider.model,
      apiKey: '****',
      baseUrl: '',
      isDefault: provider.isDefault,
    }
  })
}

export function useModelOptions() {
  async function loadModelOptions(): Promise<void> {
    if (loading.value) return
    loading.value = true
    try {
      // 优先：providers + models API
      try {
        const providers = await listProvidersWithModels()
        const { flat, groups } = fromProviders(providers)
        if (flat.length > 0) {
          modelOptions.value = flat
          providerGroups.value = groups
          const defaultItem = flat.find((o) => o.isDefault) ?? flat[0]
          defaultModel.value = defaultItem?.model ?? ''
          dataSource.value = 'providers'
          loaded.value = true
          return
        }
      } catch (err) {
        // providers API 失败，继续 fallback
        console.warn('[useModelOptions] providers API failed, falling back:', err instanceof Error ? err.message : err)
      }

      // Fallback：旧 model-configs API
      const res = await getModelConfigs({ pageSize: 100 })
      let items = res.items
      if (items.length === 0) {
        items = await loadEnvModelOptions()
        dataSource.value = 'env'
      } else {
        dataSource.value = 'model-configs'
      }
      const legacy = fromLegacyConfigs(items)
      modelOptions.value = legacy.flat
      providerGroups.value = legacy.groups
      const defaultItem = items.find((item) => item.isDefault)
      defaultModel.value = defaultItem?.model ?? res.items[0]?.model ?? items[0]?.model ?? ''
      loaded.value = true
    } catch (err) {
      console.warn('[useModelOptions] model-configs API failed, trying env fallback:', err instanceof Error ? err.message : err)
      try {
        const envItems = await loadEnvModelOptions()
        if (envItems.length > 0) {
          const { flat, groups } = fromLegacyConfigs(envItems)
          modelOptions.value = flat
          providerGroups.value = groups
          const defaultItem = envItems.find((item) => item.isDefault) ?? envItems[0]
          defaultModel.value = defaultItem?.model ?? ''
          dataSource.value = 'env'
          loaded.value = true
        }
      } catch (envErr) {
        console.error('[useModelOptions] All model loading failed:', envErr instanceof Error ? envErr.message : envErr)
      }
    } finally {
      loading.value = false
    }
  }

  /** 是否有按供应商分组的数据（providers API 成功时才有） */
  const hasGroupedData = computed(() => providerGroups.value.length > 0)

  /** 按能力过滤 flat options（无 capability 时返回全部） */
  function getModelOptionsByCapability(capability?: ModelCapability): ModelOption[] {
    if (!capability) return [...modelOptions.value]
    return modelOptions.value.filter((o) => o.capabilities.includes(capability))
  }

  /** 按能力过滤分组（无 capability 时返回全部） */
  function getProviderGroupsByCapability(capability?: ModelCapability): ProviderGroup[] {
    if (!capability) return [...providerGroups.value]
    return providerGroups.value
      .map((g) => ({
        ...g,
        models: g.models.filter((o) => o.capabilities.includes(capability)),
      }))
      .filter((g) => g.models.length > 0)
  }

  onMounted(() => {
    if (!loaded.value) {
      void loadModelOptions()
    }
  })

  return {
    modelOptions: readonly(modelOptions),
    providerGroups: readonly(providerGroups),
    hasGroupedData,
    loading: readonly(loading),
    loaded: readonly(loaded),
    defaultModel: readonly(defaultModel),
    dataSource: readonly(dataSource),
    loadModelOptions,
    getModelOptionsByCapability,
    getProviderGroupsByCapability,
  }
}

/**
 * Reset shared state. For testing only.
 */
export function _resetModelOptionsState(): void {
  modelOptions.value = []
  providerGroups.value = []
  loading.value = false
  loaded.value = false
  defaultModel.value = ''
  dataSource.value = 'providers'
}
