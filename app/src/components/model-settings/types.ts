import type { ProviderType } from '@/api/providerApi'

export interface ProviderPreset {
  type: ProviderType
  label: string
  icon: string
  color: string
  defaultBaseUrl: string
  website: string
  description: string
  placeholderApiKey: string
  defaultModels: string[]
}
