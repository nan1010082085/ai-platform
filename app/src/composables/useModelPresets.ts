/**
 * Model Provider Presets
 *
 * 平台默认仅接入 DeepSeek + Mimo（见 ai/docs/environment-variables.md）。
 */

import { type ModelProvider, type CreateModelConfigPayload, type ModelConfigItem } from '@/api/modelConfigApi'

export interface ProviderPreset {
  provider: ModelProvider
  label: string
  icon: string
  color: string
  defaultModel: string
  defaultBaseUrl: string
  description: string
  placeholderApiKey: string
}

/** 平台默认可快速添加的 Provider */
export const PLATFORM_PROVIDER_PRESETS: ProviderPreset[] = [
  {
    provider: 'deepseek',
    label: 'DeepSeek',
    icon: 'chat-dot-round',
    color: '#4D6BFE',
    defaultModel: 'deepseek-v4-flash',
    defaultBaseUrl: 'https://api.deepseek.com',
    description: 'DeepSeek V4，中文能力强，高性价比',
    placeholderApiKey: 'sk-...',
  },
  {
    provider: 'mimo',
    label: 'Mimo',
    icon: 'magic-stick',
    color: '#FF6B35',
    defaultModel: 'mimo-v2.5',
    defaultBaseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
    description: '小米 Mimo，OpenAI 兼容接口',
    placeholderApiKey: 'tp-...',
  },
]

/** @deprecated 使用 PLATFORM_PROVIDER_PRESETS */
export const PROVIDER_PRESETS = PLATFORM_PROVIDER_PRESETS

export function useModelPresets() {
  function getPreset(provider: ModelProvider): ProviderPreset | undefined {
    return PLATFORM_PROVIDER_PRESETS.find((p) => p.provider === provider)
  }

  function getPresetByLabel(label: string): ProviderPreset | undefined {
    return PLATFORM_PROVIDER_PRESETS.find((p) => p.label === label)
  }

  function getAllPresets(): ProviderPreset[] {
    return [...PLATFORM_PROVIDER_PRESETS]
  }

  function getProviderOptions(): Array<{ value: ModelProvider; label: string; description: string }> {
    return PLATFORM_PROVIDER_PRESETS.map((p) => ({
      value: p.provider,
      label: p.label,
      description: p.description,
    }))
  }

  function applyPreset(provider: ModelProvider): {
    model: string
    baseUrl: string
    placeholderApiKey: string
  } | null {
    const preset = getPreset(provider)
    if (!preset) return null
    return {
      model: preset.defaultModel,
      baseUrl: preset.defaultBaseUrl,
      placeholderApiKey: preset.placeholderApiKey,
    }
  }

  function createConfigFromPreset(
    preset: ProviderPreset,
    apiKey?: string,
  ): CreateModelConfigPayload {
    return {
      name: `${preset.label} (${preset.defaultModel})`,
      provider: preset.provider,
      model: preset.defaultModel,
      baseUrl: preset.defaultBaseUrl || undefined,
      apiKey: apiKey || undefined,
      parameters: { temperature: 0.7, maxTokens: 4096 },
      isDefault: false,
    }
  }

  function getQuickAddOptions(existingConfigs: ModelConfigItem[]): ProviderPreset[] {
    const configuredProviders = new Set(existingConfigs.map((c) => c.provider))
    return PLATFORM_PROVIDER_PRESETS.filter((p) => !configuredProviders.has(p.provider))
  }

  return {
    getPreset,
    getPresetByLabel,
    getAllPresets,
    getProviderOptions,
    applyPreset,
    createConfigFromPreset,
    getQuickAddOptions,
  }
}
