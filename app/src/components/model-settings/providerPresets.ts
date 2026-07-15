import type { ProviderPreset } from './types'

/** 与 server seed / modelProviderEnv 对齐的供应商预设 */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    type: 'deepseek',
    label: 'DeepSeek',
    icon: 'chat-dot-round',
    color: '#4D6BFE',
    defaultBaseUrl: 'https://api.deepseek.com',
    website: 'https://platform.deepseek.com',
    description: 'DeepSeek V4，中文能力强，高性价比',
    placeholderApiKey: 'sk-...',
    defaultModels: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  },
  {
    type: 'mimo',
    label: 'Mimo',
    icon: 'magic-stick',
    color: '#FF6B35',
    defaultBaseUrl: 'https://token-plan-cn.xiaomimimo.com/v1',
    website: 'https://platform.xiaomimimo.com',
    description: '小米 Mimo，OpenAI 兼容接口',
    placeholderApiKey: 'tp-...',
    defaultModels: ['mimo-v2.5'],
  },
  {
    type: 'openai',
    label: 'OpenAI',
    icon: 'chat-line-round',
    color: '#10A37F',
    defaultBaseUrl: 'https://api.openai.com/v1',
    website: 'https://platform.openai.com',
    description: 'GPT-4o / GPT-4 系列',
    placeholderApiKey: 'sk-...',
    defaultModels: ['gpt-4o', 'gpt-4o-mini'],
  },
]
