import 'element-plus/dist/index.css'
import '@schema-platform/platform-shared/styles/theme.scss'
import '@schema-platform/platform-shared/styles/css-variables.scss'
import './styles/ai-theme-bridge.scss'
import './styles/graphEdgeStates.scss'

import { createApp, type App } from 'vue'
import { createPinia } from 'pinia'
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper'
import { setupElementPlus } from '@schema-platform/platform-shared/config/element'
import { initQiankunProps, initQiankunShellProps } from '@schema-platform/platform-shared/qiankun'
import { aiLog } from '@schema-platform/platform-shared/utils/logger'
import AppRoot from './App.vue'
import { createAiRouter } from './router'
import { setupAppAuth, handleUnauthorized } from '@schema-platform/platform-shared/utils/authSession'
import { setUnauthorizedHandler as setAiApiUnauthorized } from './api/aiApi'
import { setAgentWorkflowUnauthorizedHandler } from './api/agentWorkflowApi'

let app: App | null = null
let router: ReturnType<typeof createAiRouter> | null = null

let currentRouteBase: string | undefined

function render() {
  router = createAiRouter(currentRouteBase)
  const pinia = createPinia()
  app = createApp(AppRoot)
  app.use(pinia)
  app.use(router)
  setupAppAuth()
  setAiApiUnauthorized(() => handleUnauthorized())
  setAgentWorkflowUnauthorizedHandler(() => handleUnauthorized())
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
    mounted = true

    document.getElementById('loading')?.remove()

    if (typeof props.onGlobalStateChange === 'function' && typeof props.setGlobalState === 'function') {
      initQiankunProps(props as Parameters<typeof initQiankunProps>[0])
    }
    initQiankunShellProps(props)

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

// Standalone mode detection:
// vite-plugin-qiankun's useDevMode sets __POWERED_BY_QIANKUN__=true in dev,
// even when running standalone. Use a 500ms fallback — if qiankun doesn't
// call mount() within 500ms, treat as standalone and render directly.
let mounted = false
if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render()
  mounted = true
} else {
  setTimeout(() => {
    if (!mounted) {
      aiLog.lifecycle('standalone fallback: qiankun mount() not called within 500ms')
      render()
    }
  }, 500)
}
