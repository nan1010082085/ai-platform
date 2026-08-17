/**
 * 租户鉴权生产化验收（verifyUrl 内省）：
 * - harness 经 AI_HARNESS_VERIFY_URL 调用 server 内省端点（stub）解析 tenantId
 * - 非 allowlist token 走内省；allowlist token 直通（不打扰内省）
 * - token 缓存：同一 token 二次建会话不再打内省端点
 * - 无效 token -> 401
 */

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { startMockLlmServer } from '@deepseek-ai/dsh-llm-mock-server'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RUNNER_PORT = 5310
const MOCK_PORT = 8787
const INTROSPECT_PORT = 8899

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(url, { timeoutMs = 30000, headers = {} } = {}) {
  const deadline = Date.now() + timeoutMs
  let lastErr
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(url, { headers })
      if (resp.ok) return
      lastErr = new Error(`HTTP ${resp.status}`)
    } catch (err) {
      lastErr = err
    }
    await sleep(250)
  }
  throw new Error(`waitFor ${url} 超时: ${lastErr}`)
}

async function post(pathname, token, body = '{}') {
  const resp = await fetch(`http://127.0.0.1:${RUNNER_PORT}${pathname}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body,
  })
  const text = await resp.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }
  return { status: resp.status, data }
}

// ── stub 内省端点（模拟 server /api/ai/auth/introspect）──
let introspectHits = 0
const introspectServer = createServer((req, res) => {
  let buf = ''
  req.on('data', (c) => { buf += c.toString('utf8') })
  req.on('end', () => {
    introspectHits += 1
    const { token } = JSON.parse(buf || '{}')
    res.setHeader('content-type', 'application/json')
    if (token === 'jwt-token-ok') {
      res.end(JSON.stringify({ success: true, data: { tenantId: 'tenant-a', userId: 'u-1', expiresAt: Date.now() + 3600000 } }))
    } else {
      res.statusCode = 401
      res.end(JSON.stringify({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token.' } }))
    }
  })
})
await new Promise((resolve) => introspectServer.listen(INTROSPECT_PORT, '127.0.0.1', () => resolve()))

const mock = await startMockLlmServer({
  port: MOCK_PORT,
  apiKey: 'mock-key',
  sequence: ['tool_call_success', 'success'],
  repeatLast: true,
  toolName: 'platform_echo',
  toolArguments: JSON.stringify({ message: 'introspect poc' }),
  successText: '内省验证。',
})

const child = spawn('pnpm', ['exec', 'dsh', '--profile', 'ai-harness'], {
  cwd: ROOT,
  env: {
    ...process.env,
    DSH_HOME: path.join(ROOT, 'dsh-home'),
    DEEPSEEK_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/v1`,
    DEEPSEEK_API_KEY: 'mock-key',
    DSH_PERMISSION_MODE: 'danger-full-access',
    AI_HARNESS_VERIFY_URL: `http://127.0.0.1:${INTROSPECT_PORT}/introspect`,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
const logs = []
child.stdout.on('data', (d) => logs.push(`[out] ${d}`))
child.stderr.on('data', (d) => logs.push(`[err] ${d}`))
const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })))

const failures = []
try {
  await waitFor(`http://127.0.0.1:${RUNNER_PORT}/healthz`)

  // 1. 内省 token 建会话 -> 200 + tenantId
  const s1 = await post('/session/start', 'jwt-token-ok')
  if (s1.status !== 200 || s1.data.tenantId !== 'tenant-a') failures.push(`内省会话失败: ${s1.status} ${JSON.stringify(s1.data)}`)
  console.log(`[introspect] 内省 token -> ${s1.status} tenantId=${s1.data.tenantId}（内省调用 ${introspectHits} 次）`)

  // 2. 缓存：同一 token 二次建会话不再打内省
  const hitsAfterFirst = introspectHits
  const s2 = await post('/session/start', 'jwt-token-ok')
  if (s2.status !== 200) failures.push(`缓存会话失败: ${s2.status}`)
  if (introspectHits !== hitsAfterFirst) failures.push(`缓存未生效：第二次建会话又调了内省（${hitsAfterFirst} -> ${introspectHits}）`)
  console.log(`[introspect] 缓存：第二次建会话后内省调用仍为 ${introspectHits} 次`)

  // 3. allowlist token 直通（不打扰内省）
  const s3 = await post('/session/start', 'poc-token')
  if (s3.status !== 200 || s3.data.tenantId !== 'poc-tenant') failures.push(`allowlist 会话失败: ${s3.status} ${JSON.stringify(s3.data)}`)
  if (introspectHits !== hitsAfterFirst) failures.push('allowlist token 不应触发内省')
  console.log(`[introspect] allowlist token -> ${s3.status} tenantId=${s3.data.tenantId}`)

  // 4. 无效 token -> 401
  const bad = await post('/session/start', 'invalid-token')
  if (bad.status !== 401) failures.push(`无效 token 应 401，实际 ${bad.status}: ${JSON.stringify(bad.data)}`)
  console.log(`[introspect] 无效 token -> ${bad.status}`)

  // 5. 内省会话可正常发消息（全链路）
  const turn = await post(`/session/${s1.data.sessionId}/message`, 'jwt-token-ok', JSON.stringify({ content: '请调用 platform_echo' }))
  if (turn.status !== 200) failures.push(`内省会话发消息失败: ${turn.status} ${JSON.stringify(turn.data)}`)
  console.log(`[introspect] 内省会话消息 -> ${turn.status}`)
} catch (err) {
  failures.push(String(err?.message ?? err))
} finally {
  child.kill('SIGTERM')
  const exit = await Promise.race([exited, sleep(10000).then(() => null)])
  if (exit === null) {
    child.kill('SIGKILL')
    failures.push('SIGTERM 后 10s 未退出')
  } else {
    console.log(`[introspect] runner exited: code=${exit.code} signal=${exit.signal}`)
  }
  await mock.close()
  await new Promise((resolve) => introspectServer.close(() => resolve(undefined)))
}

if (failures.length > 0) {
  console.error('\n[introspect] FAIL:')
  for (const f of failures) console.error(`  - ${f}`)
  console.error(logs.join(''))
  process.exit(1)
}
console.log('\n[introspect] PASS：verifyUrl 内省鉴权（tenantId 解析 / 缓存 / allowlist 直通 / 无效 401 / 全链路）')
