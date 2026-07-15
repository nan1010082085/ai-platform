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

export interface ModelOption {
  value: string
  label: string
  shortLabel: string
  provider: string
  model: string
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
      const option: ModelOption = {
        value: m.model,
        label: `${p.name} · ${m.model}`,
        shortLabel: p.name,
        provider: p.type,
        model: m.model,
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

/** 从旧 model-configs 构建 flat options（无分组） */
function fromLegacyConfigs(items: ModelConfigItem[]): ModelOption[] {
  return items.map((item) => ({
    value: item.model,
    label: `${item.name} · ${item.model}`,
    shortLabel: item.name,
    provider: item.provider,
    model: item.model,
    isDefault: item.isDefault,
    configId: item.id,
    source: item.id.startsWith('env:') ? 'env' : 'db',
  }))
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
      } catch {
        // providers API 失败，继续 fallback
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
      modelOptions.value = fromLegacyConfigs(items)
      providerGroups.value = []
      const defaultItem = items.find((item) => item.isDefault)
      defaultModel.value = defaultItem?.model ?? res.items[0]?.model ?? items[0]?.model ?? ''
      loaded.value = true
    } catch {
      try {
        const envItems = await loadEnvModelOptions()
        if (envItems.length > 0) {
          modelOptions.value = fromLegacyConfigs(envItems)
          providerGroups.value = []
          const defaultItem = envItems.find((item) => item.isDefault) ?? envItems[0]
          defaultModel.value = defaultItem?.model ?? ''
          dataSource.value = 'env'
          loaded.value = true
        }
      } catch {
        // Keep existing data on failure
      }
    } finally {
      loading.value = false
    }
  }

  /** 是否有按供应商分组的数据（providers API 成功时才有） */
  const hasGroupedData = computed(() => providerGroups.value.length > 0)

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
