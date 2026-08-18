<script setup lang="ts">
/**
 * Agent 轨迹面板 — 显示 harness 会话的实时轨迹
 *
 * 功能：
 * - 显示 turns（轮次）
 * - 显示 toolCalls（工具调用）
 * - 显示 messages（中间消息）
 * - 支持实时更新
 */

import { ref, computed, watch, onUnmounted } from 'vue'
import { ElEmpty, ElTag, ElTimeline, ElTimelineItem, ElCard, ElCollapse, ElCollapseItem } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { AgentNodeTrace, AgentNodeTraceToolCall, AgentNodeTraceTurn, AgentNodeTraceMessage } from '@/types/harnessTrace'

interface Props {
  trace: AgentNodeTrace | null
  loading?: boolean
  sessionId?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  sessionId: '',
})

// 工具调用状态颜色
function getToolCallStatus(tool: AgentNodeTraceToolCall): 'success' | 'danger' | 'warning' | 'info' {
  if (tool.isError === null) return 'warning' // 执行中
  if (tool.isError === true) return 'danger' // 失败
  return 'success' // 成功
}

function getToolCallStatusText(tool: AgentNodeTraceToolCall): string {
  if (tool.isError === null) return '执行中'
  if (tool.isError === true) return '失败'
  return '完成'
}

// 格式化时间戳
function formatSeq(seq: number): string {
  return `#${seq}`
}

// 截断长文本
function truncate(text: string, maxLen: number = 100): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

// 按轮次分组工具调用
const toolCallsByTurn = computed(() => {
  if (!props.trace?.toolCalls) return new Map<number, AgentNodeTraceToolCall[]>()
  const map = new Map<number, AgentNodeTraceToolCall[]>()
  for (const tc of props.trace.toolCalls) {
    const turn = tc.turn
    if (!map.has(turn)) map.set(turn, [])
    map.get(turn)!.push(tc)
  }
  return map
})

// 按轮次分组消息
const messagesByTurn = computed(() => {
  if (!props.trace?.messages) return new Map<number, AgentNodeTraceMessage[]>()
  const map = new Map<number, AgentNodeTraceMessage[]>()
  for (const msg of props.trace.messages) {
    const turn = msg.turn
    if (!map.has(turn)) map.set(turn, [])
    map.get(turn)!.push(msg)
  }
  return map
})

// 活跃的折叠面板
const activeCollapse = ref<string[]>([])
</script>

<template>
  <div :class="$style.panel">
    <div :class="$style.header">
      <AppIcon name="data-line" :size="16" />
      <span :class="$style.title">Agent 轨迹</span>
      <ElTag v-if="sessionId" size="small" type="info" :class="$style.sessionTag">
        {{ sessionId.slice(0, 8) }}...
      </ElTag>
    </div>

    <div :class="$style.content">
      <!-- 加载状态 -->
      <div v-if="loading" :class="$style.loading">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <span>加载轨迹中...</span>
      </div>

      <!-- 空状态 -->
      <ElEmpty
        v-else-if="!trace || (!trace.turns.length && !trace.toolCalls.length && !trace.messages.length)"
        description="暂无轨迹数据"
        :image-size="60"
      />

      <!-- 轨迹内容 -->
      <div v-else :class="$style.traceContent">
        <!-- 轮次列表 -->
        <ElCollapse v-model="activeCollapse" :class="$style.collapse">
          <ElCollapseItem
            v-for="turn in trace.turns"
            :key="turn.turn"
            :name="String(turn.turn)"
            :class="$style.turnItem"
          >
            <template #title>
              <div :class="$style.turnHeader">
                <AppIcon name="chat-dot-round" :size="14" />
                <span :class="$style.turnLabel">轮次 {{ turn.turn }}</span>
                <ElTag
                  v-if="turn.endReason"
                  size="small"
                  :type="turn.endReason === 'complete' ? 'success' : 'info'"
                >
                  {{ turn.endReason }}
                </ElTag>
                <span :class="$style.turnSeq">
                  {{ formatSeq(turn.startSeq) }} → {{ turn.endSeq ? formatSeq(turn.endSeq) : '...' }}
                </span>
              </div>
            </template>

            <!-- 该轮次的工具调用 -->
            <div v-if="toolCallsByTurn.has(turn.turn)" :class="$style.toolCalls">
              <div :class="$style.sectionTitle">
                <AppIcon name="connection" :size="12" />
                <span>工具调用</span>
              </div>
              <ElTimeline :class="$style.timeline">
                <ElTimelineItem
                  v-for="tc in toolCallsByTurn.get(turn.turn)"
                  :key="tc.callId"
                  :type="getToolCallStatus(tc)"
                  :hollow="tc.isError === null"
                  :timestamp="formatSeq(tc.callSeq)"
                  placement="top"
                >
                  <ElCard shadow="never" :class="$style.toolCard">
                    <div :class="$style.toolHeader">
                      <span :class="$style.toolName">{{ tc.name }}</span>
                      <ElTag size="small" :type="getToolCallStatus(tc)">
                        {{ getToolCallStatusText(tc) }}
                      </ElTag>
                    </div>
                    <div v-if="tc.arguments" :class="$style.toolArgs">
                      <pre>{{ truncate(tc.arguments, 200) }}</pre>
                    </div>
                    <div v-if="tc.resultSeq" :class="$style.toolResult">
                      <span :class="$style.resultLabel">结果:</span>
                      <span :class="$style.resultSeq">{{ formatSeq(tc.resultSeq) }}</span>
                    </div>
                  </ElCard>
                </ElTimelineItem>
              </ElTimeline>
            </div>

            <!-- 该轮次的消息 -->
            <div v-if="messagesByTurn.has(turn.turn)" :class="$style.messages">
              <div :class="$style.sectionTitle">
                <AppIcon name="chat-line-square" :size="12" />
                <span>中间消息</span>
              </div>
              <div
                v-for="msg in messagesByTurn.get(turn.turn)"
                :key="msg.step"
                :class="$style.messageItem"
              >
                <span :class="$style.messageStep">Step {{ msg.step }}</span>
                <span :class="$style.messageText">{{ msg.text }}</span>
              </div>
            </div>
          </ElCollapseItem>
        </ElCollapse>
      </div>
    </div>
  </div>
</template>

<style module lang="scss">
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
  border-left: 1px solid var(--el-border-color-lighter);
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sessionTag {
  margin-left: auto;
  font-family: monospace;
  font-size: 11px;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 200px;
  color: var(--el-text-color-secondary);
}

.traceContent {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.collapse {
  border: none;
}

.turnItem {
  margin-bottom: 8px;
}

.turnHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.turnLabel {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.turnSeq {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
}

.sectionTitle {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
}

.toolCalls {
  margin-top: 12px;
}

.timeline {
  padding-left: 0;
}

.toolCard {
  margin-bottom: 0;
}

.toolHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.toolName {
  font-weight: 600;
  color: var(--el-color-primary);
}

.toolArgs {
  background: var(--el-fill-color-light);
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 8px;
  overflow-x: auto;

  pre {
    margin: 0;
    font-size: 12px;
    font-family: monospace;
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--el-text-color-regular);
  }
}

.toolResult {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.resultLabel {
  color: var(--el-text-color-secondary);
}

.resultSeq {
  font-family: monospace;
  color: var(--el-color-success);
}

.messages {
  margin-top: 12px;
}

.messageItem {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  margin-bottom: 4px;
}

.messageStep {
  font-size: 11px;
  font-weight: 600;
  color: var(--el-color-info);
  white-space: nowrap;
}

.messageText {
  font-size: 12px;
  color: var(--el-text-color-regular);
}
</style>