/**
 * useClientPagination — 客户端列表切片分页
 *
 * 适用于已全量加载、在前端过滤后的列表。
 */
import { computed, ref, watch, type Ref, type ComputedRef } from 'vue'
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination'

export function useClientPagination<T>(
  source: Ref<T[]> | ComputedRef<T[]>,
  options?: { initialPageSize?: number; resetOn?: Array<Ref<unknown> | ComputedRef<unknown>> },
) {
  const currentPage = ref(1)
  const pageSize = ref(options?.initialPageSize ?? DEFAULT_PAGE_SIZE)

  const pagedItems = computed(() => {
    const list = source.value
    const start = (currentPage.value - 1) * pageSize.value
    return list.slice(start, start + pageSize.value)
  })

  const total = computed(() => source.value.length)

  function resetPage() {
    currentPage.value = 1
  }

  watch(pageSize, () => {
    currentPage.value = 1
  })

  watch(
    source,
    (list) => {
      const maxPage = Math.max(1, Math.ceil(list.length / pageSize.value) || 1)
      if (currentPage.value > maxPage) currentPage.value = maxPage
    },
  )

  if (options?.resetOn?.length) {
    watch(options.resetOn, () => {
      resetPage()
    })
  }

  return {
    currentPage,
    pageSize,
    pagedItems,
    total,
    resetPage,
  }
}
