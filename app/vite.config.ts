import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import qiankun from 'vite-plugin-qiankun'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const isProd = process.env.NODE_ENV === 'production'
const rootDir = fileURLToPath(new URL('.', import.meta.url))
const sharedDir = fileURLToPath(new URL('../shared', import.meta.url))

/** workspace ai-shared 子路径与 package.json exports 对齐 */
const aiSharedAliases = [
  { find: '@schema-platform/ai-shared/toolNames', replacement: resolve(sharedDir, 'dist/toolNames.js') },
  { find: '@schema-platform/ai-shared/agentWorkflow', replacement: resolve(sharedDir, 'dist/agentWorkflow.js') },
  { find: '@schema-platform/ai-shared/document', replacement: resolve(sharedDir, 'dist/document.js') },
  { find: '@schema-platform/ai-shared/promptBuilder', replacement: resolve(sharedDir, 'dist/promptBuilder.js') },
  { find: '@schema-platform/ai-shared/systemKnowledge', replacement: resolve(sharedDir, 'dist/systemKnowledge.js') },
  { find: '@schema-platform/ai-shared/flowNodeCatalogue', replacement: resolve(sharedDir, 'dist/flowNodeCatalogue.js') },
  { find: '@schema-platform/ai-shared', replacement: resolve(sharedDir, 'dist/index.js') },
]

export default defineConfig({
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
      ...aiSharedAliases,
    ],
  },
  optimizeDeps: {
    exclude: ['@schema-platform/ai-shared'],
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
    proxy: {
      '/schema-platform/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/schema-platform\/api/, '/api'),
        selfHandleResponse: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, _, res) => {
            const contentType = proxyRes.headers['content-type'] ?? ''
            const isSSE = contentType.includes('text/event-stream')
            const headers = { ...proxyRes.headers }
            delete headers['content-encoding']
            delete headers['transfer-encoding']
            if (isSSE) {
              headers['cache-control'] = 'no-cache'
              headers['x-accel-buffering'] = 'no'
            }
            res.writeHead(proxyRes.statusCode ?? 200, headers)
            if (isSSE) {
              proxyRes.on('data', (chunk) => { res.write(chunk) })
              proxyRes.on('end', () => res.end())
              proxyRes.on('error', () => res.end())
            } else {
              proxyRes.pipe(res)
            }
          })
        },
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        selfHandleResponse: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, _, res) => {
            const contentType = proxyRes.headers['content-type'] ?? ''
            const isSSE = contentType.includes('text/event-stream')
            const headers = { ...proxyRes.headers }
            delete headers['content-encoding']
            delete headers['transfer-encoding']
            if (isSSE) {
              headers['cache-control'] = 'no-cache'
              headers['x-accel-buffering'] = 'no'
            }
            res.writeHead(proxyRes.statusCode ?? 200, headers)
            if (isSSE) {
              proxyRes.on('data', (chunk) => { res.write(chunk) })
              proxyRes.on('end', () => res.end())
              proxyRes.on('error', () => res.end())
            } else {
              proxyRes.pipe(res)
            }
          })
        },
      },
      '/ws': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
