export const CHAT_MODEL_OPTIONS = [
  { value: 'deepseek-v4-flash', label: 'V4 Flash', shortLabel: 'Flash' },
  { value: 'deepseek-v4-pro', label: 'V4 Pro', shortLabel: 'Pro' },
] as const

export type ChatModel = typeof CHAT_MODEL_OPTIONS[number]['value']

export const DEFAULT_CHAT_MODEL: ChatModel = 'deepseek-v4-flash'

export function getChatModelLabel(model: string): string {
  return CHAT_MODEL_OPTIONS.find((item) => item.value === model)?.label ?? model
}

export function getChatModelShortLabel(model: string): string {
  return CHAT_MODEL_OPTIONS.find((item) => item.value === model)?.shortLabel ?? model
}
