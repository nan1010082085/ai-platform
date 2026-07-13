/**
 * useModelOptions -- from configured Providers dynamically get model list
 *
 * Replaces CHAT_MODEL_OPTIONS hardcoding, gets available models from /api/model-configs.
 * Supports unified use across Chat / Workflow.
 */
import { ref, readonly, onMounted } from 'vue'
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
  source: 'db' | 'env'
}

// Module-level shared state (singleton across the app)
const modelOptions = ref<ModelOption[]>([])
const loading = ref(false)
const loaded = ref(false)
const defaultModel = ref<string>('')

const HEALTH_PROVIDER_MAP: Record<string, ModelProvider> = {
  deepseek: 'deepseek',
  mimo: 'mimo',
}

function toOptions(items: ModelConfigItem[]): ModelOption[] {
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
      const res = await getModelConfigs({ pageSize: 100 })
      let items = res.items
      if (items.length === 0) {
        items = await loadEnvModelOptions()
      }
      modelOptions.value = toOptions(items)
      const defaultItem = items.find((item) => item.isDefault)
      defaultModel.value = defaultItem?.model ?? res.items[0]?.model ?? items[0]?.model ?? ''
      loaded.value = true
    } catch {
      try {
        const envItems = await loadEnvModelOptions()
        if (envItems.length > 0) {
          modelOptions.value = toOptions(envItems)
          const defaultItem = envItems.find((item) => item.isDefault) ?? envItems[0]
          defaultModel.value = defaultItem?.model ?? ''
          loaded.value = true
        }
      } catch {
        // Keep existing data on failure
      }
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    if (!loaded.value) {
      void loadModelOptions()
    }
  })

  return {
    modelOptions: readonly(modelOptions),
    loading: readonly(loading),
    loaded: readonly(loaded),
    defaultModel: readonly(defaultModel),
    loadModelOptions,
  }
}

/**
 * Reset shared state. For testing only.
 */
export function _resetModelOptionsState(): void {
  modelOptions.value = []
  loading.value = false
  loaded.value = false
  defaultModel.value = ''
}
