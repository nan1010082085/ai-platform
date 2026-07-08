/**
 * useModelOptions -- from configured Providers dynamically get model list
 *
 * Replaces CHAT_MODEL_OPTIONS hardcoding, gets available models from /api/model-configs.
 * Supports unified use across Chat / Workflow.
 */
import { ref, readonly, onMounted } from 'vue'
import { getModelConfigs, type ModelConfigItem } from '@/api/modelConfigApi'

export interface ModelOption {
  value: string
  label: string
  shortLabel: string
  provider: string
  model: string
  isDefault: boolean
  configId: string
}

// Module-level shared state (singleton across the app)
const modelOptions = ref<ModelOption[]>([])
const loading = ref(false)
const loaded = ref(false)
const defaultModel = ref<string>('')

function toOptions(items: ModelConfigItem[]): ModelOption[] {
  return items.map((item) => ({
    value: item.model,
    label: `${item.name} (${item.provider})`,
    shortLabel: item.name,
    provider: item.provider,
    model: item.model,
    isDefault: item.isDefault,
    configId: item.id,
  }))
}

export function useModelOptions() {
  async function loadModelOptions(): Promise<void> {
    if (loading.value) return
    loading.value = true
    try {
      const res = await getModelConfigs({ pageSize: 100 })
      modelOptions.value = toOptions(res.items)
      const defaultItem = res.items.find((item) => item.isDefault)
      defaultModel.value = defaultItem?.model ?? res.items[0]?.model ?? ''
      loaded.value = true
    } catch {
      // Load failure: keep existing data, don't clear
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
