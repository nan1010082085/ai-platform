import 'element-plus/dist/index.css'
import '@schema-platform/platform-shared/styles/theme.scss'
import '@schema-platform/platform-shared/styles/css-variables.scss'
import './styles/ai-theme-bridge.scss'
import './styles/graphEdgeStates.scss'

import { createApp, type App } from 'vue'
import { createPinia } from 'pinia'
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper'
import { setupElementPlus } from '@schema-platform/platform-shared/config/element'
import { initQiankunProps } from '@schema-platform/platform-shared/qiankun'
import { aiLog } from '@schema-platform/platform-shared/utils/logger'
import AppRoot from './App.vue'
import { createAiRouter } from './router'
import { setTokenProvider } from './api/aiApi'
import { setAgentWorkflowTokenProvider } from './api/agentWorkflowApi'

let app: App | null = null
let router: ReturnType<typeof createAiRouter> | null = null

let currentRouteBase: string | undefined
let tokenProviderSet = false

function render() {
  if (!tokenProviderSet) {
    const provider = () => localStorage.getItem('sfp_access_token') || ''
    setTokenProvider(provider)
    setAgentWorkflowTokenProvider(provider)
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

renderWithQiankun({
  bootstrap() {
    aiLog.lifecycle('bootstrap')
  },
  mount(props) {
    aiLog.lifecycle('mount start')

    document.getElementById('loading')?.remove()

    if (typeof props.onGlobalStateChange === 'function' && typeof props.setGlobalState === 'function') {
      initQiankunProps(props as Parameters<typeof initQiankunProps>[0])
    }

    const getToken = props.getToken as (() => string) | undefined
    const token = getToken ? getToken() : (props.token as string)
    if (token) localStorage.setItem('sfp_access_token', token)

    const mode = props.mode as string | undefined
    if (mode === 'sidebar') {
      currentRouteBase = '/sidebar'
    } else {
      const getRouteBase = props.getRouteBase as (() => string) | undefined
      if (getRouteBase) {
        currentRouteBase = getRouteBase()
      }
    }

    render()
    aiLog.lifecycle('mount done')
  },
  unmount() {
    aiLog.lifecycle('unmount')
    if (app) {
      app.unmount()
      app = null
      router = null
    }
  },
})

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render()
}
