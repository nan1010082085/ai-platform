/**
 * M0-T2 验收：ai/harness 会话全链路冒烟。
 *
 * 链路：mock LLM（OpenAI 兼容，剧本 tool_call_success -> success）
 *   -> dsh --profile ai-harness（base + 三插件）
 *   -> POST /session/start -> SSE 订阅 -> POST /session/:id/message
 *   -> 断言：assistant 终文 / tool_call(platform_echo) / turn/end / 优雅退出
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
const SUCCESS_TEXT = 'POC 完成：platform_echo 已回显。'

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

/** 订阅 SSE（票据鉴权），直到 predicate 返回 true（收到累计事件数组）或超时。 */
async function sseUntil(sessionId, predicate, { timeoutMs = 30000 } = {}) {
  const ticket = await issueTicket(sessionId)
  return new Promise((resolve, reject) => {
    const collected = []
    const timer = setTimeout(() => {
      req.destroy()
      reject(new Error(`sse 超时，已收事件类型: ${collected.map((e) => e.type).join(',') || '(none)'}`))
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
          if (payload.type === 'events') collected.push(...payload.events)
          const verdict = predicate(collected)
          if (verdict !== true) continue
          clearTimeout(timer)
          req.destroy()
          resolve({ events: collected, verdict })
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

function run() {
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
  return { child, exited, logs }
}

const mock = await startMockLlmServer({
  port: MOCK_PORT,
  apiKey: 'mock-key',
  sequence: ['tool_call_success', 'success'],
  repeatLast: true,
  toolName: 'platform_echo',
  toolArguments: JSON.stringify({ message: 'hello from harness poc' }),
  successText: SUCCESS_TEXT,
})
console.log(`[smoke] mock llm ready on :${MOCK_PORT}`)

const { child, exited, logs } = run()

const failures = []
try {
  await waitFor(`http://127.0.0.1:${RUNNER_PORT}/healthz`, { headers: { authorization: `Bearer ${TOKEN}` } })
  console.log('[smoke] runner /healthz ok')

  const auth = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }
  const startResp = await fetch(`http://127.0.0.1:${RUNNER_PORT}/session/start`, { method: 'POST', headers: auth, body: '{}' })
  if (!startResp.ok) throw new Error(`session/start HTTP ${startResp.status}: ${await startResp.text()}`)
  const { sessionId } = await startResp.json()
  console.log(`[smoke] session started: ${sessionId}`)

  const sawToolCall = sseUntil(sessionId, (events) =>
    events.some((e) => e.type === 'tool/call' && e.data?.name === 'platform_echo'), { timeoutMs: 20000 })
  const sawTurnEnd = sseUntil(sessionId, (events) =>
    events.some((e) => e.type === 'turn/end' && e.data?.reason?.kind === 'completed'), { timeoutMs: 20000 })

  const msgResp = await fetch(`http://127.0.0.1:${RUNNER_PORT}/session/${sessionId}/message`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ content: '请调用 platform_echo 工具回显 hello' }),
  })
  if (!msgResp.ok) throw new Error(`message HTTP ${msgResp.status}: ${await msgResp.text()}`)
  const outcome = await msgResp.json()
  console.log(`[smoke] message outcome: text=${JSON.stringify(outcome.text?.slice(0, 60))} reason=${outcome.reason?.kind}`)

  const toolEvents = await sawToolCall
  const toolCall = toolEvents.events.find((e) => e.type === 'tool/call')
  const toolResult = toolEvents.events.find((e) => e.type === 'tool/result')
  console.log(`[smoke] sse tool/call: name=${toolCall?.data?.name} args=${toolCall?.data?.arguments}`)
  console.log(`[smoke] sse tool/result seq=${toolResult?.seq ?? '(pending)'}`)

  await sawTurnEnd
  console.log('[smoke] sse turn/end(completed) ok')

  const traceResp = await fetch(`http://127.0.0.1:${RUNNER_PORT}/session/${sessionId}/trace`, { headers: auth })
  if (!traceResp.ok) throw new Error(`trace HTTP ${traceResp.status}: ${await traceResp.text()}`)
  const { asOfSeq, trace } = await traceResp.json()
  console.log(`[smoke] projection asOfSeq=${asOfSeq} turns=${trace?.turns?.length} toolCalls=${trace?.toolCalls?.length} messages=${trace?.messages?.length}`)

  if (trace === null) failures.push('platform.nodeTrace 投影缺失')
  else {
    const lastTurn = trace.turns.at(-1)
    if (lastTurn?.endReason !== 'completed') failures.push(`投影 turn 未完成: ${JSON.stringify(lastTurn)}`)
    const echoCall = trace.toolCalls.find((c) => c.name === 'platform_echo')
    if (!echoCall || echoCall.resultSeq == null) failures.push(`投影缺少 platform_echo 结果配对: ${JSON.stringify(echoCall)}`)
    if (!trace.messages.some((m) => m.text === SUCCESS_TEXT)) failures.push('投影缺少最终 assistant 文本')
  }

  if (outcome.text !== SUCCESS_TEXT) failures.push(`终文不符: ${JSON.stringify(outcome.text)}`)
  if (outcome.reason?.kind !== 'completed') failures.push(`turn 未完成: ${JSON.stringify(outcome.reason)}`)
  if (toolCall?.data?.name !== 'platform_echo') failures.push('未观察到 platform_echo 工具调用')
  if (!toolResult) failures.push('未观察到 tool/result')
} catch (err) {
  failures.push(String(err?.message ?? err))
} finally {
  child.kill('SIGTERM')
  const exit = await Promise.race([exited, sleep(10000).then(() => null)])
  if (exit === null) {
    child.kill('SIGKILL')
    failures.push('SIGTERM 后 10s 未退出')
  } else {
    console.log(`[smoke] runner exited: code=${exit.code} signal=${exit.signal}`)
  }
  await mock.close()
}

if (failures.length > 0) {
  console.error('\n[smoke] FAIL:')
  for (const f of failures) console.error(`  - ${f}`)
  console.error('\n--- runner logs ---')
  console.error(logs.join(''))
  process.exit(1)
}
console.log('\n[smoke] PASS：会话全链路（建会话 -> 发任务 -> 工具调用 -> 轨迹事件 -> 优雅退出）')
