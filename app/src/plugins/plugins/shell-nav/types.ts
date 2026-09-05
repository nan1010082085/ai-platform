/**
 * Shell 导航贡献项类型。
 */

export type ShellNavGroup = 'primary' | 'settings'
export type ShellSettingsGroup = 'config' | 'integration' | 'ops'

export interface ShellNavItem {
  id: string
  path: string
  /** i18n key，如 layout.nav.chat */
  labelKey: string
  icon: string
  group: ShellNavGroup
  settingsGroup?: ShellSettingsGroup
  order: number
  activeMatch?: 'exact' | 'prefix'
}
