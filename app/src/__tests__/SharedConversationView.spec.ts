/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SharedConversationView from '@/views/SharedConversationView.vue'

vi.mock('@/api/aiApi/conversation', () => ({
  getSharedConversation: vi.fn(),
}))

vi.mock('@schema-platform/platform-shared/components/common/AppIcon.vue', () => ({
  default: { name: 'AppIcon', template: '<span />', props: ['name', 'size'] },
}))

vi.mock('@/components/AiMessage.vue', () => ({
  default: {
    name: 'AiMessage',
    props: ['role', 'label', 'content', 'thinking'],
    template: '<div class="ai-msg">{{ content }}</div>',
  },
}))

describe('SharedConversationView', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const api = await import('@/api/aiApi/conversation')
    vi.mocked(api.getSharedConversation).mockReset()
  })

  async function mountView(shareId = 'share1') {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/shared/:shareId',
          name: 'shared-conversation',
          component: SharedConversationView,
          meta: { public: true },
        },
      ],
    })
    await router.push({ name: 'shared-conversation', params: { shareId } })
    return mount(SharedConversationView, {
      global: {
        plugins: [router],
        stubs: {
          ElButton: {
            name: 'ElButton',
            emits: ['click'],
            template: '<button type="button" class="retry-btn" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })
  }

  it('加载成功展示消息', async () => {
    const api = await import('@/api/aiApi/conversation')
    vi.mocked(api.getSharedConversation).mockResolvedValue({
      id: 'c1',
      activeAgent: 'schema',
      messages: [
        { role: 'user', content: '你好世界这是一段比较长的用户输入用于标题' },
        { role: 'assistant', content: '你好' },
      ],
    })

    const wrapper = await mountView()
    await flushPromises()

    expect(api.getSharedConversation).toHaveBeenCalledWith('share1')
    expect(wrapper.text()).toContain('你好世界这是一段比较长的用户输入用于标题'.slice(0, 40))
    expect(wrapper.findAll('.ai-msg')).toHaveLength(2)
  })

  it('加载失败展示错误与重试', async () => {
    const api = await import('@/api/aiApi/conversation')
    vi.mocked(api.getSharedConversation)
      .mockRejectedValueOnce(new Error('Shared conversation not found.'))
      .mockResolvedValueOnce({
        id: 'c1',
        messages: [{ role: 'assistant', content: '恢复成功内容' }],
      })

    const wrapper = await mountView('share-retry')
    await flushPromises()
    expect(wrapper.text()).toContain('Shared conversation not found.')

    await wrapper.find('.retry-btn').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('恢复成功内容')
  })
})
