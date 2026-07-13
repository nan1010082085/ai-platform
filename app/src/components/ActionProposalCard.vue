<script setup lang="ts">
/**
 * ActionProposalCard — 智能拟办卡片
 *
 * 显示从文档/对话中提取的行动项，支持勾选、审批、修改。
 * 修复：$style（Vue 3 CSS Modules 默认）、注册表图标、
 * 低优先级绿色、模板语法、行内编辑优先级/截止日期。
 */

import { ref, computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { ActionItem, ActionProposal } from '@/types'

const props = defineProps<{
  proposal: ActionProposal
  /** 状态：pending / approved / rejected */
  status?: 'pending' | 'approved' | 'rejected'
  /** 已选中的项 ID 集合（由 composable 管理） */
  selectedIds?: Set<string>
  readonly?: boolean
}>()

const emit = defineEmits<{
  'toggle-item': [itemId: string]
  'toggle-all': []
  approve: [selectedIds: string[]]
  reject: []
  modify: [itemId: string, changes: Partial<ActionItem>]
  reset: []
}>()

// ---- 内部选中状态（当无外部 selectedIds 时使用） ----
const internalSelectedIds = ref<Set<string>>(
  new Set(props.proposal.actionItems.map((item) => item.id)),
)

const activeSelectedIds = computed(() => props.selectedIds ?? internalSelectedIds.value)
const selectedCount = computed(() => activeSelectedIds.value.size)
const allSelected = computed(
  () => selectedCount.value === props.proposal.actionItems.length && props.proposal.actionItems.length > 0,
)

// ---- 优先级 ----
const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  high: { label: '高', color: '#F56C6C', bgColor: '#fef0f0' },
  medium: { label: '中', color: '#E6A23C', bgColor: '#fdf6ec' },
  low: { label: '低', color: '#67C23A', bgColor: '#f0f9eb' },
}

const typeConfig: Record<string, { icon: string; label: string }> = {
  todo: { icon: 'document', label: '待办' },
  approval: { icon: 'stamp', label: '审批' },
  review: { icon: 'view', label: '审阅' },
  decision: { icon: 'warning', label: '决策' },
}

// ---- 行内编辑 ----
const editingId = ref<string | null>(null)
const editForm = ref<Partial<ActionItem>>({})

function toggleItem(id: string): void {
  if (props.readonly || props.status === 'approved' || props.status === 'rejected') return
  if (props.selectedIds) {
    emit('toggle-item', id)
  } else {
    if (internalSelectedIds.value.has(id)) {
      internalSelectedIds.value.delete(id)
    } else {
      internalSelectedIds.value.add(id)
    }
  }
}

function toggleAll(): void {
  if (props.readonly || props.status === 'approved' || props.status === 'rejected') return
  if (props.selectedIds) {
    emit('toggle-all')
  } else {
    if (allSelected.value) {
      internalSelectedIds.value.clear()
    } else {
      props.proposal.actionItems.forEach((item) => internalSelectedIds.value.add(item.id))
    }
  }
}

function startEdit(item: ActionItem): void {
  editingId.value = item.id
  editForm.value = { ...item }
}

function saveEdit(): void {
  if (editingId.value && editForm.value) {
    emit('modify', editingId.value, editForm.value)
    editingId.value = null
    editForm.value = {}
  }
}

function cancelEdit(): void {
  editingId.value = null
  editForm.value = {}
}

function handleApprove(): void {
  emit('approve', Array.from(activeSelectedIds.value))
}

function handleReject(): void {
  emit('reject')
}

function handleReset(): void {
  emit('reset')
}
</script>

<template>
  <div :class="[
    $style.card,
    status === 'approved' && $style.cardApproved,
    status === 'rejected' && $style.cardRejected,
  ]">
    <!-- Header -->
    <div :class="$style.header">
      <div :class="$style.titleRow">
        <AppIcon name="circle-check-filled" :size="16" :style="{ color: '#409EFF' }" />
        <span :class="$style.title">智能拟办</span>
        <span v-if="proposal.documentTitle" :class="$style.docTitle">{{ proposal.documentTitle }}</span>
      </div>

      <!-- Pending: show count badge -->
      <div v-if="!status || status === 'pending'" :class="$style.countBadge">
        {{ selectedCount }}/{{ proposal.actionItems.length }} 项
      </div>

      <!-- Approved / Rejected: show status badge -->
      <div v-else-if="status === 'approved'" :class="[$style.statusBadge, $style.statusApproved]">
        <AppIcon name="check" :size="12" />
        已批准
      </div>
      <div v-else-if="status === 'rejected'" :class="[$style.statusBadge, $style.statusRejected]">
        <AppIcon name="close" :size="12" />
        已拒绝
      </div>
    </div>

    <!-- Summary -->
    <div v-if="proposal.summary" :class="$style.summary">
      {{ proposal.summary }}
    </div>

    <!-- Select All (only in pending state) -->
    <div v-if="(!status || status === 'pending') && !readonly" :class="$style.selectAllRow">
      <label :class="$style.checkbox" @click="toggleAll">
        <span :class="[$style.checkboxInner, allSelected && $style.checked]">
          <AppIcon v-if="allSelected" name="check" :size="10" />
        </span>
        <span>全选</span>
      </label>
    </div>

    <!-- Item List -->
    <div :class="$style.itemList">
      <div
        v-for="item in proposal.actionItems"
        :key="item.id"
        :class="[
          $style.item,
          activeSelectedIds.has(item.id) && $style.itemSelected,
          editingId === item.id && $style.itemEditing,
        ]"
      >
        <!-- Item Header -->
        <div :class="$style.itemHeader" @click="toggleItem(item.id)">
          <label :class="$style.checkbox" @click.stop>
            <span :class="[$style.checkboxInner, activeSelectedIds.has(item.id) && $style.checked]">
              <AppIcon v-if="activeSelectedIds.has(item.id)" name="check" :size="10" />
            </span>
          </label>

          <div :class="$style.itemBadges">
            <span
              :class="$style.priorityBadge"
              :style="{ color: priorityConfig[item.priority]?.color, background: priorityConfig[item.priority]?.bgColor }"
            >
              {{ priorityConfig[item.priority]?.label }}
            </span>
            <span :class="$style.typeBadge">
              <AppIcon :name="typeConfig[item.type]?.icon ?? 'document'" :size="12" />
              {{ typeConfig[item.type]?.label ?? item.type }}
            </span>
          </div>

          <div :class="$style.itemTitle">{{ item.title }}</div>

          <button
            v-if="!readonly && (!status || status === 'pending')"
            :class="$style.editBtn"
            @click.stop="startEdit(item)"
          >
            <AppIcon name="edit" :size="12" />
          </button>
        </div>

        <!-- Edit Form -->
        <div v-if="editingId === item.id" :class="$style.editForm">
          <div :class="$style.editRow">
            <label>标题</label>
            <input v-model="editForm.title" :class="$style.editInput" />
          </div>
          <div :class="$style.editRow">
            <label>描述</label>
            <textarea v-model="editForm.description" :class="$style.editTextarea" rows="2" />
          </div>
          <div :class="$style.editRowInline">
            <div :class="$style.editRow">
              <label>负责人</label>
              <input v-model="editForm.assignee" :class="$style.editInput" placeholder="可选" />
            </div>
            <div :class="$style.editRow">
              <label>截止日期</label>
              <input v-model="editForm.deadline" :class="$style.editInput" placeholder="可选" />
            </div>
          </div>
          <div :class="$style.editRowInline">
            <div :class="$style.editRow">
              <label>优先级</label>
              <select v-model="editForm.priority" :class="$style.editSelect">
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div :class="$style.editRow">
              <label>类型</label>
              <select v-model="editForm.type" :class="$style.editSelect">
                <option value="todo">待办</option>
                <option value="approval">审批</option>
                <option value="review">审阅</option>
                <option value="decision">决策</option>
              </select>
            </div>
          </div>
          <div :class="$style.editActions">
            <button :class="$style.saveBtn" @click="saveEdit">保存</button>
            <button :class="$style.cancelBtn" @click="cancelEdit">取消</button>
          </div>
        </div>

        <!-- Item Body (view mode) -->
        <div v-else :class="$style.itemBody">
          <div :class="$style.itemDesc">{{ item.description }}</div>
          <div :class="$style.itemMeta">
            <span v-if="item.assignee">
              <AppIcon name="user" :size="12" />
              {{ item.assignee }}
            </span>
            <span v-if="item.deadline">
              <AppIcon name="clock" :size="12" />
              {{ item.deadline }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Approval Chain -->
    <div v-if="proposal.approvalChain?.length" :class="$style.chain">
      <span :class="$style.chainLabel">审批链：</span>
      <template v-for="(person, i) in proposal.approvalChain" :key="i">
        <span :class="$style.chainPerson">{{ person }}</span>
        <span v-if="i < proposal.approvalChain!.length - 1" :class="$style.chainArrow">→</span>
      </template>
    </div>

    <!-- Action Buttons -->
    <div v-if="!readonly" :class="$style.actions">
      <!-- Pending: approve / reject -->
      <template v-if="!status || status === 'pending'">
        <button :class="$style.approveBtn" @click="handleApprove">
          <AppIcon name="check" :size="14" />
          确认执行 ({{ selectedCount }} 项)
        </button>
        <button :class="$style.rejectBtn" @click="handleReject">
          <AppIcon name="close" :size="14" />
          暂不执行
        </button>
      </template>
      <!-- Approved / Rejected: reset -->
      <template v-else>
        <button :class="$style.resetBtn" @click="handleReset">
          <AppIcon name="refresh" :size="14" />
          重新审核
        </button>
      </template>
    </div>
  </div>
</template>

<style module src="./ActionProposalCard.module.scss" />
