/**
 * AI Router 工厂：从 Cordis shellRoutes 贡献表合并路由。
 * 宿主硬编码仅保留 login / auth-callback；鉴权 guard 仍在此。
 */

import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type RouteComponent,
} from 'vue-router'
import { useAuthStore } from '@schema-platform/platform-shared/utils/stores/authStore'
import { guardAuthenticatedRoute } from '@schema-platform/platform-shared/utils/authSession'
import { resolvePostLoginNavigation } from '@schema-platform/platform-shared/utils/authPaths'
import { getPluginHost } from '@/plugins'
import type { ShellRouteContribution } from '@/plugins/plugins/shell-routes/types'

const isQiankun = () => !!window.__POWERED_BY_QIANKUN__

/**
 * 将贡献表折叠为 Vue Router 记录（ai-layout children + bare/public 顶层）。
 * @param contributions 模块贡献
 */
export function buildRoutesFromContributions(
  contributions: ShellRouteContribution[],
): RouteRecordRaw[] {
  const layoutChildren: RouteRecordRaw[] = []
  const topLevel: RouteRecordRaw[] = []

  for (const c of contributions) {
    const component = c.component as RouteComponent
    if (c.layout === 'ai-layout') {
      layoutChildren.push({
        path: c.childPath ?? c.path.replace(/^\//, ''),
        name: c.name,
        component,
        meta: c.meta,
      })
    } else {
      topLevel.push({
        path: c.path,
        name: c.name,
        component,
        meta: c.meta,
      })
    }
  }

  const hostRoutes: RouteRecordRaw[] = [
    {
      path: '/login',
      name: 'login',
      component: () => import('@schema-platform/platform-shared/components/auth/LoginView.vue'),
      props: {
        title: '智能体平台',
        subtitle: '输入账号后选择组织租户',
        defaultTenantCode: 'default',
        lockTenantCode: false,
        resolveTenantsByUsername: true,
        registerMode: 'both',
        allowRegister: true,
      },
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
      children: layoutChildren,
    },
    ...topLevel,
  ]

  return hostRoutes
}

function inferRouteBase(): string {
  const p = window.location.pathname
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
  const envBase = import.meta.env.VITE_ROUTE_BASE
  if (envBase && envBase !== '/') return envBase
  const viteBase = import.meta.env.BASE_URL
  if (viteBase && viteBase !== '/') return viteBase
  return '/'
}

/**
 * 创建 AI 路由（须在 ensurePluginHost 之后调用）。
 * @param routeBase 可选 history base
 */
export function createAiRouter(routeBase?: string) {
  const host = getPluginHost()
  const routes = buildRoutesFromContributions(host.shellRoutes.list())
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
          const redirect = (to.query.redirect as string) || '/'
          const basePath = import.meta.env.BASE_URL || import.meta.env.VITE_ROUTE_BASE || '/'
          const nav = resolvePostLoginNavigation(redirect, basePath)
          if (nav.mode === 'location') {
            window.location.assign(nav.href)
            return false
          }
          return { path: nav.path }
        }
      }
      return true
    }

    return guardAuthenticatedRoute(to)
  })

  return router
}
