import { ref, nextTick, watch, type Ref } from 'vue'
import type { AIMessage } from '@/types'

function isNearBottom(el: HTMLElement, threshold = 80): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
}

function lastMessageFingerprint(list: AIMessage[]) {
  const last = list[list.length - 1]
  return {
    length: list.length,
    contentLen: last?.content?.length ?? 0,
    thinkingLen: last?.thinking?.length ?? 0,
    tipLen: last?.tip?.length ?? 0,
    toolCalls: last?.toolCalls?.length ?? 0,
    nodes: last?.workflowExecution?.nodeRecords?.length ?? 0,
    schemaLen: last?.schema?.length ?? 0,
    flowNodes: last?.flow?.nodes?.length ?? 0,
    docs: last?.documentSummaries?.length ?? 0,
  }
}

/**
 * Stick-to-bottom scroll helpers for the virtualized chat message list.
 *
 * After the user scrolls up, stick is off until they return near bottom —
 * except when a *new* message is appended (user send / assistant placeholder),
 * which always re-enables stick and scrolls down.
 */
export function useChatScroll(messages: Ref<AIMessage[]> | (() => AIMessage[])) {
  const messagesRef = ref<{ scrollToBottom?: () => void; $el?: HTMLElement } | null>(null)
  const stickToBottom = ref(true)

  function onMessagesScroll(event: Event): void {
    const el = event.target as HTMLElement | null
    if (!el) return
    stickToBottom.value = isNearBottom(el)
  }

  function scrollToBottom(force = false) {
    if (!force && !stickToBottom.value) return
    nextTick(() => {
      const scroller = messagesRef.value
      if (scroller?.scrollToBottom) {
        scroller.scrollToBottom()
        return
      }
      const el = scroller?.$el
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  const getMessages = typeof messages === 'function' ? messages : () => messages.value

  watch(
    () => lastMessageFingerprint(getMessages()),
    (curr, prev) => {
      const isNewMessage = !prev || curr.length > prev.length
      if (isNewMessage) {
        stickToBottom.value = true
        scrollToBottom(true)
        return
      }
      scrollToBottom()
    },
  )

  return {
    messagesRef,
    stickToBottom,
    onMessagesScroll,
    scrollToBottom,
  }
}
