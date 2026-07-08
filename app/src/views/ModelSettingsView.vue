<script setup lang="ts">
/**
 * 模型与连接 — 管理 /api/model-configs CRUD + 测试连接 + 选默认模型
 */

import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import {
  getModelConfigs,
  createModelConfig,
  updateModelConfig,
  deleteModelConfig,
  testModelConnection,
  type ModelConfigItem,
  type ModelProvider,
  type CreateModelConfigPayload,
  type TestConnectionResult,
} from '@/api/modelConfigApi'
import styles from './ModelSettingsView.module.scss'

const configs = ref<ModelConfigItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)

// Provider 过滤
const providerFilter = ref<ModelProvider | ''>('')
const providerOptions: Array<{ value: ModelProvider | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'ollama', label: 'Ollama' },
]

// 创建/编辑表单
const showFormDialog = ref(false)
const isEditing = ref(false)
const editingId = ref('')
const formSubmitting = ref(false)
const form = ref<CreateModelConfigPayload>({
  name: '',
  provider: 'deepseek',
  model: '',
  apiKey: '',
  baseUrl: '',
  parameters: { temperature: 0.7, maxTokens: 4096 },
  isDefault: false,
})

// 测试连接
const testingId = ref('')
const testResult = ref<TestConnectionResult | null>(null)
const testError = ref('')
const showTestDialog = ref(false)

const summaryTotal = computed(() => total.value)
const summaryDefault = computed(() => configs.value.filter((c) => c.isDefault).length)
const summaryProviders = computed(() => new Set(configs.value.map((c) => c.provider)).size)

async function loadConfigs(): Promise<void> {
  loading.value = true
  try {
    const res = await getModelConfigs({
      page: page.value,
      pageSize: pageSize.value,
      provider: providerFilter.value || undefined,
    })
    configs.value = res.items
    total.value = res.total
  } catch (e) {
    ElMessage.error((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(newPage: number): void {
  page.value = newPage
  void loadConfigs()
}

function handleProviderFilterChange(): void {
  page.value = 1
  void loadConfigs()
}

function openCreateDialog(): void {
  isEditing.value = false
  editingId.value = ''
  form.value = {
    name: '',
    provider: 'deepseek',
    model: '',
    apiKey: '',
    baseUrl: '',
    parameters: { temperature: 0.7, maxTokens: 4096 },
    isDefault: false,
  }
  showFormDialog.value = true
}

function openEditDialog(item: ModelConfigItem): void {
  isEditing.value = true
  editingId.value = item.id
  form.value = {
    name: item.name,
    provider: item.provider,
    model: item.model,
    apiKey: '',
    baseUrl: item.baseUrl,
    parameters: { ...item.parameters },
    isDefault: item.isDefault,
  }
  showFormDialog.value = true
}

async function handleSubmit(): Promise<void> {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入配置名称')
    return
  }
  if (!form.value.model.trim()) {
    ElMessage.warning('请输入模型名称')
    return
  }

  formSubmitting.value = true
  try {
    if (isEditing.value) {
      const payload: Record<string, unknown> = {
        name: form.value.name,
        provider: form.value.provider,
        model: form.value.model,
        baseUrl: form.value.baseUrl,
        parameters: form.value.parameters,
        isDefault: form.value.isDefault,
      }
      if (form.value.apiKey) {
        payload.apiKey = form.value.apiKey
      }
      await updateModelConfig(editingId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createModelConfig(form.value)
      ElMessage.success('创建成功')
    }
    showFormDialog.value = false
    void loadConfigs()
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败')
  } finally {
    formSubmitting.value = false
  }
}

async function handleDelete(item: ModelConfigItem): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除模型配置「${item.name}」？删除后相关功能将无法使用此模型。`,
      '删除确认',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
    await deleteModelConfig(item.id)
    ElMessage.success('已删除')
    void loadConfigs()
  } catch (e) {
    if (e === 'cancel') return
    ElMessage.error((e as Error).message || '删除失败')
  }
}

async function handleSetDefault(item: ModelConfigItem): Promise<void> {
  const existingDefault = configs.value.find((c) => c.isDefault && c.id !== item.id)
  const warnMsg = existingDefault ? `将替换当前默认模型「${existingDefault.name}」，` : ''
  try {
    await ElMessageBox.confirm(
      `${warnMsg}确定将「${item.name}」设为默认模型？`,
      '设置默认模型',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'info' },
    )
    await updateModelConfig(item.id, { isDefault: true })
    ElMessage.success(`已设为默认模型`)
    void loadConfigs()
  } catch (e) {
    if (e === 'cancel') return
    ElMessage.error((e as Error).message || '设置失败')
  }
}

async function handleTestConnection(item: ModelConfigItem): Promise<void> {
  testingId.value = item.id
  testResult.value = null
  testError.value = ''
  showTestDialog.value = true
  try {
    const result = await testModelConnection(item.id)
    testResult.value = result
  } catch (e) {
    testError.value = (e as Error).message || '测试失败'
  } finally {
    testingId.value = ''
  }
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getProviderLabel(provider: string): string {
  const map: Record<string, string> = {
    deepseek: 'DeepSeek',
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    ollama: 'Ollama',
  }
  return map[provider] ?? provider
}

function getProviderTagType(provider: string): string {
  const map: Record<string, string> = {
    deepseek: '',
    openai: 'success',
    anthropic: 'warning',
    ollama: 'info',
  }
  return map[provider] ?? ''
}

onMounted(() => {
  void loadConfigs()
})
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.scroll">
      <header :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1>模型与连接</h1>
            <p :class="styles.subtitle">
              管理 LLM Provider 连接配置，测试连通性，设置默认模型。Chat 和 Agent 编排将使用此处配置的模型。
            </p>
          </div>
          <div :class="styles.headerActions">
            <el-select
              :model-value="providerFilter"
              placeholder="按 Provider 筛选"
              clearable
              style="width: 140px"
              @update:model-value="providerFilter = $event; handleProviderFilterChange()"
            >
              <el-option
                v-for="opt in providerOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-button :loading="loading" @click="loadConfigs">
              <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
              刷新
            </el-button>
            <el-button type="primary" @click="openCreateDialog">
              <AppIcon name="plus" :size="14" style="margin-right: 4px" />
              新增配置
            </el-button>
          </div>
        </div>
      </header>

      <div :class="styles.content">
        <div :class="styles.summary">
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">总计</div>
            <div :class="styles.summaryValue">{{ summaryTotal }}</div>
          </div>
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">默认模型</div>
            <div :class="styles.summaryValue">{{ summaryDefault }}</div>
          </div>
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">Provider 数</div>
            <div :class="styles.summaryValue">{{ summaryProviders }}</div>
          </div>
        </div>

        <div :class="styles.tableWrap" v-loading="loading">
          <el-table :data="configs" stripe>
            <el-table-column prop="name" label="名称" min-width="140">
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
            <el-table-column label="Provider" width="120">
              <template #default="{ row }">
                <el-tag :type="getProviderTagType(row.provider)" :class="styles.providerTag" size="small">
                  {{ getProviderLabel(row.provider) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="model" label="模型" min-width="160" />
            <el-table-column label="Base URL" min-width="180">
              <template #default="{ row }">
                <span style="font-size: 12px; color: var(--text-color-secondary)">
                  {{ row.baseUrl || '默认' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="参数" width="160">
              <template #default="{ row }">
                <span style="font-size: 12px; color: var(--text-color-secondary)">
                  T={{ row.parameters?.temperature ?? '—' }}, Max={{ row.parameters?.maxTokens ?? '—' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="更新时间" width="170">
              <template #default="{ row }">
                {{ formatDate(row.updatedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="260" fixed="right">
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  size="small"
                  :loading="testingId === row.id"
                  @click="handleTestConnection(row)"
                >
                  <AppIcon name="connection" :size="14" style="margin-right: 2px" />
                  测试
                </el-button>
                <el-button
                  v-if="!row.isDefault"
                  link
                  type="success"
                  size="small"
                  @click="handleSetDefault(row)"
                >
                  <AppIcon name="check" :size="14" style="margin-right: 2px" />
                  设为默认
                </el-button>
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="openEditDialog(row)"
                >
                  <AppIcon name="edit" :size="14" style="margin-right: 2px" />
                  编辑
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

          <div v-if="configs.length === 0 && !loading" :class="styles.empty">
            <AppIcon name="setting" :size="40" :class="styles.emptyIcon" />
            <p>暂无模型配置</p>
            <el-button type="primary" plain size="small" @click="openCreateDialog">
              新增第一个配置
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

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="showFormDialog"
      :title="isEditing ? '编辑模型配置' : '新增模型配置'"
      width="560px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form label-position="top">
        <el-form-item label="配置名称" required>
          <el-input
            v-model="form.name"
            placeholder="例如：DeepSeek 主力模型 / GPT-4o 备用"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <div :class="styles.formRow">
          <el-form-item label="Provider" required>
            <el-select v-model="form.provider" style="width: 100%">
              <el-option label="DeepSeek" value="deepseek" />
              <el-option label="OpenAI" value="openai" />
              <el-option label="Anthropic" value="anthropic" />
              <el-option label="Ollama" value="ollama" />
            </el-select>
          </el-form-item>
          <el-form-item label="模型名称" required>
            <el-input v-model="form.model" placeholder="deepseek-chat / gpt-4o" maxlength="100" />
          </el-form-item>
        </div>
        <el-form-item label="API Key">
          <el-input
            v-model="form.apiKey"
            :placeholder="isEditing ? '留空则不更新' : 'sk-...'"
            maxlength="500"
            show-password
          />
        </el-form-item>
        <el-form-item label="Base URL">
          <el-input
            v-model="form.baseUrl"
            placeholder="留空使用 Provider 默认地址"
            maxlength="500"
          />
        </el-form-item>
        <div :class="styles.formRow">
          <el-form-item label="Temperature">
            <el-input-number
              v-model="form.parameters!.temperature"
              :min="0"
              :max="2"
              :step="0.1"
              :precision="1"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="Max Tokens">
            <el-input-number
              v-model="form.parameters!.maxTokens"
              :min="1"
              :max="128000"
              :step="256"
              style="width: 100%"
            />
          </el-form-item>
        </div>
        <el-form-item label="设为默认">
          <el-switch v-model="form.isDefault" />
          <span style="margin-left: 8px; font-size: 12px; color: var(--text-color-secondary)">
            同一 Provider 下只保留一个默认模型
          </span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showFormDialog = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="handleSubmit">
          {{ isEditing ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 测试连接结果对话框 -->
    <el-dialog
      v-model="showTestDialog"
      title="连接测试"
      width="480px"
      :close-on-click-modal="false"
    >
      <div v-if="testingId" style="text-align: center; padding: 20px">
        <AppIcon name="loading" :size="24" />
        <p style="margin-top: 8px; color: var(--text-color-secondary)">正在测试连接...</p>
      </div>
      <template v-else>
        <div v-if="testResult" :class="[styles.testResult, styles.testSuccess]">
          <div style="font-weight: 600; margin-bottom: 4px">连接成功</div>
          <div>Provider: {{ testResult.provider }} | 模型: {{ testResult.model }} | Tokens: {{ testResult.tokens }}</div>
          <div v-if="testResult.reply" :class="styles.testReply">{{ testResult.reply }}</div>
        </div>
        <div v-if="testError" :class="[styles.testResult, styles.testError]">
          <div style="font-weight: 600; margin-bottom: 4px">连接失败</div>
          <div>{{ testError }}</div>
        </div>
      </template>
      <template #footer>
        <el-button type="primary" @click="showTestDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>
