import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import TableRowActions, { type TableRowAction } from '@/components/common/TableRowActions.vue'

vi.mock('@schema-platform/platform-shared/components/common/AppIcon.vue', () => ({
  default: defineComponent({
    name: 'AppIcon',
    props: { name: String, size: Number },
    setup: (props) => () => h('i', { 'data-icon': props.name }),
  }),
}))

function makeActions(n: number): TableRowAction[] {
  return Array.from({ length: n }, (_, i) => ({
    key: `a${i}`,
    label: `操作${i + 1}`,
    icon: 'edit',
    type: i === n - 1 ? 'danger' : 'primary',
    onClick: vi.fn(),
  }))
}

describe('TableRowActions', () => {
  it('shows all buttons when fewer than collapseAt', () => {
    const actions = makeActions(4)
    const wrapper = mount(TableRowActions, { props: { actions } })
    const buttons = wrapper.findAll('button').filter((b) => !b.text().includes('更多'))
    expect(buttons).toHaveLength(4)
    expect(wrapper.text()).not.toContain('更多')
  })

  it('collapses to 2 buttons + more when actions >= 5', () => {
    const actions = makeActions(5)
    const wrapper = mount(TableRowActions, { props: { actions } })
    expect(wrapper.text()).toContain('操作1')
    expect(wrapper.text()).toContain('操作2')
    expect(wrapper.text()).toContain('更多')
    expect(wrapper.text()).not.toContain('操作3')
  })

  it('invokes onClick for visible actions', async () => {
    const actions = makeActions(5)
    const wrapper = mount(TableRowActions, { props: { actions } })
    await wrapper.findAll('button')[0].trigger('click')
    expect(actions[0].onClick).toHaveBeenCalled()
  })
})
