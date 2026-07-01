<template>
  <div :class="styles.toolbar">
    <!-- Left: back + title -->
    <div :class="styles.left">
      <button :class="styles.iconBtn" title="返回列表" @click="goToList">
        <AppIcon name="arrow-left" :size="14" />
      </button>
      <div :class="styles.divider" />
      <input
        :class="styles.titleInput"
        :value="title"
        placeholder="未命名工作流"
        @input="$emit('update:title', ($event.target as HTMLInputElement).value)"
      />
      <span v-if="publishedVersion" :class="styles.versionBadge">v{{ publishedVersion }}</span>
      <span v-if="dirty" :class="styles.dirtyBadge">未保存</span>
    </div>

    <!-- Center: panel toggles + shortcuts -->
    <div :class="styles.center">
      <el-tooltip :content="showLeftPanel ? '隐藏节点面板' : '显示节点面板'" placement="bottom">
        <button
          :class="[styles.iconBtn, { [styles.iconBtnActive]: showLeftPanel }]"
          title="节点面板"
          @click="$emit('toggle-left-panel')"
        >
          <AppIcon name="grid" :size="14" />
        </button>
      </el-tooltip>
      <el-tooltip :content="showRightPanel ? '隐藏属性面板' : '显示属性面板'" placement="bottom">
        <button
          :class="[styles.iconBtn, { [styles.iconBtnActive]: showRightPanel }]"
          title="属性面板"
          @click="$emit('toggle-right-panel')"
        >
          <AppIcon name="setting" :size="14" />
        </button>
      </el-tooltip>
      <div :class="styles.divider" />
      <el-tooltip :content="deleteTooltip" placement="bottom">
        <button
          :class="[styles.iconBtn, { [styles.iconBtnDanger]: canDeleteNode }]"
          :title="deleteTitle"
          :disabled="!canDeleteNode"
          @click="$emit('delete-node')"
        >
          <AppIcon name="delete" :size="14" />
        </button>
      </el-tooltip>
      <el-tooltip content="执行记录" placement="bottom">
        <button :class="styles.iconBtn" title="执行记录" @click="$emit('executions')">
          <AppIcon name="list" :size="14" />
        </button>
      </el-tooltip>
      <el-popover placement="bottom" :width="280" trigger="click">
        <div :class="styles.shortcuts">
          <div :class="styles.shortcutsTitle">快捷键</div>
          <div :class="styles.shortcutRow">
            <span :class="styles.shortcutLabel">保存</span>
            <span :class="styles.shortcutKeys"><kbd>Ctrl</kbd> + <kbd>S</kbd></span>
          </div>
          <div :class="styles.shortcutRow">
            <span :class="styles.shortcutLabel">删除节点</span>
            <span :class="styles.shortcutKeys"><kbd>Delete</kbd></span>
          </div>
        </div>
        <template #reference>
          <button :class="styles.iconBtn" title="快捷键帮助">
            <AppIcon name="question-filled" :size="14" />
          </button>
        </template>
      </el-popover>
    </div>

    <!-- Right: version + validate + save/publish/execute -->
    <div :class="styles.right">
      <el-popover placement="bottom" :width="400" trigger="click" @show="$emit('version-history')">
        <slot name="version-popover" />
        <template #reference>
          <button :class="styles.iconBtn" title="版本历史">
            <AppIcon name="clock" :size="14" />
          </button>
        </template>
      </el-popover>
      <el-tooltip content="校验工作流" placement="bottom">
        <button :class="styles.iconBtn" title="校验" @click="$emit('validate')">
          <AppIcon name="circle-check" :size="14" />
        </button>
      </el-tooltip>
      <div :class="styles.divider" />
      <el-dropdown trigger="click" @command="handleSaveCommand">
        <el-button size="small" :class="styles.saveBtn" :loading="saving">
          <span>{{ saving ? '保存中...' : '保存' }}</span>
          <el-icon :size="12"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="save">
              <span :class="styles.dropdownItem">
                <AppIcon name="document" :size="14" />
                <span>保存工作流</span>
              </span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button type="primary" size="small" :loading="publishing" @click="$emit('publish')">
        {{ publishing ? '发布中...' : '发布' }}
      </el-button>
      <el-button size="small" type="primary" plain :loading="executing" @click="$emit('execute')">
        测试执行
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDown } from '@element-plus/icons-vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import styles from './AgentWorkflowToolbar.module.scss'

const props = defineProps<{
  title?: string
  dirty?: boolean
  saving?: boolean
  publishing?: boolean
  executing?: boolean
  publishedVersion?: string | null
  showLeftPanel?: boolean
  showRightPanel?: boolean
  /** 当前选中节点 ID（用于启用删除按钮） */
  selectedNodeId?: string | null
  /** 是否处于执行中（禁用节点删除） */
  hasRunningExecution?: boolean
}>()

const emit = defineEmits<{
  save: []
  publish: []
  execute: []
  validate: []
  executions: []
  'version-history': []
  'toggle-left-panel': []
  'toggle-right-panel': []
  'delete-node': []
  'update:title': [title: string]
}>()

const router = useRouter()

const canDeleteNode = computed(
  () => !!props.selectedNodeId && !props.executing && !props.hasRunningExecution,
)

const deleteTitle = computed(() => {
  if (props.hasRunningExecution || props.executing) return '执行中，不允许删除节点'
  if (!props.selectedNodeId) return '请先选中要删除的节点'
  return '删除选中节点 (Delete)'
})

const deleteTooltip = computed(() => deleteTitle.value)

function goToList() {
  router.push({ name: 'agent-workflows' })
}

function handleSaveCommand(command: string) {
  if (command === 'save') emit('save')
}
</script>
