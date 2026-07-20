/**
 * AI app locale — persist preference and switch language.
 */
import { useI18n } from '@schema-platform/platform-shared'

export const AI_LOCALE_KEY = 'sp_ai_locale'

export type AiLocale = 'zh-CN' | 'en-US'

export function readStoredLocale(): AiLocale {
  const stored = localStorage.getItem(AI_LOCALE_KEY)
  return stored === 'en-US' ? 'en-US' : 'zh-CN'
}

export function useAiLocale() {
  const { locale, t } = useI18n()

  function setLocale(next: AiLocale): void {
    locale.value = next
    localStorage.setItem(AI_LOCALE_KEY, next)
  }

  function toggleLocale(): void {
    setLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
  }

  return { locale, t, setLocale, toggleLocale }
}
