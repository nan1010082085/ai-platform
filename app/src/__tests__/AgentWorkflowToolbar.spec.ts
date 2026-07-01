import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AgentWorkflowToolbar from '../components/agent-workflow/AgentWorkflowToolbar.vue'

const routerPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

const elTooltipStub = { template: '<span><slot /></span>' }
const elPopoverStub = { template: '<span><slot name="reference" /></span>' }

const EP_STUBS = {
  'el-button': {
    template: '<button @click="$emit(\'click\')"><slot /></button>',
    props: ['size', 'type', 'loading', 'plain'],
    emits: ['click'],
  },
  'el-dropdown': { template: '<div><slot /><slot name="dropdown" /></div>' },
  'el-dropdown-menu': { template: '<div><slot /></div>' },
  'el-dropdown-item': { template: '<div><slot /></div>' },
  'el-icon': { template: '<span><slot /></span>' },
}

function mountToolbar(props: Record<string, unknown> = {}) {
  return mount(AgentWorkflowToolbar, {
    props,
    global: {
      stubs: { 'el-tooltip': elTooltipStub, 'el-popover': elPopoverStub, ...EP_STUBS },
    },
  })
}

describe('AgentWorkflowToolbar', () => {
  it('renders title input with default placeholder', () => {
    const wrapper = mountToolbar()
    const input = wrapper.find('input[placeholder="未命名工作流"]')
    expect(input.exists()).toBe(true)
  })

  it('shows dirty badge when dirty', () => {
    const wrapper = mountToolbar({ dirty: true })
    expect(wrapper.text()).toContain('未保存')
  })

  it('emits panel toggle events', async () => {
    const wrapper = mountToolbar()
    const buttons = wrapper.findAll('button')
    const leftToggle = buttons.find((b) => b.attributes('title') === '节点面板')
    const rightToggle = buttons.find((b) => b.attributes('title') === '属性面板')
    expect(leftToggle).toBeTruthy()
    expect(rightToggle).toBeTruthy()
    await leftToggle!.trigger('click')
    await rightToggle!.trigger('click')
    expect(wrapper.emitted('toggle-left-panel')).toHaveLength(1)
    expect(wrapper.emitted('toggle-right-panel')).toHaveLength(1)
  })

  it('emits validate on validate button click', async () => {
    const wrapper = mountToolbar()
    const validateBtn = wrapper.findAll('button').find((b) => b.attributes('title') === '校验')
    await validateBtn!.trigger('click')
    expect(wrapper.emitted('validate')).toHaveLength(1)
  })

  it('navigates back to workflow list', async () => {
    const wrapper = mountToolbar()
    const backBtn = wrapper.findAll('button').find((b) => b.attributes('title') === '返回列表')
    await backBtn!.trigger('click')
    expect(routerPush).toHaveBeenCalledWith({ name: 'agent-workflows' })
  })
})
