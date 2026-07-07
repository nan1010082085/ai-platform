/**
 * AI 抽屉独立入口（iframe 专用）
 *
 * 与 editor / flow 同源，共用 localStorage JWT。
 * 须初始化三能力统一鉴权后再挂载，保证 WebSocket / REST 带 token 且可自动刷新。
 */

import 'element-plus/dist/index.css'
import '@schema-platform/platform-shared/styles/theme.scss'
import '@schema-platform/platform-shared/styles/css-variables.scss'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { setupElementPlus } from '@schema-platform/platform-shared/config/element'
import {
  bootstrapAuthSession,
  initCapabilityPlatformAuth,
} from '@schema-platform/platform-shared/utils/authSession'
import './global.scss'
import './styles/ai-theme-bridge.scss'

import AiSidebarView from './views/AiSidebarView.vue'
import { registerAiApiTokenProvider } from './setupCapabilityAuth'

async function mountSidebar(): Promise<void> {
  const app = createApp(AiSidebarView)
  const pinia = createPinia()
  app.use(pinia)
  initCapabilityPlatformAuth({
    registerTokenProvider: registerAiApiTokenProvider,
    bootstrap: false,
  })
  setupElementPlus(app)
  await bootstrapAuthSession()
  app.mount('#ai-app')
  window.parent.postMessage({ type: 'ai:ready' }, '*')
}

void mountSidebar().catch((err) => {
  console.error('[ai-sidebar] mount failed', err)
  window.parent.postMessage({ type: 'ai:ready' }, '*')
})

export async function bootstrap() {}
export async function mount() {}
export async function unmount() {}
