import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@schema-platform/platform-shared/utils/stores/authStore'
import { guardAuthenticatedRoute } from '@schema-platform/platform-shared/utils/authSession'

const isQiankun = () => !!window.__POWERED_BY_QIANKUN__

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@schema-platform/platform-shared/components/auth/LoginView.vue'),
    props: { title: 'AI 助手', subtitle: '智能 Schema/Flow 生成' },
    meta: { public: true },
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('./views/AuthCallbackView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('./components/AiLayout.vue'),
    children: [
      {
        path: '',
        name: 'chat',
        component: () => import('./views/AiChatView.vue'),
      },
      {
        path: 'rag',
        name: 'rag',
        component: () => import('./views/RagKnowledgeBase.vue'),
      },
      {
        path: 'monitor',
        name: 'monitor',
        component: () => import('./views/AiMonitorView.vue'),
      },
      {
        path: 'plugins',
        name: 'plugin-center',
        component: () => import('./views/PluginCenterView.vue'),
      },
      {
        path: 'workflows',
        name: 'agent-workflows',
        component: () => import('./views/AgentWorkflowListView.vue'),
      },
      {
        path: 'workflows/:id/executions',
        name: 'agent-workflow-executions',
        component: () => import('./views/AgentExecutionListView.vue'),
      },
      {
        path: 'settings/keys',
        name: 'api-keys',
        component: () => import('./views/ApiKeyManagerView.vue'),
      },
      {
        path: 'settings/models',
        name: 'model-settings',
        component: () => import('./views/ModelSettingsView.vue'),
      },
    ],
  },
  {
    path: '/workflows/:id',
    name: 'agent-workflow-designer',
    component: () => import('./views/AgentWorkflowDesignerView.vue'),
  },
  {
    path: '/executions/:id',
    name: 'agent-execution-detail',
    component: () => import('./views/AgentExecutionDetailView.vue'),
  },
  {
    path: '/sidebar',
    name: 'sidebar',
    component: () => import('./views/AiSidebarView.vue'),
  },
]

function inferRouteBase(): string {
  const p = window.location.pathname
  // qiankun 容器内：/schema-platform/app/ai/... 或 /schema-platform/standalone/ai/...
  const qiankunMatch = p.match(/^(.+?\/)(app|standalone)\/([^/]+)(\/|$)/)
  if (qiankunMatch) {
    return `${qiankunMatch[1]}${qiankunMatch[2]}/${qiankunMatch[3]}`
  }
  return ''
}

function resolveRouteBase(routeBase?: string): string {
  if (routeBase) return routeBase
  const inferred = inferRouteBase()
  if (inferred) return inferred
  // 独立部署时优先用 VITE_ROUTE_BASE（与 nginx 部署路径一致），
  // 避免 BASE_URL 和 VITE_ROUTE_BASE 重复拼接导致路径双倍。
  const envBase = import.meta.env.VITE_ROUTE_BASE
  if (envBase && envBase !== '/') return envBase
  const viteBase = import.meta.env.BASE_URL
  if (viteBase && viteBase !== '/') return viteBase
  return '/'
}

export function createAiRouter(routeBase?: string) {
  const base = resolveRouteBase(routeBase)
  const router = createRouter({
    history: createWebHistory(base),
    routes,
  })

  router.beforeEach(async (to) => {
    if (to.meta.public) {
      if (to.name === 'login' && !isQiankun()) {
        const authStore = useAuthStore()
        if (authStore.accessToken && authStore.user) {
          return { path: (to.query.redirect as string) || '/' }
        }
      }
      return true
    }

    return guardAuthenticatedRoute(to)
  })

  return router
}
