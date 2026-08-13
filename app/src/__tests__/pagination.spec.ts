/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AppPagination from '@schema-platform/platform-shared/components/common/AppPagination.vue'
import { useClientPagination } from '@schema-platform/platform-shared/utils/useClientPagination'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, PAGINATION_LAYOUT } from '@schema-platform/platform-shared/utils/pagination'

describe('pagination constants', () => {
  it('defaults to 10 with unified sizes/layout', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(10)
    expect([...PAGE_SIZE_OPTIONS]).toEqual([10, 20, 50])
    expect(PAGINATION_LAYOUT).toBe('total, sizes, prev, pager, next')
  })
})

describe('AppPagination', () => {
  it('hides when total is 0', () => {
    const wrapper = mount(AppPagination, {
      props: { currentPage: 1, pageSize: 10, total: 0 },
      global: { stubs: { 'el-pagination': true } },
    })
    expect(wrapper.find('[data-testid="app-pagination"]').exists()).toBe(false)
  })

  it('shows when total > 0 and emits page/size changes', async () => {
    const wrapper = mount(AppPagination, {
      props: { currentPage: 1, pageSize: 10, total: 25 },
      global: {
        stubs: {
          'el-pagination': {
            props: ['currentPage', 'pageSize', 'total', 'pageSizes', 'layout', 'background'],
            emits: ['current-change', 'size-change'],
            template: `
              <div>
                <button data-testid="next" @click="$emit('current-change', 2)">next</button>
                <button data-testid="size" @click="$emit('size-change', 20)">size</button>
              </div>
            `,
          },
        },
      },
    })
    expect(wrapper.find('[data-testid="app-pagination"]').exists()).toBe(true)
    await wrapper.find('[data-testid="next"]').trigger('click')
    expect(wrapper.emitted('update:currentPage')?.[0]).toEqual([2])
    await wrapper.find('[data-testid="size"]').trigger('click')
    expect(wrapper.emitted('update:pageSize')?.[0]).toEqual([20])
  })
})

describe('useClientPagination', () => {
  it('slices with default page size 10 and resets on dependency change', async () => {
    const source = ref(Array.from({ length: 25 }, (_, i) => i + 1))
    const filter = ref('a')
    const { currentPage, pageSize, pagedItems, total } = useClientPagination(source, {
      resetOn: [filter],
    })
    expect(pageSize.value).toBe(10)
    expect(total.value).toBe(25)
    expect(pagedItems.value).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    currentPage.value = 3
    expect(pagedItems.value).toEqual([21, 22, 23, 24, 25])
    filter.value = 'b'
    await Promise.resolve()
    expect(currentPage.value).toBe(1)
  })
})
