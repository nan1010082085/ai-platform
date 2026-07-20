import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useChatScroll } from '@/composables/useChatScroll'
import type { AIMessage } from '@/types'

function msg(partial: Partial<AIMessage> & { content: string }): AIMessage {
  return {
    id: partial.id ?? 'm1',
    role: partial.role ?? 'user',
    content: partial.content,
    ...partial,
  } as AIMessage
}

describe('useChatScroll', () => {
  it('re-enables stick-to-bottom when a new message is appended', async () => {
    vi.useFakeTimers()
    const messages = ref<AIMessage[]>([msg({ id: '1', content: 'hi' })])
    const { stickToBottom, messagesRef, onMessagesScroll } = useChatScroll(messages)

    messagesRef.value = {
      scrollToBottom: vi.fn(),
      $el: {
        scrollHeight: 1000,
        scrollTop: 0,
        clientHeight: 200,
      } as unknown as HTMLElement,
    }

    onMessagesScroll({
      target: { scrollHeight: 1000, scrollTop: 0, clientHeight: 200 },
    } as unknown as Event)
    expect(stickToBottom.value).toBe(false)

    messages.value = [...messages.value, msg({ id: '2', role: 'assistant', content: '' })]
    await nextTick()
    await nextTick()

    expect(stickToBottom.value).toBe(true)
    expect(messagesRef.value?.scrollToBottom).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
