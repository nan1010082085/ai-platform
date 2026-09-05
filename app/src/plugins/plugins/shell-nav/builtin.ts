/**
 * 内置壳层导航（与 AiLayout 现行 IA 对齐：主轨仅对话/工作流，其余进设置）。
 */

import type { ShellNavItem } from './types'

/** 主导航 + 设置导航内置贡献 */
export const BUILTIN_SHELL_NAV: ShellNavItem[] = [
  { id: 'chat', path: '/', labelKey: 'layout.nav.chat', icon: 'chat-dot-round', group: 'primary', order: 10, activeMatch: 'exact' },
  { id: 'workflows', path: '/workflows', labelKey: 'layout.nav.workflows', icon: 'connection', group: 'primary', order: 20, activeMatch: 'prefix' },

  { id: 'rag', path: '/rag', labelKey: 'layout.nav.rag', icon: 'notebook', group: 'settings', settingsGroup: 'config', order: 5 },
  { id: 'plugins', path: '/plugins', labelKey: 'layout.nav.plugins', icon: 'box', group: 'settings', settingsGroup: 'config', order: 6 },
  { id: 'monitor', path: '/monitor', labelKey: 'layout.nav.monitor', icon: 'data-line', group: 'settings', settingsGroup: 'config', order: 7 },
  { id: 'models', path: '/settings/models', labelKey: 'layout.nav.models', icon: 'cpu', group: 'settings', settingsGroup: 'config', order: 10 },
  { id: 'embedding', path: '/settings/embedding', labelKey: 'layout.nav.embedding', icon: 'collection', group: 'settings', settingsGroup: 'config', order: 20 },
  { id: 'templates', path: '/settings/templates', labelKey: 'layout.nav.templates', icon: 'document-checked', group: 'settings', settingsGroup: 'config', order: 30 },
  { id: 'memory', path: '/memory', labelKey: 'layout.nav.memory', icon: 'data-board', group: 'settings', settingsGroup: 'config', order: 40 },
  { id: 'integration', path: '/integration', labelKey: 'layout.nav.integration', icon: 'link', group: 'settings', settingsGroup: 'integration', order: 50 },
  { id: 'keys', path: '/settings/keys', labelKey: 'layout.nav.keys', icon: 'key', group: 'settings', settingsGroup: 'integration', order: 60 },
  { id: 'mcp', path: '/mcp', labelKey: 'layout.nav.mcp', icon: 'set-up', group: 'settings', settingsGroup: 'integration', order: 70 },
  { id: 'schedules', path: '/schedules', labelKey: 'layout.nav.schedules', icon: 'alarm-clock', group: 'settings', settingsGroup: 'ops', order: 80 },
  { id: 'evaluation', path: '/evaluation', labelKey: 'layout.nav.evaluation', icon: 'data-analysis', group: 'settings', settingsGroup: 'ops', order: 90 },
  { id: 'routing-debug', path: '/debug/routing', labelKey: 'layout.nav.routingDebug', icon: 'search', group: 'settings', settingsGroup: 'ops', order: 100 },
  { id: 'rag-debug', path: '/debug/rag', labelKey: 'layout.nav.ragDebug', icon: 'filter', group: 'settings', settingsGroup: 'ops', order: 110 },
]
