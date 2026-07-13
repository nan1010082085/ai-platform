<script setup lang="ts">
/**
 * 模型与连接 — 管理 /api/model-configs CRUD + 测试连接 + 选默认模型
 *
 * Enhanced: quick-add presets, connection status, model comparison, import/export
 */

import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import {
  getModelConfigs,
  createModelConfig,
  updateModelConfig,
  deleteModelConfig,
  testModelConnection,
  exportModelConfigs,
  importModelConfigs,
  bulkTestConnections,
  type ModelConfigItem,
  type ModelProvider,
  type CreateModelConfigPayload,
  type TestConnectionResult,
  type ExportModelConfigPayload,
} from '@/api/modelConfigApi'
import { useModelPresets, type ProviderPreset } from '@/composables/useModelPresets'
import { useModelOptions } from '@/composables/useModelOptions'
import styles from './ModelSettingsView.module.scss'

const {
  getAllPresets,
  getPreset,
  applyPreset,
  createConfigFromPreset,
  getQuickAddOptions,
} = useModelPresets()

const { defaultModel, modelOptions } = useModelOptions()

const configs = ref<ModelConfigItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)

// Quick-add presets
const presets = getAllPresets()
const quickAddPresets = computed(() => getQuickAddOptions(configs.value))
const quickAddLoading = ref<ModelProvider | null>(null)

// Connection status tracking
const connectionStatus = ref<Map<string, 'ok' | 'fail' | 'testing'>>(new Map())
const testingAllIds = ref(false)

// Provider 过滤
const providerFilter = ref<ModelProvider | ''>('')
const providerOptions: Array<{ value: ModelProvider | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'mimo', label: 'Mimo' },
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

// 模型对比
const showCompareDialog = ref(false)
const compareSelected = ref<string[]>([])

// 导入
const fileInputRef = ref<HTMLInputElement | null>(null)

const modelPlaceholder = computed(() => {
  const map: Record<string, string> = {
    deepseek: 'deepseek-chat',
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-20250514',
    ollama: 'llama3',
    mimo: 'mimo-v2.5',
  }
  return map[form.value.provider] ?? '模型名称'
})

const baseUrlPlaceholder = computed(() => {
  const map: Record<string, string> = {
    mimo: 'https://token-plan-cn.xiaomimimo.com/v1',
    ollama: 'http://localhost:11434/v1',
  }
  return map[form.value.provider] ?? '留空使用 Provider 默认地址'
})

const summaryTotal = computed(() => total.value)
const summaryDefault = computed(() => configs.value.filter((c) => c.isDefault).length)
const summaryProviders = computed(() => new Set(configs.value.map((c) => c.provider)).size)

const compareItems = computed(() =>
  configs.value.filter((c) => compareSelected.value.includes(c.id)),
)

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

/** 从预设快速创建（无需打开对话框） */
async function handleQuickAdd(preset: ProviderPreset): Promise<void> {
  quickAddLoading.value = preset.provider
  try {
    const payload = createConfigFromPreset(preset)
    await createModelConfig(payload)
    ElMessage.success(`已添加 ${preset.label} 预设配置`)
    void loadConfigs()
  } catch (e) {
    ElMessage.error((e as Error).message || '添加失败')
  } finally {
    quickAddLoading.value = null
  }
}

function applyProviderPreset(provider: ModelProvider): void {
  const preset = applyPreset(provider)
  if (preset) {
    form.value.model = preset.model
    form.value.baseUrl = preset.baseUrl
    const presetInfo = getPreset(provider)
    if (presetInfo && !form.value.name) {
      form.value.name = `${presetInfo.label} - ${preset.model}`
    }
  }
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
    connectionStatus.value.delete(item.id)
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
  connectionStatus.value.set(item.id, 'testing')
  try {
    const result = await testModelConnection(item.id)
    testResult.value = result
    connectionStatus.value.set(item.id, 'ok')
  } catch (e) {
    testError.value = (e as Error).message || '测试失败'
    connectionStatus.value.set(item.id, 'fail')
  } finally {
    testingId.value = ''
  }
}

/** 批量测试所有连接 */
async function handleTestAll(): Promise<void> {
  if (configs.value.length === 0) return
  testingAllIds.value = true
  const ids = configs.value.map((c) => c.id)
  ids.forEach((id) => connectionStatus.value.set(id, 'testing'))
  try {
    const results = await bulkTestConnections(ids)
    let okCount = 0
    let failCount = 0
    results.forEach((r, id) => {
      if (r.success) {
        connectionStatus.value.set(id, 'ok')
        okCount++
      } else {
        connectionStatus.value.set(id, 'fail')
        failCount++
      }
    })
    ElMessage.success(`测试完成：${okCount} 成功，${failCount} 失败`)
  } catch (e) {
    ElMessage.error((e as Error).message || '批量测试失败')
  } finally {
    testingAllIds.value = false
  }
}

/** 导出配置为 JSON 文件下载 */
async function handleExport(): Promise<void> {
  try {
    const payload = await exportModelConfigs()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `model-configs-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error((e as Error).message || '导出失败')
  }
}

/** 触发文件选择 */
function triggerImport(): void {
  fileInputRef.value?.click()
}

/** 处理文件导入 */
async function handleImportFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text) as ExportModelConfigPayload
    const result = await importModelConfigs(data)
    const parts: string[] = []
    if (result.imported > 0) parts.push(`${result.imported} 条已导入`)
    if (result.skipped > 0) parts.push(`${result.skipped} 条已跳过（重复）`)
    if (result.errors.length > 0) parts.push(`${result.errors.length} 条失败`)
    ElMessage.success(parts.join('，') || '导入完成')
    if (result.errors.length > 0) {
      console.warn('Import errors:', result.errors)
    }
    void loadConfigs()
  } catch (e) {
    ElMessage.error((e as Error).message || '导入失败，请检查文件格式')
  } finally {
    input.value = ''
  }
}

/** 打开对比对话框 */
function openCompareDialog(): void {
  if (compareSelected.value.length < 2) {
    ElMessage.warning('请至少选择 2 个模型进行对比')
    return
  }
  showCompareDialog.value = true
}

function toggleCompareSelection(id: string): void {
  const idx = compareSelected.value.indexOf(id)
  if (idx >= 0) {
    compareSelected.value.splice(idx, 1)
  } else {
    compareSelected.value.push(id)
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
    mimo: 'Mimo',
  }
  return map[provider] ?? provider
}

function getProviderTagType(provider: string): string {
  const map: Record<string, string> = {
    deepseek: '',
    openai: 'success',
    anthropic: 'warning',
    ollama: 'info',
    mimo: 'danger',
  }
  return map[provider] ?? ''
}

function getStatusClass(id: string): string {
  const status = connectionStatus.value.get(id)
  if (status === 'ok') return styles.statusDotOk
  if (status === 'fail') return styles.statusDotFail
  if (status === 'testing') return styles.statusDotTesting
  return ''
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
            <div v-if="defaultModel" :class="styles.activeModelHint">
              <AppIcon name="circle-check-filled" :size="14" />
              <span>当前默认模型：<strong>{{ defaultModel }}</strong></span>
              <span v-if="modelOptions.length > 0" :class="styles.hintExtra">
                （共 {{ modelOptions.length }} 个可用模型）
              </span>
            </div>
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
            <el-button @click="handleExport">
              <AppIcon name="download" :size="14" style="margin-right: 4px" />
              导出
            </el-button>
            <el-button @click="triggerImport">
              <AppIcon name="upload" :size="14" style="margin-right: 4px" />
              导入
            </el-button>
            <input
              ref="fileInputRef"
              type="file"
              accept=".json"
              style="display: none"
              @change="handleImportFile"
            />
            <el-button type="primary" @click="openCreateDialog">
              <AppIcon name="plus" :size="14" style="margin-right: 4px" />
              新增配置
            </el-button>
          </div>
        </div>
      </header>

      <div :class="styles.content">
        <!-- Quick-add presets for unconfigured providers -->
        <div v-if="quickAddPresets.length > 0" :class="styles.quickAddSection">
          <div :class="styles.quickAddLabel">快速添加 Provider 预设：</div>
          <div :class="styles.quickAddRow">
            <button
              v-for="preset in quickAddPresets"
              :key="preset.provider"
              :class="styles.presetCard"
              :disabled="quickAddLoading === preset.provider"
              @click="handleQuickAdd(preset)"
            >
              <div :class="styles.presetCardIcon" :style="{ color: preset.color }">
                <AppIcon :name="preset.icon" :size="20" />
              </div>
              <div :class="styles.presetCardInfo">
                <div :class="styles.presetCardName">{{ preset.label }}</div>
                <div :class="styles.presetCardDesc">{{ preset.defaultModel }}</div>
              </div>
              <AppIcon
                v-if="quickAddLoading === preset.provider"
                name="loading"
                :size="16"
              />
              <AppIcon v-else name="plus" :size="16" :class="styles.presetCardAdd" />
            </button>
          </div>
        </div>

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
          <div :class="styles.tableToolbar">
            <el-button
              size="small"
              :loading="testingAllIds"
              @click="handleTestAll"
            >
              <AppIcon name="connection" :size="14" style="margin-right: 4px" />
              测试全部连接
            </el-button>
            <el-button
              v-if="compareSelected.length >= 2"
              size="small"
              type="primary"
              plain
              @click="openCompareDialog"
            >
              对比选中 ({{ compareSelected.length }})
            </el-button>
          </div>
          <el-table :data="configs" stripe @selection-change="(rows: ModelConfigItem[]) => { compareSelected = rows.map(r => r.id) }">
            <el-table-column type="selection" width="40" />
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
            <el-table-column label="状态" width="70" align="center">
              <template #default="{ row }">
                <span
                  :class="[styles.statusDot, getStatusClass(row.id)]"
                  :title="
                    connectionStatus.get(row.id) === 'ok' ? '连接正常' :
                    connectionStatus.get(row.id) === 'fail' ? '连接失败' :
                    connectionStatus.get(row.id) === 'testing' ? '测试中...' : '未测试'
                  "
                />
              </template>
            </el-table-column>
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
    <AppDialog
      v-model="showFormDialog"
      :title="isEditing ? '编辑模型配置' : '新增模型配置'"
      width="560px"
      :loading="formSubmitting"
      @confirm="handleSubmit"
    >
      <!-- 快速添加预设 -->
      <div v-if="!isEditing" :class="styles.presetSection">
        <div :class="styles.presetLabel">快速添加：</div>
        <div :class="styles.presetGrid">
          <button
            v-for="preset in presets"
            :key="preset.provider"
            :class="styles.presetCard"
            @click="form.provider = preset.provider; applyProviderPreset(preset.provider)"
          >
            <div :class="styles.presetIcon" :style="{ color: preset.color }">
              <AppIcon :name="preset.icon" :size="20" />
            </div>
            <div :class="styles.presetInfo">
              <div :class="styles.presetName">{{ preset.label }}</div>
              <div :class="styles.presetDesc">{{ preset.defaultModel }}</div>
            </div>
          </button>
        </div>
      </div>

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
            <el-select v-model="form.provider" style="width: 100%" @change="applyProviderPreset">
              <el-option
                v-for="preset in presets"
                :key="preset.provider"
                :label="preset.label"
                :value="preset.provider"
              >
                <div style="display: flex; align-items: center; gap: 8px">
                  <span :style="{ color: preset.color, fontWeight: 600 }">{{ preset.label }}</span>
                  <span style="font-size: 11px; color: #909399">{{ preset.description }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="模型名称" required>
            <el-input v-model="form.model" :placeholder="modelPlaceholder" maxlength="100" />
          </el-form-item>
        </div>
        <!-- Provider hint -->
        <div v-if="getPreset(form.provider)" :class="styles.providerHint">
          <AppIcon :name="getPreset(form.provider)!.icon" :size="14" />
          <span>{{ getPreset(form.provider)!.description }}</span>
          <span v-if="getPreset(form.provider)!.defaultBaseUrl" :class="styles.hintUrl">
            默认地址：{{ getPreset(form.provider)!.defaultBaseUrl }}
          </span>
        </div>
        <el-form-item label="API Key">
          <el-input
            v-model="form.apiKey"
            :placeholder="isEditing ? '留空则不更新' : getPreset(form.provider)?.placeholderApiKey || 'sk-...'"
            maxlength="500"
            show-password
          />
        </el-form-item>
        <el-form-item label="Base URL">
          <el-input
            v-model="form.baseUrl"
            :placeholder="baseUrlPlaceholder"
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
    </AppDialog>

    <!-- 测试连接结果对话框 -->
    <AppDialog
      v-model="showTestDialog"
      title="连接测试"
      width="480px"
      :show-fullscreen-btn="false"
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
    </AppDialog>

    <!-- 模型对比对话框 -->
    <AppDialog
      v-model="showCompareDialog"
      title="模型对比"
      width="80%"
    >
      <div :class="styles.compareGrid">
        <div
          v-for="item in compareItems"
          :key="item.id"
          :class="styles.compareColumn"
        >
          <div :class="styles.compareHeader">
            <el-tag :type="getProviderTagType(item.provider)" size="small">
              {{ getProviderLabel(item.provider) }}
            </el-tag>
            <span :class="styles.compareName">{{ item.name }}</span>
          </div>
          <table :class="styles.compareTable">
            <tr>
              <td :class="styles.compareKey">模型</td>
              <td>{{ item.model }}</td>
            </tr>
            <tr>
              <td :class="styles.compareKey">Base URL</td>
              <td>{{ item.baseUrl || '默认' }}</td>
            </tr>
            <tr>
              <td :class="styles.compareKey">Temperature</td>
              <td>{{ item.parameters?.temperature ?? '—' }}</td>
            </tr>
            <tr>
              <td :class="styles.compareKey">Max Tokens</td>
              <td>{{ item.parameters?.maxTokens ?? '—' }}</td>
            </tr>
            <tr>
              <td :class="styles.compareKey">Top P</td>
              <td>{{ item.parameters?.topP ?? '—' }}</td>
            </tr>
            <tr>
              <td :class="styles.compareKey">默认</td>
              <td>{{ item.isDefault ? '是' : '否' }}</td>
            </tr>
            <tr>
              <td :class="styles.compareKey">状态</td>
              <td>
                <span
                  :class="[styles.statusDot, getStatusClass(item.id)]"
                />
                {{
                  connectionStatus.get(item.id) === 'ok' ? '正常' :
                  connectionStatus.get(item.id) === 'fail' ? '失败' :
                  connectionStatus.get(item.id) === 'testing' ? '测试中...' : '未测试'
                }}
              </td>
            </tr>
            <tr>
              <td :class="styles.compareKey">更新时间</td>
              <td>{{ formatDate(item.updatedAt) }}</td>
            </tr>
          </table>
        </div>
      </div>
      <template #footer>
        <el-button @click="showCompareDialog = false">关闭</el-button>
      </template>
    </AppDialog>
  </div>
</template>
