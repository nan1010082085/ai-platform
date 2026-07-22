<script setup lang="ts">
/**
 * 我的集成密钥 — 管理 /api/keys CRUD
 *
 * 功能：创建、脱敏列表、禁用/启用、删除。
 * 创建后弹窗一次性展示完整 sk-... Key。
 */

import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from '@schema-platform/platform-shared'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import CardTable from '@/components/common/CardTable.vue'
import TableRowActions, { type TableRowAction } from '@/components/common/TableRowActions.vue'
import {
  createApiKey,
  getApiKeys,
  updateApiKeyStatus,
  deleteApiKey,
  type ApiKeyItem,
  type ApiKeyStatus,
} from '@/api/apiKeyApi'
import styles from './ApiKeyManagerView.module.scss'

const { t, locale } = useI18n()

const keys = ref<ApiKeyItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)

// 创建表单
const showCreateDialog = ref(false)
const newName = ref('')
const creating = ref(false)

// 创建后展示完整 Key
const showKeyDialog = ref(false)
const createdFullKey = ref('')

async function loadKeys(): Promise<void> {
  loading.value = true
  try {
    const res = await getApiKeys({ page: page.value, pageSize: pageSize.value })
    keys.value = res.items
    total.value = res.total
  } catch (e) {
    ElMessage.error((e as Error).message || t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

function handlePageChange(newPage: number): void {
  page.value = newPage
  void loadKeys()
}

function openCreateDialog(): void {
  newName.value = ''
  showCreateDialog.value = true
}

async function handleCreate(): Promise<void> {
  const name = newName.value.trim()
  if (!name) {
    ElMessage.warning(t('apiKey.nameRequired'))
    return
  }
  creating.value = true
  try {
    const item = await createApiKey({ name, permissions: ['workflow:execute'] })
    createdFullKey.value = item.key
    showCreateDialog.value = false
    showKeyDialog.value = true
    ElMessage.success(t('apiKey.createSuccess'))
    void loadKeys()
  } catch (e) {
    ElMessage.error((e as Error).message || t('common.createFailed'))
  } finally {
    creating.value = false
  }
}

function copyKey(): void {
  navigator.clipboard.writeText(createdFullKey.value).then(() => {
    ElMessage.success(t('apiKey.copied'))
  }).catch(() => {
    ElMessage.warning(t('apiKey.copyFailed'))
  })
}

async function handleToggleStatus(item: ApiKeyItem): Promise<void> {
  const newStatus: ApiKeyStatus = item.status === 'active' ? 'disabled' : 'active'
  try {
    await updateApiKeyStatus(item.id, newStatus)
    ElMessage.success(newStatus === 'active' ? t('apiKey.enabledMsg') : t('apiKey.disabledMsg'))
    void loadKeys()
  } catch (e) {
    ElMessage.error(
      (e as Error).message
      || (newStatus === 'active' ? t('apiKey.enableFailed') : t('apiKey.disableFailed')),
    )
  }
}

async function handleDelete(item: ApiKeyItem): Promise<void> {
  try {
    await ElMessageBox.confirm(
      t('apiKey.deleteConfirm', { name: item.name }),
      t('apiKey.deleteTitle'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      },
    )
    await deleteApiKey(item.id)
    ElMessage.success(t('apiKey.deleted'))
    void loadKeys()
  } catch (e) {
    if (e === 'cancel') return
    ElMessage.error((e as Error).message || t('common.deleteFailed'))
  }
}

function rowActions(row: ApiKeyItem): TableRowAction[] {
  return [
    {
      key: 'toggle-status',
      label: row.status === 'active' ? t('common.disable') : t('common.enable'),
      type: row.status === 'active' ? 'warning' : 'success',
      onClick: () => handleToggleStatus(row),
    },
    {
      key: 'delete',
      label: t('common.delete'),
      type: 'danger',
      onClick: () => handleDelete(row),
    },
  ]
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const dateLocale = locale.value === 'en-US' ? 'en-US' : 'zh-CN'
  return new Date(iso).toLocaleString(dateLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  void loadKeys()
})
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.scroll">
      <header :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1>{{ t('apiKey.title') }}</h1>
            <p :class="styles.subtitle">
              {{ t('apiKey.subtitle') }}
            </p>
          </div>
          <div :class="styles.headerActions">
            <el-button :loading="loading" @click="loadKeys">
              <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
              {{ t('common.refresh') }}
            </el-button>
            <el-button type="primary" @click="openCreateDialog">
              <AppIcon name="plus" :size="14" style="margin-right: 4px" />
              {{ t('apiKey.create') }}
            </el-button>
          </div>
        </div>
      </header>

      <div :class="styles.content">
        <div :class="styles.summary">
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">{{ t('apiKey.total') }}</div>
            <div :class="styles.summaryValue">{{ total }}</div>
          </div>
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">{{ t('apiKey.activeCount') }}</div>
            <div :class="styles.summaryValue">{{ keys.filter((k) => k.status === 'active').length }}</div>
          </div>
        </div>

        <CardTable :loading="loading">
          <el-table :data="keys" stripe>
            <el-table-column prop="name" :label="t('apiKey.name')" min-width="140" />
            <el-table-column :label="t('apiKey.key')" min-width="220">
              <template #default="{ row }">
                <span :class="styles.mono">{{ row.key }}</span>
              </template>
            </el-table-column>
            <el-table-column :label="t('apiKey.status')" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? t('common.enable') : t('common.disable') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column :label="t('apiKey.createdAt')" width="170">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column :label="t('apiKey.lastUsed')" width="170">
              <template #default="{ row }">
                {{ formatDate(row.lastUsedAt) }}
              </template>
            </el-table-column>
            <el-table-column :label="t('apiKey.actions')" width="140" fixed="right">
              <template #default="{ row }">
                <TableRowActions :actions="rowActions(row)" />
              </template>
            </el-table-column>
          </el-table>

          <div v-if="keys.length === 0 && !loading" :class="styles.empty">
            <AppIcon name="key" :size="40" :class="styles.emptyIcon" />
            <p>{{ t('apiKey.empty') }}</p>
            <el-button type="primary" plain size="small" @click="openCreateDialog">
              {{ t('apiKey.createFirst') }}
            </el-button>
          </div>
        </CardTable>

        <div v-if="total > pageSize" :class="styles.pagination">
          <el-pagination
            :current-page="page"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- 创建密钥对话框 -->
    <AppDialog
      v-model="showCreateDialog"
      :title="t('apiKey.createDialogTitle')"
      width="420px"
      :loading="creating"
    >
      <el-form label-position="top">
        <el-form-item :label="t('apiKey.nameLabel')" required>
          <el-input
            v-model="newName"
            :placeholder="t('apiKey.namePlaceholder')"
            maxlength="100"
            show-word-limit
            @keyup.enter="handleCreate"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">{{ t('common.create') }}</el-button>
      </template>
    </AppDialog>

    <!-- 创建成功后展示完整 Key -->
    <AppDialog
      v-model="showKeyDialog"
      :title="t('apiKey.createdTitle')"
      width="680px"
      :show-fullscreen-btn="false"
    >
      <div :class="styles.keyNotice">
        <AppIcon name="warning" :size="18" :class="styles.keyNoticeIcon" />
        <span>{{ t('apiKey.createdNotice') }}</span>
      </div>
      <div :class="styles.keyDisplay">
        <code :class="styles.keyCode">{{ createdFullKey }}</code>
        <el-button size="small" @click="copyKey">
          <AppIcon name="copy-document" :size="14" style="margin-right: 4px" />
          {{ t('common.copy') }}
        </el-button>
      </div>
      <template #footer>
        <el-button type="primary" @click="showKeyDialog = false">{{ t('apiKey.savedClose') }}</el-button>
      </template>
    </AppDialog>
  </div>
</template>
