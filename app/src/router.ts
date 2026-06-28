import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { useQiankun } from '@schema-platform/platform-shared/qiankun'
import { APP_CONFIGS } from '@schema-platform/platform-shared/qiankun/config'

// SSO 客户端配置
const TOKEN_KEY = 'sfp_access_token'

// 开发环境使用 /，生产环境使用配置的 basePath
const isDev = import.meta.env.DEV
const APP_BASE = isDev ? '/' : APP_CONFIGS.ai.basePath

// qiankun 模式下使用 memory history，避免子应用路由篡改宿主 URL
const isQiankun = () => !!window.__POWERED_BY_QIANKUN__

const routes = [
  // ---- Login ----
  {
    path: '/login',
    name: 'login',
    component: () => import('@schema-platform/platform-shared/components/auth/LoginView.vue'),
    props: { title: 'AI 助手', subtitle: '智能 Schema/Flow 生成' },
    meta: { public: true },
  },
  // ---- SSO Callback ----
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('./views/AuthCallbackView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'chat',
    component: () => import('./views/AiChatView.vue'),
  },
  {
    path: '/sidebar',
    name: 'sidebar',
    component: () => import('./views/AiSidebarView.vue'),
  },
  {
    path: '/rag',
    name: 'rag',
    component: () => import('./views/RagKnowledgeBase.vue'),
  },
  {
    path: '/monitor',
    name: 'monitor',
    component: () => import('./views/AiMonitorView.vue'),
  },
]

export function createAiRouter(initialPath?: string) {
  const router = createRouter({
    history: isQiankun()
      ? createMemoryHistory(initialPath || undefined)
      : createWebHistory(APP_BASE),
    routes,
  })

  // 路由守卫：独立访问时检查登录状态
  router.beforeEach((to) => {
    // 公开页面不需要检查
    if (to.meta.public) {
      return true
    }

    // 微前端模式下跳过检查（宿主已处理鉴权）
    if (!isQiankun()) {
      const { getGlobalState } = useQiankun()
      const state = getGlobalState()
      const token = (state.token as string) || localStorage.getItem(TOKEN_KEY)
      if (!token) {
        return { name: 'login', query: { redirect: to.fullPath } }
      }
    }
  })

  return router
}
