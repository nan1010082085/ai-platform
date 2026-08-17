/**
 * 预算与租户配额验收（M5 门禁项）：
 * - 工作量预算：AI_HARNESS_BUDGET_WORK_UNITS=1 -> 首轮工具调用通过，第二轮 402 BUDGET_EXCEEDED
 * - 票据鉴权：无效票据的 SSE 返回 401
 * - 租户配额：AI_HARNESS_SESSIONS_PER_TENANT=2 -> 第三个会话 429
 */

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import http from 'node:http'
import { startMockLlmServer } from '@deepseek-ai/dsh-llm-mock-server'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RUNNER_PORT = 5310
const MOCK_PORT = 8787
const TOKEN = 'poc-token'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(url, { timeoutMs = 30000 } = {}) {
  const deadline = Date.now() + timeoutMs
  let lastErr
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(url)
      if (resp.ok) return
      lastErr = new Error(`HTTP ${resp.status}`)
    } catch (err) {
      lastErr = err
    }
    await sleep(250)
  }
  throw new Error(`waitFor ${url} 超时: ${lastErr}`)
}

async function api(pathname, { method = 'POST', body, headers = {} } = {}) {
  const resp = await fetch(`http://127.0.0.1:${RUNNER_PORT}${pathname}`, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
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

const mock = await startMockLlmServer({
  port: MOCK_PORT,
  apiKey: 'mock-key',
  sequence: ['tool_call_success', 'success'],
  repeatLast: true,
  toolName: 'platform_echo',
  toolArguments: JSON.stringify({ message: 'budget poc' }),
  successText: '预算验证。',
})
console.log('[budget] mock llm ready')

const child = spawn('pnpm', ['exec', 'dsh', '--profile', 'ai-harness'], {
  cwd: ROOT,
  env: {
    ...process.env,
    DSH_HOME: path.join(ROOT, 'dsh-home'),
    DEEPSEEK_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/v1`,
    DEEPSEEK_API_KEY: 'mock-key',
    DSH_PERMISSION_MODE: 'danger-full-access',
    AI_HARNESS_BUDGET_WORK_UNITS: '50',
    AI_HARNESS_SESSIONS_PER_TENANT: '2',
    // 新价（V4-Flash 高峰）单轮成本 ~9.9e-5；预算取 8e-5：首轮(0)通过、次轮(累计 9.9e-5)拒绝
    AI_HARNESS_DAILY_RMB_BUDGET: '0.00008',
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

  // ── 租户配额：允许 2 个活跃会话，第 3 个 429 ──
  const s1 = await api('/session/start', { body: {} })
  const s2 = await api('/session/start', { body: {} })
  const s3 = await api('/session/start', { body: {} })
  if (s1.status !== 200 || s2.status !== 200) failures.push(`会话创建失败: ${s1.status}/${s2.status}`)
  if (s3.status !== 429) failures.push(`第三个会话应 429，实际 ${s3.status}: ${JSON.stringify(s3.data)}`)
  console.log(`[budget] 租户配额: s1=${s1.status} s2=${s2.status} s3=${s3.status}(${s3.data?.error ?? ''})`)

  // ── 票据鉴权：无票据/错票据 401 ──
  const badTicket = await new Promise((resolve) => {
    const req = http.get({
      host: '127.0.0.1',
      port: RUNNER_PORT,
      path: `/session/${s1.data.sessionId}/events?ticket=wrong`,
      headers: { accept: 'text/event-stream' },
    }, (res) => {
      let buf = ''
      res.on('data', (c) => { buf += c.toString('utf8') })
      res.on('end', () => resolve({ status: res.statusCode, body: buf }))
    })
    req.on('error', () => resolve({ status: 0, body: '' }))
  })
  if (badTicket.status !== 401) failures.push(`错误票据应 401，实际 ${badTicket.status}`)
  console.log(`[budget] 错误票据 SSE: ${badTicket.status}`)

  // ── 工作量预算：首轮通过（1 次工具调用），第二轮 402 ──
  const turn1 = await api(`/session/${s1.data.sessionId}/message`, { body: { content: '请调用 platform_echo' } })
  if (turn1.status !== 200) failures.push(`首轮应 200，实际 ${turn1.status}: ${JSON.stringify(turn1.data)}`)
  console.log(`[budget] 首轮: ${turn1.status}（用量 ${JSON.stringify(turn1.data?.budget)}）`)

  const turn2 = await api(`/session/${s1.data.sessionId}/message`, { body: { content: '再来一次' } })
  if (turn2.status !== 402) failures.push(`第二轮应 402，实际 ${turn2.status}: ${JSON.stringify(turn2.data)}`)
  if (turn2.data?.error && !String(turn2.data.error).includes('BUDGET_EXCEEDED')) failures.push(`402 原因不符: ${turn2.data.error}`)
  console.log(`[budget] 第二轮: ${turn2.status}（${turn2.data?.error ?? ''}）`)

  // ── RMB 日预算副闸：s1 首轮（估算 ~2.6e-5 RMB）通过并记账；s2 首轮累计 ≥ 3e-5 被拒 ──
  const turnS2 = await api(`/session/${s2.data.sessionId}/message`, { body: { content: '请调用 platform_echo' } })
  if (turnS2.status !== 402) failures.push(`RMB 日预算应 402，实际 ${turnS2.status}: ${JSON.stringify(turnS2.data)}`)
  if (turnS2.data?.error && !String(turnS2.data.error).includes('RMB')) failures.push(`RMB 402 原因不符: ${turnS2.data.error}`)
  console.log(`[budget] RMB 日预算: ${turnS2.status}（${turnS2.data?.error ?? ''}）`)

  // ── 票据正常签发 ──
  const ticketResp = await api(`/session/${s2.data.sessionId}/events-ticket`, { body: {} })
  if (ticketResp.status !== 200 || typeof ticketResp.data.ticket !== 'string') failures.push(`票据签发失败: ${ticketResp.status}`)
  console.log(`[budget] 票据签发: ${ticketResp.status}（${String(ticketResp.data?.ticket).slice(0, 8)}…）`)
} catch (err) {
  failures.push(String(err?.message ?? err))
} finally {
  child.kill('SIGTERM')
  const exit = await Promise.race([exited, sleep(10000).then(() => null)])
  if (exit === null) {
    child.kill('SIGKILL')
    failures.push('SIGTERM 后 10s 未退出')
  } else {
    console.log(`[budget] runner exited: code=${exit.code} signal=${exit.signal}`)
  }
  await mock.close()
}

if (failures.length > 0) {
  console.error('\n[budget] FAIL:')
  for (const f of failures) console.error(`  - ${f}`)
  console.error(logs.join(''))
  process.exit(1)
}
console.log('\n[budget] PASS：租户配额 429 / 票据鉴权 401 / 工作量预算 402 / 票据签发')
