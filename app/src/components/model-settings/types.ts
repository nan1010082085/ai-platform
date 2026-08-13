import type { ProviderType } from '@/api/providerApi'
import type { ModelCapability } from '@schema-platform/platform-shared/ai'

/** 供应商预设里附带的默认模型（能力写死在配置里，不按 id 猜测） */
export interface PresetDefaultModel {
  /** 上游模型标识 */
  model: string
  /** 展示名称 */
  name: string
  /** 默认能力 */
  capabilities: ModelCapability[]
}

export interface ProviderPreset {
  type: ProviderType
  label: string
  icon: string
  color: string
  defaultBaseUrl: string
  website: string
  description: string
  placeholderApiKey: string
  defaultModels: PresetDefaultModel[]
}
