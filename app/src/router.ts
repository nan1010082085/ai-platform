import { createRouter, createWebHistory } from 'vue-router'
import { useQiankun } from '@schema-platform/platform-shared/qiankun'

const TOKEN_KEY = 'sfp_access_token'

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
        path: 'workflows',
        name: 'agent-workflows',
        component: () => import('./views/AgentWorkflowListView.vue'),
      },
      {
        path: 'workflows/:id/executions',
        name: 'agent-workflow-executions',
        component: () => import('./views/AgentExecutionListView.vue'),
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
  const match = p.match(/^(.+?\/)(app|standalone)\/([^/]+)(\/|$)/)
  if (match) {
    return `${match[1]}${match[2]}/${match[3]}`
  }
  return ''
}

export function createAiRouter(routeBase?: string) {
  const base = routeBase || inferRouteBase() || import.meta.env.VITE_ROUTE_BASE || '/'
  const router = createRouter({
    history: createWebHistory(base),
    routes,
  })

  router.beforeEach((to) => {
    if (to.meta.public) {
      return true
    }

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
