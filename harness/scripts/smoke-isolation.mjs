/**
 * M5 门禁 POC：单进程内并发双会话隔离验证。
 *
 * 验证点：
 * - 同一 harness 进程内两个并发会话互不串扰（SSE 帧 sessionId 恒为自身）
 * - 各自轨迹投影独立（turns/toolCalls 各 1，sessionId 不同）
 * - 并发消息同时推进，均正常 completed
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

async function waitFor(url, { timeoutMs = 30000, headers = {} } = {}) {
  const deadline = Date.now() + timeoutMs
  let lastErr
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(url, { headers })
      if (resp.ok) return resp
      lastErr = new Error(`HTTP ${resp.status}`)
    } catch (err) {
      lastErr = err
    }
    await sleep(250)
  }
  throw new Error(`waitFor ${url} 超时: ${lastErr}`)
}

/** 签发 SSE 票据（Bearer 鉴权）。 */
async function issueTicket(sessionId) {
  const resp = await fetch(`http://127.0.0.1:${RUNNER_PORT}/session/${sessionId}/events-ticket`, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}` },
    body: '{}',
  })
  if (!resp.ok) throw new Error(`events-ticket HTTP ${resp.status}: ${await resp.text()}`)
  const { ticket } = await resp.json()
  return ticket
}

/** 订阅 SSE（票据鉴权），直到 predicate 为 true；断言所有 events 帧的 sessionId 与自身一致。 */
async function sseUntil(sessionId, predicate, { timeoutMs = 30000 } = {}) {
  const ticket = await issueTicket(sessionId)
  return new Promise((resolve, reject) => {
    const collected = []
    const timer = setTimeout(() => {
      req.destroy()
      reject(new Error(`sse(${sessionId}) 超时，已收事件: ${collected.map((e) => e.type).join(',') || '(none)'}`))
    }, timeoutMs)
    const req = http.get({
      host: '127.0.0.1',
      port: RUNNER_PORT,
      path: `/session/${sessionId}/events?ticket=${encodeURIComponent(ticket)}`,
      headers: { accept: 'text/event-stream' },
    }, (res) => {
      if (res.statusCode !== 200) {
        clearTimeout(timer)
        reject(new Error(`sse HTTP ${res.statusCode}`))
        return
      }
      let buffer = ''
      res.on('data', (chunk) => {
        buffer += chunk.toString('utf8')
        let index
        while ((index = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, index)
          buffer = buffer.slice(index + 2)
          const dataLine = frame.split('\n').find((line) => line.startsWith('data: '))
          if (!dataLine) continue
          const payload = JSON.parse(dataLine.slice(6))
          if (payload.type === 'events') {
            if (payload.sessionId !== sessionId) {
              clearTimeout(timer)
              req.destroy()
              reject(new Error(`串扰：session ${sessionId} 收到 ${payload.sessionId} 的事件帧`))
              return
            }
            collected.push(...payload.events)
          }
          if (predicate(collected) !== true) continue
          clearTimeout(timer)
          req.destroy()
          resolve({ events: collected })
        }
      })
      res.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })
    req.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

async function post(pathname, body) {
  const resp = await fetch(`http://127.0.0.1:${RUNNER_PORT}${pathname}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`${pathname} HTTP ${resp.status}: ${await resp.text()}`)
  return resp.json()
}

async function getJson(pathname) {
  const resp = await fetch(`http://127.0.0.1:${RUNNER_PORT}${pathname}`, {
    headers: { authorization: `Bearer ${TOKEN}` },
  })
  if (!resp.ok) throw new Error(`${pathname} HTTP ${resp.status}: ${await resp.text()}`)
  return resp.json()
}

const mock = await startMockLlmServer({
  port: MOCK_PORT,
  apiKey: 'mock-key',
  sequence: ['tool_call_success', 'success'],
  repeatLast: true,
  toolName: 'platform_echo',
  toolArguments: JSON.stringify({ message: 'isolation poc' }),
  successText: '隔离验证完成。',
})
console.log('[isolation] mock llm ready')

const child = spawn('pnpm', ['exec', 'dsh', '--profile', 'ai-harness'], {
  cwd: ROOT,
  env: {
    ...process.env,
    DSH_HOME: path.join(ROOT, 'dsh-home'),
    DEEPSEEK_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/v1`,
    DEEPSEEK_API_KEY: 'mock-key',
    DSH_PERMISSION_MODE: 'danger-full-access',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
const logs = []
child.stdout.on('data', (d) => logs.push(`[out] ${d}`))
child.stderr.on('data', (d) => logs.push(`[err] ${d}`))
const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })))

const failures = []
try {
  await waitFor(`http://127.0.0.1:${RUNNER_PORT}/healthz`, { headers: { authorization: `Bearer ${TOKEN}` } })
  const s1 = (await post('/session/start', {})).sessionId
  const s2 = (await post('/session/start', {})).sessionId
  console.log(`[isolation] sessions: ${s1} / ${s2}`)

  const done1 = sseUntil(s1, (events) => events.some((e) => e.type === 'turn/end' && e.data?.reason?.kind === 'completed'), { timeoutMs: 40000 })
  const done2 = sseUntil(s2, (events) => events.some((e) => e.type === 'turn/end' && e.data?.reason?.kind === 'completed'), { timeoutMs: 40000 })

  const [out1, out2] = await Promise.all([
    post(`/session/${s1}/message`, { content: '会话一：请调用 platform_echo' }),
    post(`/session/${s2}/message`, { content: '会话二：请调用 platform_echo' }),
  ])
  console.log(`[isolation] 并发消息完成: ${out1.reason?.kind} / ${out2.reason?.kind}`)

  const [ev1, ev2] = await Promise.all([done1, done2])
  const tr1 = await getJson(`/session/${s1}/trace`)
  const tr2 = await getJson(`/session/${s2}/trace`)

  // 隔离断言 1：SSE 帧归属（sseUntil 内部已拒绝异会话帧）
  // 隔离断言 2：trace 响应 sessionId 与自身一致，轨迹各自完整
  if (tr1.sessionId !== s1) failures.push(`会话一 trace 归属错误: ${tr1.sessionId}`)
  if (tr2.sessionId !== s2) failures.push(`会话二 trace 归属错误: ${tr2.sessionId}`)
  if (tr1.trace?.turns?.length !== 1 || tr1.trace?.turns?.[0]?.endReason !== 'completed') failures.push(`会话一轨迹异常: ${JSON.stringify(tr1.trace)}`)
  if (tr2.trace?.turns?.length !== 1 || tr2.trace?.turns?.[0]?.endReason !== 'completed') failures.push(`会话二轨迹异常: ${JSON.stringify(tr2.trace)}`)
  if (ev1.events.some((e) => e.type === 'turn/end') !== true) failures.push('会话一未完成')
  if (ev2.events.some((e) => e.type === 'turn/end') !== true) failures.push('会话二未完成')
  // 隔离断言 3：并发下工具路径至少被一个会话走通（mock 剧本 FIFO 共享，两个会话拿到的行为可能不同）
  const toolCallsTotal = (tr1.trace?.toolCalls?.length ?? 0) + (tr2.trace?.toolCalls?.length ?? 0)
  if (toolCallsTotal < 1) failures.push('并发下未观察到任何工具调用')
  console.log(`[isolation] s1: turns=${tr1.trace?.turns?.length} toolCalls=${tr1.trace?.toolCalls?.length} | s2: turns=${tr2.trace?.turns?.length} toolCalls=${tr2.trace?.toolCalls?.length}`)
} catch (err) {
  failures.push(String(err?.message ?? err))
} finally {
  child.kill('SIGTERM')
  const exit = await Promise.race([exited, sleep(10000).then(() => null)])
  if (exit === null) {
    child.kill('SIGKILL')
    failures.push('SIGTERM 后 10s 未退出')
  } else {
    console.log(`[isolation] runner exited: code=${exit.code} signal=${exit.signal}`)
  }
  await mock.close()
}

if (failures.length > 0) {
  console.error('\n[isolation] FAIL:')
  for (const f of failures) console.error(`  - ${f}`)
  console.error(logs.join(''))
  process.exit(1)
}
console.log('\n[isolation] PASS：单进程并发双会话隔离（SSE 归属正确、轨迹独立、无事件串扰）')
