/**
 * harnessGateway 服务：租户级隔离的第一版实现（M5 门禁项）。
 *
 * 能力：
 * - resolveTenant：Bearer token -> tenantId（POC allowlist 模式；生产接 verifyUrl 内省端点）
 * - registerSession：按租户活跃会话配额（超出 429）
 * - assertBudget：按会话预算——token 预算（usage 累加）与工作量预算（工具调用次数），
 *   任一超限拒绝新轮次（402 BUDGET_EXCEEDED）
 * - issueTicket / consumeTicket：SSE 事件流的短时效票据（每会话多票据并发订阅，替代 query token 明文传递）
 *
 * 错误经 err.statusCode 透传（401/402/404/429），runner-http 统一映射 HTTP 状态。
 */

import { randomBytes, timingSafeEqual } from 'node:crypto'
import { Service } from '@deepseek-ai/cordis'

export const name = 'ai-harness-tenant-gateway'

export const inject = []

const TICKET_TTL_MS = 5 * 60 * 1000

// 副闸 RMB 预算：按 token 估算 × 单价（RMB/1k，DeepSeek V4-Flash 高峰价，与 server 主闸同口径）
const PRICE_PROMPT_RMB = 0.003
const PRICE_COMPLETION_RMB = 0.009

function httpError(statusCode, message) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

function sumUsage(event) {
  const usage = event.data?.usage
  if (!usage) return 0
  return (usage.inputTokens ?? 0)
    + (usage.outputTokens ?? 0)
    + (usage.cacheReadTokens ?? 0)
    + (usage.cacheWriteTokens ?? 0)
    + (usage.reasoningTokens ?? 0)
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export class HarnessGatewayService extends Service {
  constructor(ctx, config = {}) {
    super(ctx, 'harnessGateway')
    this.allowlist = config.allowlist ?? []
    this.verifyUrl = typeof config.verifyUrl === 'string' && config.verifyUrl !== ''
      ? config.verifyUrl
      : (process.env.AI_HARNESS_VERIFY_URL ?? '')
    this.sessionsPerTenant = Number(config.sessionsPerTenant ?? process.env.AI_HARNESS_SESSIONS_PER_TENANT ?? 5)
    this.budgetTokens = Number(config.budgetTokensPerSession ?? process.env.AI_HARNESS_BUDGET_TOKENS ?? 100000)
    this.budgetWorkUnits = Number(config.budgetWorkUnitsPerSession ?? process.env.AI_HARNESS_BUDGET_WORK_UNITS ?? 20)
    this.budgetRmbDaily = Number(config.budgetRmbDaily ?? process.env.AI_HARNESS_DAILY_RMB_BUDGET ?? 10)

    if (this.allowlist.length === 0 && this.verifyUrl === '') {
      throw new Error('tenant-gateway: 必须配置 allowlist 或 verifyUrl（至少一种租户解析方式）')
    }

    /** sessionId -> { tenantId, tickets: Map<ticket, expiresAt> } */
    this.sessions = new Map()
    /** sessionId -> 累计 RMB 成本（recordUsage 写入；assertBudget 汇总他会话） */
    this.dailyRmbBySession = new Map()
    /** token -> { tenantId, expiresAt }：内省结果缓存（TTL = JWT exp 或 60s；负缓存 10s） */
    this.tenantCache = new Map()
    /** tenantId -> 活跃会话数 */
    this.tenantCounts = new Map()
  }

  async resolveTenant(bearer) {
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : ''
    if (!token) return null
    const cached = this.tenantCache.get(token)
    if (cached && cached.expiresAt > Date.now()) return cached.tenantId

    let tenantId = null
    if (this.allowlist.length > 0) {
      const entry = this.allowlist.find((item) => safeEqual(item.token, token))
      if (entry) tenantId = entry.tenantId
    }
    if (tenantId === null && this.verifyUrl !== '') {
      try {
        const resp = await fetch(this.verifyUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (resp.ok) {
          const body = await resp.json()
          // 兼容 server 内省端点（{success,data:{tenantId}}）与裸 {tenantId} 两种响应
          const data = body?.data && typeof body.data === 'object' ? body.data : body
          if (typeof data?.tenantId === 'string') tenantId = data.tenantId
        }
      } catch (err) {
        console.error('[tenant-gateway] 内省失败（按未授权处理）:', err instanceof Error ? err.message : err)
      }
    }

    // 正缓存按 JWT exp 或 60s；负缓存 10s（防止无效 token 打爆内省端点）
    const ttl = tenantId ? this.cacheTtlOf(token) : 10 * 1000
    this.tenantCache.set(token, { tenantId, expiresAt: Date.now() + ttl })
    return tenantId
  }

  /** 从 JWT payload 解析 exp（不验签，仅用于缓存 TTL；解析失败回退 60s） */
  cacheTtlOf(token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'))
      if (Number.isFinite(payload?.exp)) {
        return Math.max(0, Math.min(payload.exp * 1000 - Date.now(), 5 * 60 * 1000))
      }
    } catch {
      // 非 JWT（allowlist/占位 token）— 走默认 TTL
    }
    return 60 * 1000
  }

  registerSession(sessionId, tenantId) {
    const count = this.tenantCounts.get(tenantId) ?? 0
    if (count >= this.sessionsPerTenant) {
      throw httpError(429, `租户 ${tenantId} 活跃会话已达上限（${this.sessionsPerTenant}）`)
    }
    this.sessions.set(sessionId, { tenantId, tickets: new Map() })
    this.tenantCounts.set(tenantId, count + 1)
  }

  releaseSession(sessionId) {
    const record = this.sessions.get(sessionId)
    if (!record) return
    const count = this.tenantCounts.get(record.tenantId) ?? 0
    if (count > 1) this.tenantCounts.set(record.tenantId, count - 1)
    else this.tenantCounts.delete(record.tenantId)
    this.sessions.delete(sessionId)
    this.dailyRmbBySession.delete(sessionId)
  }

  tenantOf(sessionId) {
    return this.sessions.get(sessionId)?.tenantId ?? null
  }

  /** 只读预算报告：当前用量与上限（不抛错）。 */
  budgetReport(sessionId, agentSession) {
    if (!this.sessions.has(sessionId)) throw httpError(404, `unknown session: ${sessionId}`)
    let tokens = 0
    let workUnits = 0
    for (const event of agentSession.events) {
      if (event.type === 'assistant/message') tokens += sumUsage(event)
      if (event.type === 'tool/call') workUnits += 1
    }
    return { tokens, workUnits, budgetTokens: this.budgetTokens, budgetWorkUnits: this.budgetWorkUnits }
  }

  /** Asia/Shanghai 自然日键 */
  todayKey() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
  }

  /** 会话事件的 token 估算（usage 缺失时按字符/4，与 server 主闸一致） */
  estimateTokens(agentSession) {
    let input = 0
    let output = 0
    for (const event of agentSession.events) {
      const data = event.data ?? {}
      const usage = data.usage
      if (usage) {
        input += (usage.inputTokens ?? 0) + (usage.cacheReadTokens ?? 0)
        output += (usage.outputTokens ?? 0) + (usage.cacheWriteTokens ?? 0) + (usage.reasoningTokens ?? 0)
        continue
      }
      if (event.type === 'user/message') {
        input += this.charsOf(data.message?.content) / 4
      } else if (event.type === 'assistant/message') {
        output += this.charsOf(data.message?.content) / 4
      } else if (event.type === 'tool/call') {
        input += String(data.arguments ?? '').length / 4
      }
    }
    return { input, output }
  }

  charsOf(content) {
    if (!Array.isArray(content)) return 0
    return content.filter((b) => b.type === 'text').reduce((n, b) => n + String(b.text ?? '').length, 0)
  }

  /** 会话累计 RMB（按估算 token × 单价 × 汇率） */
  rmbOf(agentSession) {
    const { input, output } = this.estimateTokens(agentSession)
    return (input / 1000) * PRICE_PROMPT_RMB + (output / 1000) * PRICE_COMPLETION_RMB
  }

  /** 会话完成后记账（runner 调用；供每日 RMB 汇总） */
  recordUsage(sessionId, agentSession) {
    this.dailyRmbBySession.set(sessionId, this.rmbOf(agentSession))
  }

  /** 前置预算断言：已用量 >= 上限即拒（新轮次会让用量越界）。 */
  assertBudget(sessionId, agentSession) {
    const report = this.budgetReport(sessionId, agentSession)
    if (this.budgetTokens >= 0 && report.tokens >= this.budgetTokens) {
      throw httpError(402, `BUDGET_EXCEEDED: 会话 token 用量 ${report.tokens} 已达上限 ${this.budgetTokens}`)
    }
    if (this.budgetWorkUnits >= 0 && report.workUnits >= this.budgetWorkUnits) {
      throw httpError(402, `BUDGET_EXCEEDED: 会话工具调用 ${report.workUnits} 已达上限 ${this.budgetWorkUnits}`)
    }
    // 副闸：账号级每日 RMB 预算（本会话实时 + 其他会话累计）
    const thisRmb = this.rmbOf(agentSession)
    let othersRmb = 0
    for (const [sid, rmb] of this.dailyRmbBySession) {
      if (sid !== sessionId) othersRmb += rmb
    }
    const dailyRmb = thisRmb + othersRmb
    if (this.budgetRmbDaily >= 0 && dailyRmb >= this.budgetRmbDaily) {
      throw httpError(402, `BUDGET_EXCEEDED: 今日 RMB 用量 ${dailyRmb.toFixed(6)} 已达上限 ${this.budgetRmbDaily}`)
    }
    return { ...report, rmb: dailyRmb, budgetRmbDaily: this.budgetRmbDaily }
  }

  issueTicket(sessionId) {
    const record = this.sessions.get(sessionId)
    if (!record) throw httpError(404, `unknown session: ${sessionId}`)
    // 多票据：同一会话允许多个并发 SSE 订阅（如多页签），各自持票
    const ticket = randomBytes(24).toString('hex')
    record.tickets.set(ticket, Date.now() + TICKET_TTL_MS)
    return ticket
  }

  consumeTicket(sessionId, ticket) {
    const record = this.sessions.get(sessionId)
    if (!record) return false
    const expiresAt = record.tickets.get(ticket)
    if (!expiresAt || Date.now() > expiresAt) {
      record.tickets.delete(ticket)
      return false
    }
    return true
  }

  stats() {
    return {
      tenants: this.tenantCounts.size,
      sessions: this.sessions.size,
      sessionsPerTenant: this.sessionsPerTenant,
      budgetTokens: this.budgetTokens,
      budgetWorkUnits: this.budgetWorkUnits,
      budgetRmbDaily: this.budgetRmbDaily,
      dailyRmbSessions: this.dailyRmbBySession.size,
    }
  }
}

export const apply = (ctx, config = {}) => {
  new HarnessGatewayService(ctx, config)
}
