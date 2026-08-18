/**
 * Harness 客户端聚合（M6 v1）：ai/app -> harness 服务的类型化调用。
 *
 * 端点约定（harness README）：
 * - POST /session/start -> { sessionId }
 * - POST /session/:id/message { content } -> { text, reason }
 * - GET  /session/:id/trace -> { sessionId, asOfSeq, trace }
 * - GET  /session/:id/events -> SSE（事件增量帧）
 *
 * 鉴权：Bearer token（POC 阶段 cordis.patch.yml 的 poc-token；上线前走网关）。
 */

import type { AgentNodeTrace, HarnessTraceResponse } from '@/types/harnessTrace'
import type { AgentNodeTraceToolCall } from '@/types/harnessTrace'

const BASE = (import.meta.env.VITE_HARNESS_BASE_URL as string | undefined) ?? '/schema-platform/harness'
const TOKEN = (import.meta.env.VITE_HARNESS_TOKEN as string | undefined) ?? 'poc-token'

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { authorization: `Bearer ${TOKEN}`, ...extra }
}

export interface HarnessMessageOutcome {
  text: string
  reason?: { kind?: string }
}

export interface HarnessSessionEvent {
  seq: number
  type: string
  data?: Record<string, unknown>
}

export async function startHarnessSession(): Promise<string> {
  const resp = await fetch(`${BASE}/session/start`, {
    method: 'POST',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: '{}',
  })
  if (!resp.ok) throw new Error(`harness session/start HTTP ${resp.status}: ${await resp.text()}`)
  const data = (await resp.json()) as { sessionId: string }
  return data.sessionId
}

export async function sendHarnessMessage(sessionId: string, content: string): Promise<HarnessMessageOutcome> {
  const resp = await fetch(`${BASE}/session/${sessionId}/message`, {
    method: 'POST',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ content }),
  })
  if (!resp.ok) throw new Error(`harness message HTTP ${resp.status}: ${await resp.text()}`)
  return (await resp.json()) as HarnessMessageOutcome
}

export async function fetchHarnessTrace(sessionId: string): Promise<HarnessTraceResponse> {
  const resp = await fetch(`${BASE}/session/${sessionId}/trace`, { headers: authHeaders() })
  if (!resp.ok) throw new Error(`harness trace HTTP ${resp.status}: ${await resp.text()}`)
  return (await resp.json()) as HarnessTraceResponse
}

/**
 * 订阅会话 SSE 事件增量。返回退订函数。
 * 事件帧格式：{ type: 'hello' | 'events', sessionId, events?: HarnessSessionEvent[] }
 */
/**
 * 订阅会话 SSE 事件增量。返回退订函数。
 * 鉴权：先以 Bearer 签发短时效票据（POST /events-ticket），
 * EventSource 以 ?ticket= 连接（不支持自定义 header 的正式替代方案）。
 */
export async function subscribeHarnessEvents(
  sessionId: string,
  onEvents: (events: HarnessSessionEvent[]) => void,
): Promise<() => void> {
  const ticketResp = await fetch(`${BASE}/session/${sessionId}/events-ticket`, {
    method: 'POST',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: '{}',
  })
  if (!ticketResp.ok) throw new Error(`harness events-ticket HTTP ${ticketResp.status}: ${await ticketResp.text()}`)
  const { ticket } = (await ticketResp.json()) as { ticket: string }
  const source = new EventSource(`${BASE}/session/${sessionId}/events?ticket=${encodeURIComponent(ticket)}`)
  source.onmessage = (message) => {
    const payload = JSON.parse(message.data) as { type: string; events?: HarnessSessionEvent[] }
    if (payload.type === 'events' && payload.events) onEvents(payload.events)
  }
  return () => {
    source.close()
  }
}


export interface HarnessHealthResponse {
  ok: boolean
  profile: string
  gateway?: {
    tenants: number
    sessions: number
    sessionsPerTenant: number
    budgetTokens: number
    budgetWorkUnits: number
    budgetRmbDaily: number
    dailyRmbSessions: number
  }
}

export async function checkHarnessHealth(): Promise<HarnessHealthResponse> {
  const resp = await fetch(BASE + '/healthz', { headers: authHeaders() })
  if (!resp.ok) throw new Error('harness health HTTP ' + resp.status)
  return (await resp.json()) as HarnessHealthResponse
}

export type { AgentNodeTrace, AgentNodeTraceToolCall }