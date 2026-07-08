<script setup lang="ts">
/**
 * 我的集成密钥 — 管理 /api/keys CRUD
 *
 * 功能：创建、脱敏列表、禁用/启用、删除。
 * 创建后弹窗一次性展示完整 sk-... Key。
 */

import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import {
  createApiKey,
  getApiKeys,
  updateApiKeyStatus,
  deleteApiKey,
  type ApiKeyItem,
  type ApiKeyStatus,
} from '@/api/apiKeyApi'
import styles from './ApiKeyManagerView.module.scss'

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
    ElMessage.error((e as Error).message || '加载失败')
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
    ElMessage.warning('请输入名称')
    return
  }
  creating.value = true
  try {
    const item = await createApiKey({ name })
    createdFullKey.value = item.key
    showCreateDialog.value = false
    showKeyDialog.value = true
    ElMessage.success('密钥创建成功')
    void loadKeys()
  } catch (e) {
    ElMessage.error((e as Error).message || '创建失败')
  } finally {
    creating.value = false
  }
}

function copyKey(): void {
  navigator.clipboard.writeText(createdFullKey.value).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.warning('复制失败，请手动复制')
  })
}

async function handleToggleStatus(item: ApiKeyItem): Promise<void> {
  const newStatus: ApiKeyStatus = item.status === 'active' ? 'disabled' : 'active'
  const label = newStatus === 'active' ? '启用' : '禁用'
  try {
    await updateApiKeyStatus(item.id, newStatus)
    ElMessage.success(`已${label}`)
    void loadKeys()
  } catch (e) {
    ElMessage.error((e as Error).message || `${label}失败`)
  }
}

async function handleDelete(item: ApiKeyItem): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除密钥「${item.name}」？删除后使用该密钥的调用将立即失效。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
    await deleteApiKey(item.id)
    ElMessage.success('已删除')
    void loadKeys()
  } catch (e) {
    if (e === 'cancel') return
    ElMessage.error((e as Error).message || '删除失败')
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-CN', {
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
            <h1>我的集成密钥</h1>
            <p :class="styles.subtitle">
              创建和管理 API 密钥，用于第三方系统集成调用。密钥仅在创建时展示一次，请妥善保存。
            </p>
          </div>
          <div :class="styles.headerActions">
            <el-button :loading="loading" @click="loadKeys">
              <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
              刷新
            </el-button>
            <el-button type="primary" @click="openCreateDialog">
              <AppIcon name="plus" :size="14" style="margin-right: 4px" />
              创建密钥
            </el-button>
          </div>
        </div>
      </header>

      <div :class="styles.content">
        <div :class="styles.summary">
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">总计</div>
            <div :class="styles.summaryValue">{{ total }}</div>
          </div>
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">启用中</div>
            <div :class="styles.summaryValue">{{ keys.filter((k) => k.status === 'active').length }}</div>
          </div>
        </div>

        <div :class="styles.tableWrap" v-loading="loading">
          <el-table :data="keys" stripe>
            <el-table-column prop="name" label="名称" min-width="140" />
            <el-table-column label="密钥" min-width="220">
              <template #default="{ row }">
                <span :class="styles.mono">{{ row.key }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="170">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="最后使用" width="170">
              <template #default="{ row }">
                {{ formatDate(row.lastUsedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <el-button
                  link
                  :type="row.status === 'active' ? 'warning' : 'success'"
                  size="small"
                  @click="handleToggleStatus(row)"
                >
                  <AppIcon
                    :name="row.status === 'active' ? 'close' : 'check'"
                    :size="14"
                    style="margin-right: 2px"
                  />
                  {{ row.status === 'active' ? '禁用' : '启用' }}
                </el-button>
                <el-button
                  link
                  type="danger"
                  size="small"
                  @click="handleDelete(row)"
                >
                  <AppIcon name="delete" :size="14" style="margin-right: 2px" />
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="keys.length === 0 && !loading" :class="styles.empty">
            <AppIcon name="key" :size="40" :class="styles.emptyIcon" />
            <p>暂无集成密钥</p>
            <el-button type="primary" plain size="small" @click="openCreateDialog">
              创建第一个密钥
            </el-button>
          </div>
        </div>

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
    <el-dialog
      v-model="showCreateDialog"
      title="创建集成密钥"
      width="420px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form label-position="top">
        <el-form-item label="密钥名称" required>
          <el-input
            v-model="newName"
            placeholder="例如：生产环境 / 测试用"
            maxlength="100"
            show-word-limit
            @keyup.enter="handleCreate"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 创建成功后展示完整 Key -->
    <el-dialog
      v-model="showKeyDialog"
      title="密钥已创建"
      width="520px"
      :close-on-click-modal="false"
    >
      <div :class="styles.keyNotice">
        <AppIcon name="warning" :size="18" :class="styles.keyNoticeIcon" />
        <span>此密钥仅展示一次，请立即复制并妥善保存。关闭后无法再次查看完整密钥。</span>
      </div>
      <div :class="styles.keyDisplay">
        <code :class="styles.keyCode">{{ createdFullKey }}</code>
        <el-button size="small" @click="copyKey">
          <AppIcon name="copy-document" :size="14" style="margin-right: 4px" />
          复制
        </el-button>
      </div>
      <template #footer>
        <el-button type="primary" @click="showKeyDialog = false">我已保存，关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>
