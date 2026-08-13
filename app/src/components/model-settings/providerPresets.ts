import type { ProviderPreset } from './types'

/**
 * 供应商预设。
 * 默认模型的 capabilities 在此显式声明，不按 model id 运行时推断。
 */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    type: 'deepseek',
    label: 'DeepSeek',
    icon: 'chat-dot-round',
    color: '#4D6BFE',
    defaultBaseUrl: 'https://api.deepseek.com',
    website: 'https://platform.deepseek.com',
    description: 'DeepSeek V4，中文能力强，高性价比（V4 Flash/Pro 支持视觉多模态）',
    placeholderApiKey: 'sk-...',
    defaultModels: [
      {
        model: 'deepseek-v4-flash',
        name: 'DeepSeek V4 Flash',
        capabilities: ['chat', 'vision'],
      },
      {
        model: 'deepseek-v4-pro',
        name: 'DeepSeek V4 Pro',
        capabilities: ['chat', 'vision'],
      },
    ],
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
    defaultModels: [
      {
        model: 'mimo-v2.5',
        name: 'Mimo v2.5',
        capabilities: ['chat'],
      },
    ],
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
    defaultModels: [
      {
        model: 'gpt-4o',
        name: 'GPT-4o',
        capabilities: ['chat', 'vision'],
      },
      {
        model: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        capabilities: ['chat', 'vision'],
      },
    ],
  },
]
