/**
 * Model Provider Presets
 *
 * 预置常用 LLM Provider 的默认配置，方便用户一键添加。
 * 支持从预设快速创建配置、过滤未配置的 Provider。
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

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    provider: 'deepseek',
    label: 'DeepSeek',
    icon: 'chat-dot-round',
    color: '#4D6BFE',
    defaultModel: 'deepseek-chat',
    defaultBaseUrl: '',
    description: '国产高性价比模型，中文能力强',
    placeholderApiKey: 'sk-...',
  },
  {
    provider: 'openai',
    label: 'OpenAI',
    icon: 'chat-line-round',
    color: '#10A37F',
    defaultModel: 'gpt-4o',
    defaultBaseUrl: '',
    description: 'GPT-4o 多模态模型，全球领先',
    placeholderApiKey: 'sk-...',
  },
  {
    provider: 'anthropic',
    label: 'Anthropic',
    icon: 'chat-square',
    color: '#D97706',
    defaultModel: 'claude-sonnet-4-20250514',
    defaultBaseUrl: '',
    description: 'Claude 系列，长文本理解能力突出',
    placeholderApiKey: 'sk-ant-...',
  },
  {
    provider: 'ollama',
    label: 'Ollama',
    icon: 'monitor',
    color: '#6366F1',
    defaultModel: 'llama3',
    defaultBaseUrl: 'http://localhost:11434/v1',
    description: '本地部署，隐私安全，无需 API Key',
    placeholderApiKey: '无需填写',
  },
  {
    provider: 'mimo',
    label: 'Mimo',
    icon: 'magic-stick',
    color: '#FF6B35',
    defaultModel: 'mimo-v2.5',
    defaultBaseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
    description: '小米 Mimo 模型，中文优化，高性价比',
    placeholderApiKey: 'tp-...',
  },
]

export function useModelPresets() {
  function getPreset(provider: ModelProvider): ProviderPreset | undefined {
    return PROVIDER_PRESETS.find((p) => p.provider === provider)
  }

  function getPresetByLabel(label: string): ProviderPreset | undefined {
    return PROVIDER_PRESETS.find((p) => p.label === label)
  }

  function getAllPresets(): ProviderPreset[] {
    return [...PROVIDER_PRESETS]
  }

  function getProviderOptions(): Array<{ value: ModelProvider; label: string; description: string }> {
    return PROVIDER_PRESETS.map((p) => ({
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

  /**
   * 从预设生成创建配置的 payload。
   * @param preset - Provider 预设
   * @param apiKey - 可选的 API Key（Ollama 等不需要）
   */
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

  /**
   * 过滤出当前没有任何配置的 Provider，用于快速添加区域展示。
   * 只显示尚未配置任何模型的 Provider，避免重复。
   */
  function getQuickAddOptions(existingConfigs: ModelConfigItem[]): ProviderPreset[] {
    const configuredProviders = new Set(existingConfigs.map((c) => c.provider))
    return PROVIDER_PRESETS.filter((p) => !configuredProviders.has(p.provider))
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
