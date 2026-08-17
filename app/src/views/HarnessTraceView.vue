<script setup lang="ts">
/**
 * Harness 轨迹查看（M6 v1）— 连接 ai/harness 服务的调试视图。
 *
 * 能力：创建会话 -> 发送消息（SSE 实时事件流）-> platform.nodeTrace 轨迹投影渲染。
 * 这是 DSH 轨迹进 workflow 日志（设计文档 §5.8）的前端第一落点：
 * AgentNodeTrace 渲染与 ExecutionDetail 页签共用同一类型契约。
 */

import { ref, onScopeDispose } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PageShell from '@/components/common/PageShell.vue'
import {
  startHarnessSession,
  sendHarnessMessage,
  fetchHarnessTrace,
  subscribeHarnessEvents,
  type HarnessSessionEvent,
} from '@/api/harness'
import type { AgentNodeTrace } from '@/types/harnessTrace'
import styles from './HarnessTraceView.module.scss'

const sessionId = ref('')
const draftMessage = ref('请调用 platform_echo 工具回显 hello')
const busy = ref(false)
const error = ref<string | null>(null)
const trace = ref<AgentNodeTrace | null>(null)
const asOfSeq = ref(-1)
const liveEvents = ref<HarnessSessionEvent[]>([])
let unsubscribe: (() => void) | null = null

function disposeSubscription(): void {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
}

onScopeDispose(disposeSubscription)

async function createSession(): Promise<void> {
  disposeSubscription()
  busy.value = true
  error.value = null
  trace.value = null
  asOfSeq.value = -1
  liveEvents.value = []
  try {
    sessionId.value = await startHarnessSession()
    unsubscribe = await subscribeHarnessEvents(sessionId.value, (events) => {
      liveEvents.value = [...liveEvents.value, ...events]
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}

async function sendMessage(): Promise<void> {
  if (!sessionId.value || busy.value) return
  busy.value = true
  error.value = null
  try {
    const outcome = await sendHarnessMessage(sessionId.value, draftMessage.value)
    ElMessage.success(`轮次完成：${outcome.reason?.kind ?? 'unknown'} — ${outcome.text.slice(0, 40)}`)
    await refreshTrace()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}

async function refreshTrace(): Promise<void> {
  if (!sessionId.value) return
  try {
    const resp = await fetchHarnessTrace(sessionId.value)
    trace.value = resp.trace
    asOfSeq.value = resp.asOfSeq
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

function stepSummary(tool: { name: string; arguments: string; isError: boolean | null }): string {
  const status = tool.isError === null ? '执行中' : tool.isError ? '失败' : '完成'
  return `${tool.name}（${status}）${tool.arguments.slice(0, 80)}`
}

</script>

<template>
  <PageShell>
    <PageHeader title="Harness 轨迹" subtitle="连接 ai/harness 服务：会话、SSE 事件流与 platform.nodeTrace 投影">
      <template #actions>
        <el-button type="primary" :loading="busy" @click="createSession">
          <AppIcon name="plus" :size="14" style="margin-right: 4px" />
          新建会话
        </el-button>
      </template>
    </PageHeader>

    <div :class="styles.panel">
      <div :class="styles.row">
        <span :class="styles.label">Session</span>
        <code :class="styles.mono">{{ sessionId || '（未创建）' }}</code>
        <span :class="styles.label">asOfSeq</span>
        <code :class="styles.mono">{{ asOfSeq }}</code>
      </div>
      <div :class="styles.row">
        <el-input v-model="draftMessage" :disabled="!sessionId" placeholder="发送给 Agent 的消息" />
        <el-button type="primary" :disabled="!sessionId" :loading="busy" @click="sendMessage">发送</el-button>
        <el-button :disabled="!sessionId" @click="refreshTrace">
          <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
          刷新轨迹
        </el-button>
      </div>
      <div v-if="error" :class="styles.error">{{ error }}</div>
    </div>

    <div :class="styles.columns">
      <section :class="styles.column">
        <h3 :class="styles.columnTitle">实时事件流（SSE）</h3>
        <div :class="styles.eventList">
          <div v-for="e in liveEvents" :key="e.seq" :class="styles.eventRow">
            <span :class="styles.eventSeq">{{ e.seq }}</span>
            <span :class="styles.eventType">{{ e.type }}</span>
          </div>
          <p v-if="liveEvents.length === 0" :class="styles.hint">创建会话并发送消息后，事件实时出现在这里。</p>
        </div>
      </section>

      <section :class="styles.column">
        <h3 :class="styles.columnTitle">轨迹投影（AgentNodeTrace）</h3>
        <el-timeline v-if="trace">
          <el-timeline-item
            v-for="turn in trace.turns"
            :key="turn.turn"
            :timestamp="`seq ${turn.startSeq} → ${turn.endSeq ?? '…'} · ${turn.endReason ?? '进行中'}`"
            placement="top"
            :type="turn.endReason === 'completed' ? 'success' : turn.endReason === 'error' ? 'danger' : 'primary'"
          >
            <div :class="styles.turnTitle">第 {{ turn.turn }} 轮</div>
            <ul :class="styles.toolList">
              <li v-for="call in trace.toolCalls.filter((c) => c.turn === turn.turn)" :key="call.callId" :class="styles.toolRow">
                <el-tag size="small" :type="call.isError === true ? 'danger' : call.isError === false ? 'success' : 'info'">
                  {{ call.name }}
                </el-tag>
                <span :class="styles.toolArgs">{{ call.arguments }}</span>
                <span :class="styles.toolMeta">call seq {{ call.callSeq }} · result seq {{ call.resultSeq ?? '…' }}<template v-if="call.isError"> · 失败</template></span>
              </li>
            </ul>
            <p v-for="(m, i) in trace.messages.filter((x) => x.turn === turn.turn)" :key="i" :class="styles.assistantText">
              {{ m.text }}
            </p>
          </el-timeline-item>
        </el-timeline>
        <p v-else :class="styles.hint">暂无轨迹（创建会话并发送消息后自动刷新）。</p>
      </section>
    </div>
  </PageShell>
</template>
