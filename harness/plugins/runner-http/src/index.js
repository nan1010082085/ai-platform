/**
 * ai-harness runner-http：把 DSH Agent 暴露为平台侧可调用的 HTTP 服务。
 *
 * 路由：
 *   GET  /healthz                        健康检查 + 网关统计
 *   POST /session/start                  创建持久化 Agent 会话 -> { sessionId }（租户配额）
 *   POST /session/:id/message            提交用户消息，等待停稳 -> { text, reason }（预算断言）
 *   POST /session/:id/events-ticket      签发 SSE 票据 -> { ticket }
 *   GET  /session/:id/events?ticket=N    SSE 增量推送会话事件（票据鉴权，替代明文 token）
 *   GET  /session/:id/trace              platform.nodeTrace 投影快照
 *
 * 鉴权：harnessGateway.resolveTenant（allowlist / verifyUrl 内省），SSE 走一次性短时效票据。
 * 会话创建模式复用 dsh-headless 的权威实现（agents.create + followup + whenIdle）。
 */

import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { installModelSelection } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'

export const name = 'ai-harness-runner-http'

export const inject = ['agentDefaultModel', 'agents', 'sessions', 'harnessGateway']

/** 汇总一段事件区间内最后一条非空 assistant 文本与轮次结果（对齐 headless 语义）。 */
function summarize(events, firstSeq) {
  let started = false
  let text = ''
  let reason
  for (const event of events) {
    if (event.seq < firstSeq) continue
    if (event.type === 'turn/start') {
      started = true
      continue
    }
    if (!started) continue
    if (event.type === 'assistant/message') {
      const joined = event.data.message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('')
      if (joined !== '') text = joined
    }
    if (event.type === 'turn/end') reason = event.data.reason
  }
  return { text, reason }
}

async function readJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(payload))
}

export function apply(ctx, config = {}) {
  const port = Number(config.port ?? process.env.AI_HARNESS_PORT ?? 5310)
  const gateway = ctx.get('harnessGateway')
  const agents = new Map()
  const sockets = new Set()

  async function startSession(tenantId) {
    await ctx.get('loader')?.await()
    const runtime = ctx.get('agents')
    const selection = ctx.get('agentDefaultModel').currentSelection()
    const sessionId = `session-${randomUUID()}`
    gateway.registerSession(sessionId, tenantId)
    const { agent } = await runtime.create({
      sessionId: SessionId(sessionId),
      meta: { cwd: process.cwd() },
      agentOptions: { provider: selection.provider, model: selection.model },
      setup: (agentCtx) => {
        installModelSelection(agentCtx, { current: selection, assembled: undefined })
      },
    })
    await agent.whenIdle()
    agents.set(sessionId, agent)
    return sessionId
  }

  async function sendMessage(sessionId, content) {
    const agent = agents.get(sessionId)
    if (!agent) {
      const err = new Error(`unknown session: ${sessionId}`)
      err.statusCode = 404
      throw err
    }
    gateway.assertBudget(sessionId, agent.session)
    const firstSeq = agent.session.seq
    agent.followup(createUserMessage({
      content: [{ type: 'text', text: content }],
      source: { kind: 'user' },
    }))
    await agent.whenIdle()
    await ctx.get('sessions').flush(agent.session)
    gateway.recordUsage(sessionId, agent.session)
    const budget = gateway.budgetReport(sessionId, agent.session)
    return { ...summarize(agent.session.events, firstSeq), budget }
  }

  function handleEvents(req, res, sessionId, ticket) {
    const agent = agents.get(sessionId)
    if (!agent) {
      sendJson(res, 404, { error: `unknown session: ${sessionId}` })
      return
    }
    if (!gateway.consumeTicket(sessionId, ticket)) {
      sendJson(res, 401, { error: 'invalid or expired ticket' })
      return
    }
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })
    res.write(`data: ${JSON.stringify({ type: 'hello', sessionId })}\n\n`)
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
    let lastSeq = Number(url.searchParams.get('since') ?? '-1')
    const timer = setInterval(() => {
      if (res.writableEnded || res.destroyed) {
        clearInterval(timer)
        return
      }
      const events = agent.session.events.filter((event) => event.seq > lastSeq)
      if (events.length === 0) return
      lastSeq = events[events.length - 1].seq
      res.write(`data: ${JSON.stringify({ type: 'events', sessionId, events })}\n\n`)
    }, 120)
    req.on('close', () => {
      clearInterval(timer)
    })
  }

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`)
    res.setHeader('access-control-allow-origin', '*')
    res.setHeader('access-control-allow-headers', 'content-type, authorization')
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    if (req.method === 'GET' && url.pathname === '/healthz') {
      sendJson(res, 200, { ok: true, profile: 'ai-harness', gateway: gateway.stats() })
      return
    }
    const messageMatch = url.pathname.match(/^\/session\/([^/]+)\/message$/)
    const eventsMatch = url.pathname.match(/^\/session\/([^/]+)\/events$/)
    const ticketMatch = url.pathname.match(/^\/session\/([^/]+)\/events-ticket$/)
    const traceMatch = url.pathname.match(/^\/session\/([^/]+)\/trace$/)
    Promise.resolve()
      .then(async () => {
        if (req.method === 'POST' && url.pathname === '/session/start') {
          const tenantId = await gateway.resolveTenant(req.headers.authorization ?? '')
          if (!tenantId) {
            sendJson(res, 401, { error: 'unauthorized' })
            return
          }
          const sessionId = await startSession(tenantId)
          sendJson(res, 200, { sessionId, tenantId })
          return
        }
        if (req.method === 'POST' && messageMatch) {
          const tenantId = await gateway.resolveTenant(req.headers.authorization ?? '')
          if (!tenantId || gateway.tenantOf(messageMatch[1]) !== tenantId) {
            sendJson(res, 401, { error: 'unauthorized' })
            return
          }
          const body = await readJsonBody(req)
          if (typeof body.content !== 'string' || body.content.trim() === '') {
            sendJson(res, 400, { error: 'content required' })
            return
          }
          const outcome = await sendMessage(messageMatch[1], body.content)
          sendJson(res, 200, outcome)
          return
        }
        if (req.method === 'POST' && ticketMatch) {
          const tenantId = await gateway.resolveTenant(req.headers.authorization ?? '')
          if (!tenantId || gateway.tenantOf(ticketMatch[1]) !== tenantId) {
            sendJson(res, 401, { error: 'unauthorized' })
            return
          }
          const ticket = gateway.issueTicket(ticketMatch[1])
          sendJson(res, 200, { ticket, expiresInMs: 5 * 60 * 1000 })
          return
        }
        if (req.method === 'GET' && eventsMatch) {
          handleEvents(req, res, eventsMatch[1], url.searchParams.get('ticket') ?? '')
          return
        }
        if (req.method === 'GET' && traceMatch) {
          const tenantId = await gateway.resolveTenant(req.headers.authorization ?? '')
          if (!tenantId || gateway.tenantOf(traceMatch[1]) !== tenantId) {
            sendJson(res, 401, { error: 'unauthorized' })
            return
          }
          const agent = agents.get(traceMatch[1])
          if (!agent) {
            sendJson(res, 404, { error: `unknown session: ${traceMatch[1]}` })
            return
          }
          const projections = ctx.get('sessionProjections')
          if (!projections) {
            sendJson(res, 501, { error: 'sessionProjections unavailable' })
            return
          }
          const snapshot = projections.snapshot(agent.session)
          sendJson(res, 200, {
            sessionId: traceMatch[1],
            tenantId,
            asOfSeq: snapshot.asOfSeq,
            trace: snapshot.values['platform.nodeTrace'] ?? null,
          })
          return
        }
        sendJson(res, 404, { error: `no route: ${req.method} ${url.pathname}` })
      })
      .catch((err) => {
        sendJson(res, err?.statusCode ?? 500, { error: String(err?.message ?? err) })
      })
  })

  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  })

  let rejectListen
  const listening = new Promise((resolve, reject) => {
    rejectListen = reject
    server.listen(port, '127.0.0.1', () => resolve())
  })
  server.on('error', (err) => {
    if (!server.listening) {
      // 监听失败：拒绝 listening，插件 fiber 装载失败 -> 进程非零退出（错误及时暴露）
      rejectListen(err)
      return
    }
    // 已监听后的运行时错误：不允许静默吞掉
    setImmediate(() => {
      throw err
    })
  })

  ctx.logger.info(`ai-harness runner http://127.0.0.1:${port} (auth: harnessGateway)`)

  // 监听成功后才交付 disposer：启动失败即装载失败，不留下悬挂 rejection
  return listening.then(() => async () => {
    for (const socket of sockets) socket.destroy()
    await new Promise((resolve) => server.close(() => resolve()))
    for (const sessionId of agents.keys()) gateway.releaseSession(sessionId)
    agents.clear()
  })
}
