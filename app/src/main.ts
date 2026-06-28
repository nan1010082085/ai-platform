import 'element-plus/dist/index.css'
import '@schema-platform/platform-shared/styles/theme.scss'
import '@schema-platform/platform-shared/styles/css-variables.scss'
import './styles/ai-theme-bridge.css'

import { createApp, type App } from 'vue'
import { createPinia } from 'pinia'
import { setupElementPlus } from '@schema-platform/platform-shared/config/element'
import AppRoot from './App.vue'
import { createAiRouter } from './router'
import { setTokenProvider } from './api/aiApi'

let app: App | null = null
let router: ReturnType<typeof createAiRouter> | null = null

let currentRouteBase = '/'
let tokenProviderSet = false

function render() {
  if (!tokenProviderSet) {
    setTokenProvider(() => localStorage.getItem('sfp_access_token') || '')
    tokenProviderSet = true
  }

  router = createAiRouter(currentRouteBase)
  app = createApp(AppRoot)
  app.use(createPinia())
  app.use(router)
  setupElementPlus(app)

  const mountEl = document.getElementById('ai-app')
  if (!mountEl) throw new Error('[ai] #ai-app not found')
  app.mount(mountEl)
}

// ── Qiankun 生命周期（vite-plugin-qiankun 要求通过 ES module 导出）──

export async function bootstrap() {
  console.log('[ai] bootstrap')
}

export async function mount(props: Record<string, unknown>) {
  console.log('[ai] mount start')
  document.getElementById('loading')?.remove()

  // token
  const getToken = props.getToken as (() => string) | undefined
  const token = getToken ? getToken() : (props.token as string)
  if (token) localStorage.setItem('sfp_access_token', token)

  // sidebar 模式
  const mode = props.mode as string | undefined
  if (mode === 'sidebar') {
    currentRouteBase = '/sidebar'
  } else {
    // 直接用 shell 传递的 routeBase
    const getRouteBase = props.getRouteBase as (() => string) | undefined
    if (getRouteBase) {
      currentRouteBase = getRouteBase()
    }
  }

  render()

  const emitEvent = props.emitEvent as ((event: string, data: unknown) => void) | undefined
  emitEvent?.('shell:sub-app-mounted', { app: 'ai' })
  console.log('[ai] mount done')
}

export async function unmount() {
  console.log('[ai] unmount')
  if (app) {
    app.unmount()
    app = null
    router = null
  }
}

// 独立模式：仅开发环境且非 qiankun 子应用时渲染
if (import.meta.env.DEV && !window.__POWERED_BY_QIANKUN__) {
  render()
}
