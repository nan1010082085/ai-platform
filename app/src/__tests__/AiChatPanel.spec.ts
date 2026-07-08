/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AiChatPanel from '@/components/AiChatPanel.vue'

// Mock API
vi.mock('@/api/aiApi', () => ({
  getStarterPrompts: vi.fn().mockResolvedValue([
    { icon: 'edit', text: '帮我生成一个用户注册表单', agent: 'editor' },
    { icon: 'list', text: '创建一个订单审批流程', agent: 'flow' },
    { icon: 'search', text: '搜索已有的表单模板', agent: 'auto' },
    { icon: 'setting', text: '设计一个系统配置页面', agent: 'editor' },
  ]),
  uploadFile: vi.fn(),
}))

// Stub child components
const AiMessageStub = { template: '<div />', props: ['role', 'label', 'content'] }
const TaskChainBarStub = { template: '<div />', props: ['steps', 'currentIndex'] }
const AiRagSearchStub = { template: '<div />', props: ['searchResults', 'selectedContext', 'loading'] }

// AiMentionInput stub that exposes a textarea and emits send
const AiMentionInputStub = {
  template: `<div>
    <textarea ref="ta" :disabled="disabled" @keydown="onKey" />
  </div>`,
  props: ['disabled', 'loading', 'placeholder'],
  emits: ['send'],
  methods: {
    onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        const ta = (this as any).$refs.ta as HTMLTextAreaElement
        const val = ta.value.trim()
        if (val) (this as any).$emit('send', val, [])
      }
    },
  },
}

describe('AiChatPanel', () => {
  const defaultProps = {
    title: 'Test Chat',
    agent: 'auto' as const,
    messages: [],
    loading: false,
  }

  const stubs = {
    AiMessage: AiMessageStub,
    TaskChainBar: TaskChainBarStub,
    AiRagSearch: AiRagSearchStub,
    AiMentionInput: AiMentionInputStub,
    AppIcon: { template: '<span />', props: ['name', 'size'] },
    AgentWorkflowPicker: { template: '<div />', props: ['modelValue', 'showLabel'] },
    ElPopover: { template: '<div><slot /><slot name="reference" /></div>', props: ['visible', 'width'] },
    ElTooltip: { template: '<div><slot /></div>', props: ['content'] },
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders header with title and agent badge', async () => {
    const wrapper = mount(AiChatPanel, {
      props: defaultProps,
      global: { stubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Test Chat')
    expect(wrapper.text()).toContain('Auto')
  })

  describe('F3: Empty state starter prompts', () => {
    it('shows prompt cards from API when messages is empty', async () => {
      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })
      await flushPromises()

      expect(wrapper.text()).toContain('开始一段新对话')

      const promptCards = wrapper.findAll('[class*="promptCard"]')
      expect(promptCards).toHaveLength(4)

      expect(wrapper.text()).toContain('帮我生成一个用户注册表单')
      expect(wrapper.text()).toContain('创建一个订单审批流程')
      expect(wrapper.text()).toContain('搜索已有的表单模板')
      expect(wrapper.text()).toContain('设计一个系统配置页面')
    })

    it('falls back to hardcoded prompts when API fails', async () => {
      const { getStarterPrompts } = await import('@/api/aiApi')
      vi.mocked(getStarterPrompts).mockRejectedValueOnce(new Error('network error'))

      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })
      await flushPromises()

      const promptCards = wrapper.findAll('[class*="promptCard"]')
      expect(promptCards).toHaveLength(4)
      expect(wrapper.text()).toContain('帮我生成一个用户注册表单')
    })

    it('uses API prompts when they differ from defaults', async () => {
      const { getStarterPrompts } = await import('@/api/aiApi')
      vi.mocked(getStarterPrompts).mockResolvedValueOnce([
        { icon: 'star', text: '自定义提示词', agent: 'auto' },
      ])

      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })
      await flushPromises()

      const promptCards = wrapper.findAll('[class*="promptCard"]')
      expect(promptCards).toHaveLength(1)
      expect(wrapper.text()).toContain('自定义提示词')
    })

    it('falls back to hardcoded prompts when API returns empty array', async () => {
      const { getStarterPrompts } = await import('@/api/aiApi')
      vi.mocked(getStarterPrompts).mockResolvedValueOnce([])

      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })
      await flushPromises()

      const promptCards = wrapper.findAll('[class*="promptCard"]')
      expect(promptCards).toHaveLength(4)
    })

    it('hides prompt cards when messages exist', async () => {
      const wrapper = mount(AiChatPanel, {
        props: {
          ...defaultProps,
          messages: [
            { role: 'user', content: 'hi', timestamp: new Date() },
          ],
        },
        global: { stubs },
      })
      await flushPromises()

      const promptCards = wrapper.findAll('[class*="promptCard"]')
      expect(promptCards).toHaveLength(0)
    })

    it('emits send event with correct agent when prompt card is clicked', async () => {
      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })
      await flushPromises()

      const promptCards = wrapper.findAll('[class*="promptCard"]')

      await promptCards[0].trigger('click')
      expect(wrapper.emitted('send')).toBeTruthy()
      expect(wrapper.emitted('send')![0]).toEqual(['帮我生成一个用户注册表单', 'editor'])

      await promptCards[1].trigger('click')
      expect(wrapper.emitted('send')![1]).toEqual(['创建一个订单审批流程', 'flow'])
    })
  })

  describe('input area', () => {
    it('sends message on Enter key via AiMentionInput', async () => {
      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })
      await flushPromises()

      const textarea = wrapper.find('textarea')
      await textarea.setValue('Hello')
      await textarea.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('send')).toBeTruthy()
      expect(wrapper.emitted('send')![0][0]).toBe('Hello')
    })

    it('does not send on Shift+Enter', async () => {
      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })
      await flushPromises()

      const textarea = wrapper.find('textarea')
      await textarea.setValue('Hello')
      await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })

      expect(wrapper.emitted('send')).toBeFalsy()
    })

    it('does not send empty message', async () => {
      const wrapper = mount(AiChatPanel, {
        props: defaultProps,
        global: { stubs },
      })
      await flushPromises()

      const textarea = wrapper.find('textarea')
      await textarea.setValue('   ')
      await textarea.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('send')).toBeFalsy()
    })
  })
})
