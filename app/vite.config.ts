import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import qiankun from 'vite-plugin-qiankun'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSharedSourceAliases, sharedOptimizeDepsExclude } from '../../scripts/vite-shared-source.mjs'
import { createDevApiProxy } from '../../scripts/vite-dev-proxy.mjs'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'
  const env = loadEnv(mode, rootDir, '')
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'https://pyflow.icu'

  return {
    base: isProd ? '/schema-platform/ai/' : '/',
    plugins: [
      vue(),
      qiankun('ai', { useDevMode: true }),
    ],
    css: {
      preprocessorOptions: {
        scss: { api: 'modern-compiler' },
      },
    },
    resolve: {
      alias: [
        { find: '@', replacement: resolve(rootDir, 'src') },
        ...createSharedSourceAliases(import.meta.url, {
          platformShared: true,
        }),
      ],
      dedupe: ['vue', 'vue-router', 'pinia', 'element-plus', 'vue-i18n'],
    },
    optimizeDeps: {
      exclude: sharedOptimizeDepsExclude({ platformShared: true }),
    },
    build: {
      cssCodeSplit: false,
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
          sidebar: fileURLToPath(new URL('./index-sidebar.html', import.meta.url)),
        },
      },
    },
    server: {
      port: 5300,
      strictPort: true,
      cors: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
      proxy: createDevApiProxy(proxyTarget),
    },
  }
})
