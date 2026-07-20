<script setup lang="ts">
/**
 * 表格操作列：按钮过多时折叠为「前 N 个 + 更多」下拉，避免换行撑高行高。
 */
import { computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

export interface TableRowAction {
  key: string
  label: string
  /** AppIcon name */
  icon?: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  onClick: () => void
}

const props = withDefaults(defineProps<{
  actions: TableRowAction[]
  /** 超过该数量时折叠（默认 5：≥5 只展示前 visibleCount + 更多） */
  collapseAt?: number
  /** 折叠时直接展示的按钮数 */
  visibleCount?: number
}>(), {
  collapseAt: 5,
  visibleCount: 2,
})

const shouldCollapse = computed(() => props.actions.length >= props.collapseAt)

const visibleActions = computed(() =>
  shouldCollapse.value
    ? props.actions.slice(0, props.visibleCount)
    : props.actions,
)

const overflowActions = computed(() =>
  shouldCollapse.value
    ? props.actions.slice(props.visibleCount)
    : [],
)

function onCommand(key: string) {
  const action = props.actions.find((a) => a.key === key)
  action?.onClick()
}
</script>

<template>
  <div class="table-row-actions">
    <el-button
      v-for="action in visibleActions"
      :key="action.key"
      link
      :type="action.type ?? 'primary'"
      size="small"
      @click="action.onClick"
    >
      <AppIcon
        v-if="action.icon"
        :name="action.icon"
        :size="14"
        style="margin-right: 2px"
      />
      {{ action.label }}
    </el-button>

    <el-dropdown
      v-if="overflowActions.length"
      trigger="click"
      @command="onCommand"
    >
      <el-button link type="primary" size="small">
        更多
        <AppIcon name="more-filled" :size="14" style="margin-left: 2px" />
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="action in overflowActions"
            :key="action.key"
            :command="action.key"
            :style="action.type === 'danger' ? { color: 'var(--el-color-danger)' } : undefined"
          >
            <AppIcon
              v-if="action.icon"
              :name="action.icon"
              :size="14"
              style="margin-right: 6px"
            />
            {{ action.label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style scoped>
.table-row-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0;
  white-space: nowrap;
}
</style>
