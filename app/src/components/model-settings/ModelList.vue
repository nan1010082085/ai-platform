<script setup lang="ts">
import { ref, computed } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import TableRowActions, { type TableRowAction } from '@/components/common/TableRowActions.vue'
import type { Provider } from '@/api/providerApi'
import type { Model, ModelParameters } from '@/api/modelApi'
import styles from '@/views/ModelSettingsView.module.scss'

type ModelTestStatus = 'ok' | 'fail' | 'testing'

const props = defineProps<{
  models: Model[]
  modelsLoading: boolean
  selectedProvider: Provider
  /** 模型最近一次测试结果，key = model.id */
  modelTestStatus?: Map<string, ModelTestStatus>
}>()

// Pagination
const currentPage = ref(1)
const pageSize = ref(10)
const paginatedModels = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return props.models.slice(start, start + pageSize.value)
})

function getTestStatus(modelId: string): ModelTestStatus | undefined {
  return props.modelTestStatus?.get(modelId)
}

function testStatusTagType(status: ModelTestStatus | undefined) {
  if (status === 'ok') return 'success'
  if (status === 'fail') return 'danger'
  if (status === 'testing') return 'warning'
  return 'info'
}

function testStatusText(status: ModelTestStatus | undefined) {
  if (status === 'ok') return '正常'
  if (status === 'fail') return '失败'
  if (status === 'testing') return '测试中'
  return '未测试'
}

const emit = defineEmits<{
  testConnection: [provider: Provider]
  testModel: [model: Model]
  setDefault: [model: Model]
  toggleActive: [model: Model]
  edit: [model: Model]
  delete: [model: Model]
  create: []
}>()

function modelActions(model: Model): TableRowAction[] {
  const actions: TableRowAction[] = [
    {
      key: 'test',
      label: '测试',
      icon: 'connection',
      type: 'primary',
      onClick: () => emit('testModel', model),
    },
  ]
  if (!model.isDefault) {
    actions.push({
      key: 'setDefault',
      label: '设为默认',
      icon: 'check',
      type: 'success',
      onClick: () => emit('setDefault', model),
    })
  }
  actions.push(
    {
      key: 'toggleActive',
      label: model.isActive ? '禁用' : '启用',
      icon: model.isActive ? 'circle-close-filled' : 'circle-check',
      onClick: () => emit('toggleActive', model),
    },
    {
      key: 'edit',
      label: '编辑',
      icon: 'edit',
      type: 'primary',
      onClick: () => emit('edit', model),
    },
    {
      key: 'delete',
      label: '删除',
      icon: 'delete',
      type: 'danger',
      onClick: () => emit('delete', model),
    },
  )
  return actions
}

function paramSummary(params: ModelParameters | undefined): string {
  if (!params) return '--'
  const parts: string[] = []
  if (params.temperature != null) parts.push(`T=${params.temperature}`)
  if (params.maxTokens != null) parts.push(`Max=${params.maxTokens}`)
  if (params.topP != null) parts.push(`P=${params.topP}`)
  return parts.length > 0 ? parts.join(', ') : '--'
}

const CAPABILITY_LABELS: Record<string, string> = {
  chat: '对话',
  image: '图像',
  video: '视频',
  audio: '音频',
}

function capabilityLabel(cap: string): string {
  return CAPABILITY_LABELS[cap] ?? cap
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div :class="styles.modelPanelHeader">
    <div :class="styles.modelPanelTitle">
      <h3>{{ selectedProvider.name }} — 模型</h3>
      <el-tag size="small" :type="selectedProvider.isActive ? 'success' : 'info'">
        {{ selectedProvider.isActive ? '启用' : '禁用' }}
      </el-tag>
    </div>
    <div :class="styles.modelPanelActions">
      <el-button
        size="small"
        @click="emit('testConnection', selectedProvider)"
      >
        <AppIcon name="connection" :size="14" style="margin-right: 4px" />
        测试连接
      </el-button>
      <el-button
        type="primary"
        size="small"
        @click="emit('create')"
      >
        <AppIcon name="plus" :size="14" style="margin-right: 4px" />
        添加模型
      </el-button>
    </div>
  </div>

  <div :class="styles.modelTableWrap" v-loading="modelsLoading">
    <el-table :data="paginatedModels" stripe>
      <el-table-column prop="name" label="名称" min-width="130">
        <template #default="{ row }">
          <span>{{ row.name }}</span>
          <el-tag
            v-if="row.isDefault"
            :class="styles.defaultBadge"
            type="success"
            size="small"
            effect="plain"
          >
            默认
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="model" label="模型标识" min-width="150">
        <template #default="{ row }">
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px">
            {{ row.model }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="参数摘要" width="130">
        <template #default="{ row }">
          <span style="font-size: 12px; color: var(--text-color-secondary)">
            {{ paramSummary(row.parameters) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="能力" width="150">
        <template #default="{ row }">
          <el-tag
            v-for="cap in (row.capabilities ?? ['chat'])"
            :key="cap"
            :type="cap === 'chat' ? 'info' : 'warning'"
            size="small"
            effect="plain"
            style="margin-right: 4px"
          >
            {{ capabilityLabel(cap) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="70" align="center">
        <template #default="{ row }">
          <el-tag
            :type="row.isActive ? 'success' : 'info'"
            size="small"
            effect="plain"
          >
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="测试状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag
            v-if="getTestStatus(row.id)"
            :type="testStatusTagType(getTestStatus(row.id))"
            size="small"
            effect="plain"
          >
            {{ testStatusText(getTestStatus(row.id)) }}
          </el-tag>
          <span v-else style="font-size: 12px; color: var(--text-color-placeholder)">未测试</span>
        </template>
      </el-table-column>
      <el-table-column label="更新时间" width="115">
        <template #default="{ row }">
          <span style="font-size: 12px; color: var(--text-color-secondary)">
            {{ formatDate(row.updatedAt) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <TableRowActions :actions="modelActions(row)" :collapse-at="4" />
        </template>
      </el-table-column>
    </el-table>

    <!-- Empty state for models -->
    <div v-if="models.length === 0 && !modelsLoading" :class="styles.empty">
      <AppIcon name="setting" :size="32" :class="styles.emptyIcon" />
      <p>暂无模型</p>
      <el-button type="primary" plain size="small" @click="emit('create')">
        添加第一个模型
      </el-button>
    </div>

    <!-- Pagination -->
    <div v-if="models.length > pageSize" :class="styles.paginationWrap">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="models.length"
        layout="total, prev, pager, next"
        small
      />
    </div>
  </div>
</template>
