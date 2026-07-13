export interface ModelProviderMeta {
  label: string
  tagType: '' | 'success' | 'warning' | 'info' | 'danger'
}

const PROVIDER_META: Record<string, ModelProviderMeta> = {
  deepseek: { label: 'DeepSeek', tagType: '' },
  mimo: { label: 'Mimo', tagType: 'danger' },
  openai: { label: 'OpenAI', tagType: 'success' },
  anthropic: { label: 'Anthropic', tagType: 'warning' },
  ollama: { label: 'Ollama', tagType: 'info' },
}

export function getModelProviderMeta(provider: string): ModelProviderMeta {
  return PROVIDER_META[provider] ?? { label: provider, tagType: 'info' }
}
