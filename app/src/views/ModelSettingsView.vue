<script setup lang="ts">
/**
 * 模型中心 — 供应商 + 模型两级管理
 *
 * 左侧面板：供应商列表（CRUD + 测试连接）
 * 右侧面板：选中供应商的模型列表（CRUD + 设为默认 + 启用/禁用）
 */

import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import QuickAddPresets from '@/components/model-settings/QuickAddPresets.vue'
import ProviderList from '@/components/model-settings/ProviderList.vue'
import ProviderDialog from '@/components/model-settings/ProviderDialog.vue'
import ModelList from '@/components/model-settings/ModelList.vue'
import ModelDialog from '@/components/model-settings/ModelDialog.vue'
import type { ProviderPreset } from '@/components/model-settings/types'
import type { ModelFormState } from '@/components/model-settings/ModelDialog.vue'
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  testProvider,
  getEmbeddingConfig,
  updateEmbeddingConfig,
  type Provider,
  type CreateProviderPayload,
  type UpdateProviderPayload,
  type TestConnectionResult as ProviderTestResult,
  type EmbeddingConfig,
  type EmbeddingProvider,
  type UpdateEmbeddingConfigPayload,
} from '@/api/providerApi'
import {
  listModels,
  createModel,
  updateModel,
  deleteModel,
  testModel,
  type Model,
  type CreateModelPayload,
  type UpdateModelPayload,
  type TestConnectionResult as ModelTestResult,
} from '@/api/modelApi'
import styles from './ModelSettingsView.module.scss'

// ---- Provider presets for quick-add ----

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    type: 'deepseek',
    label: 'DeepSeek',
    icon: 'chat-dot-round',
    color: '#4D6BFE',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    website: 'https://platform.deepseek.com',
    description: 'DeepSeek V4，中文能力强，高性价比',
    placeholderApiKey: 'sk-...',
    defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
{
    type: 'mimo',
    label: 'Mimo',
    icon: 'magic-stick',
    color: '#FF6B35',
    defaultBaseUrl: 'https://api.xiaomimimo.com/v1',
    website: 'https://mimo.xiaomi.com',
    description: '小米 Mimo，OpenAI 兼容接口',
    placeholderApiKey: 'tp-...',
    defaultModels: ['mimo-v2.5'],
  },
  {
    type: 'openai',
    label: 'OpenAI',
    icon: 'chat-round',
    color: '#10A37F',
    defaultBaseUrl: 'https://api.openai.com/v1',
    website: 'https://platform.openai.com',
    description: 'GPT-4o / GPT-4 系列',
    placeholderApiKey: 'sk-...',
    defaultModels: ['gpt-4o', 'gpt-4o-mini'],
  },
]

// ---- State: Providers ----

const providers = ref<Provider[]>([])
const providersLoading = ref(false)
const selectedProviderId = ref('')

const selectedProvider = computed(() =>
  providers.value.find((p) => p.id === selectedProviderId.value) ?? null,
)

// Provider connection status
const providerConnStatus = ref<Map<string, 'ok' | 'fail' | 'testing'>>(new Map())

// ---- State: Models ----

const models = ref<Model[]>([])
const modelsLoading = ref(false)

// ---- State: Default model (global) ----

const globalDefaultModel = ref<Model | null>(null)

// ---- State: Provider form dialog ----

const showProviderDialog = ref(false)
const isEditingProvider = ref(false)
const editingProviderId = ref('')
const providerFormSubmitting = ref(false)
const providerInitialForm = ref<CreateProviderPayload>({
  name: '',
  type: 'deepseek',
  baseUrl: '',
  apiKey: '',
  isActive: true,
})

// ---- State: Model form dialog ----

const showModelDialog = ref(false)
const isEditingModel = ref(false)
const editingModelId = ref('')
const modelFormSubmitting = ref(false)
const modelInitialForm = ref<ModelFormState>({
  name: '',
  model: '',
  parameters: { temperature: 0.7, maxTokens: 4096 },
  isDefault: false,
  isActive: true,
})

// Ollama dynamic model list
const ollamaModels = ref<string[]>([])
const ollamaModelsLoading = ref(false)

// ---- State: Test result dialog ----

const showTestDialog = ref(false)
const testDialogTitle = ref('')
const testDialogLoading = ref(false)
const testResult = ref<ProviderTestResult | ModelTestResult | null>(null)
const testError = ref('')

// ---- State: Embedding config ----

const embeddingConfig = ref<EmbeddingConfig | null>(null)
const embeddingLoading = ref(false)
const showEmbeddingDialog = ref(false)
const embeddingFormSubmitting = ref(false)
const embeddingForm = ref<{
  provider: EmbeddingProvider
  model: string
  baseUrl: string
  apiKey: string
  dimensions: number
}>({
  provider: 'siliconflow',
  model: '',
  baseUrl: '',
  apiKey: '',
  dimensions: 1536,
})

// ---- Load providers ----

async function loadProviders(): Promise<void> {
  providersLoading.value = true
  try {
    providers.value = await listProviders()
    // Auto-select first provider if none selected
    if (!selectedProviderId.value && providers.value.length > 0) {
      selectedProviderId.value = providers.value[0]!.id
    }
    // Auto-select global default model
    const allModels = await listModels()
    globalDefaultModel.value = allModels.find((m) => m.isDefault) ?? null
  } catch (e) {
    ElMessage.error((e as Error).message || '加载供应商列表失败')
  } finally {
    providersLoading.value = false
  }
}

// ---- Load models for selected provider ----

async function loadModels(): Promise<void> {
  if (!selectedProviderId.value) {
    models.value = []
    return
  }
  modelsLoading.value = true
  try {
    models.value = await listModels(selectedProviderId.value)
  } catch (e) {
    ElMessage.error((e as Error).message || '加载模型列表失败')
  } finally {
    modelsLoading.value = false
  }
}

/** For Ollama: fetch /api/tags to get available models */
async function fetchOllamaModels(): Promise<void> {
  if (!selectedProvider.value || selectedProvider.value.type !== 'ollama') return
  ollamaModelsLoading.value = true
  try {
    const baseUrl = selectedProvider.value.baseUrl || 'http://localhost:11434'
    const tagsUrl = baseUrl.replace(/\/v1\/?$/, '') + '/api/tags'
    const res = await fetch(tagsUrl)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const data = (await res.json()) as { models?: Array<{ name: string }> }
    ollamaModels.value = (data.models ?? []).map((m) => m.name)
  } catch (e) {
    ollamaModels.value = []
    console.warn('Failed to fetch Ollama models:', e)
  } finally {
    ollamaModelsLoading.value = false
  }
}

// Watch provider selection
watch(selectedProviderId, () => {
  void loadModels()
  if (selectedProvider.value?.type === 'ollama') {
    void fetchOllamaModels()
  } else {
    ollamaModels.value = []
  }
})

// ---- Provider CRUD ----

function openCreateProviderDialog(): void {
  isEditingProvider.value = false
  editingProviderId.value = ''
  providerInitialForm.value = {
    name: '',
    type: 'deepseek',
    baseUrl: '',
    apiKey: '',
    isActive: true,
  }
  showProviderDialog.value = true
}

function openEditProviderDialog(provider: Provider): void {
  isEditingProvider.value = true
  editingProviderId.value = provider.id
  providerInitialForm.value = {
    name: provider.name,
    type: provider.type,
    baseUrl: provider.baseUrl,
    apiKey: '',
    isActive: provider.isActive,
  }
  showProviderDialog.value = true
}

async function handleProviderSubmit(formData: CreateProviderPayload): Promise<void> {
  providerFormSubmitting.value = true
  try {
    if (isEditingProvider.value) {
      const payload: UpdateProviderPayload = {
        name: formData.name,
        type: formData.type,
        baseUrl: formData.baseUrl,
        isActive: formData.isActive,
      }
      if (formData.apiKey) {
        payload.apiKey = formData.apiKey
      }
      await updateProvider(editingProviderId.value, payload)
      ElMessage.success('供应商已更新')
    } else {
      await createProvider(formData)
      ElMessage.success('供应商已创建')
    }
    showProviderDialog.value = false
    await loadProviders()
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败')
  } finally {
    providerFormSubmitting.value = false
  }
}

async function handleDeleteProvider(provider: Provider): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除供应商「${provider.name}」？其下的所有模型将被级联删除。`,
      '删除供应商',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
    await deleteProvider(provider.id)
    ElMessage.success('供应商已删除')
    if (selectedProviderId.value === provider.id) {
      selectedProviderId.value = providers.value[0]?.id ?? ''
    }
    providerConnStatus.value.delete(provider.id)
    await loadProviders()
  } catch (e) {
    if (e === 'cancel') return
    ElMessage.error((e as Error).message || '删除失败')
  }
}

async function handleTestProviderConn(provider: Provider): Promise<void> {
  testDialogTitle.value = `测试连接 — ${provider.name}`
  testDialogLoading.value = true
  testResult.value = null
  testError.value = ''
  showTestDialog.value = true
  providerConnStatus.value.set(provider.id, 'testing')
  try {
    const result = await testProvider(provider.id)
    testResult.value = result
    providerConnStatus.value.set(provider.id, 'ok')
  } catch (e) {
    testError.value = (e as Error).message || '测试失败'
    providerConnStatus.value.set(provider.id, 'fail')
  } finally {
    testDialogLoading.value = false
  }
}

/** Quick-add preset: create provider directly */
async function handleQuickAdd(preset: ProviderPreset): Promise<void> {
  try {
    await createProvider({
      name: preset.label,
      type: preset.type,
      baseUrl: preset.defaultBaseUrl,
      isActive: true,
    })
    ElMessage.success(`已添加 ${preset.label}`)
    await loadProviders()
  } catch (e) {
    ElMessage.error((e as Error).message || '添加失败')
  }
}

// ---- Model CRUD ----

function openCreateModelDialog(): void {
  if (!selectedProviderId.value) {
    ElMessage.warning('请先选择一个供应商')
    return
  }
  isEditingModel.value = false
  editingModelId.value = ''
  modelInitialForm.value = {
    name: '',
    model: '',
    parameters: { temperature: 0.7, maxTokens: 4096 },
    isDefault: false,
    isActive: true,
  }
  showModelDialog.value = true

  // For Ollama, fetch available models
  if (selectedProvider.value?.type === 'ollama') {
    void fetchOllamaModels()
  }
}

function openEditModelDialog(model: Model): void {
  isEditingModel.value = true
  editingModelId.value = model.id
  modelInitialForm.value = {
    name: model.name,
    model: model.model,
    parameters: { ...model.parameters },
    isDefault: model.isDefault,
    isActive: model.isActive,
  }
  showModelDialog.value = true
}

async function handleModelSubmit(formData: ModelFormState): Promise<void> {
  modelFormSubmitting.value = true
  try {
    if (isEditingModel.value) {
      const payload: UpdateModelPayload = {
        name: formData.name,
        model: formData.model,
        parameters: formData.parameters,
        isDefault: formData.isDefault,
        isActive: formData.isActive,
      }
      await updateModel(editingModelId.value, payload)
      ElMessage.success('模型已更新')
    } else {
      const payload: CreateModelPayload = {
        name: formData.name,
        providerId: selectedProviderId.value,
        model: formData.model,
        parameters: formData.parameters,
        isDefault: formData.isDefault,
        isActive: formData.isActive,
      }
      await createModel(payload)
      ElMessage.success('模型已创建')
    }
    showModelDialog.value = false
    await loadModels()
    // Refresh global default
    const allModels = await listModels()
    globalDefaultModel.value = allModels.find((m) => m.isDefault) ?? null
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败')
  } finally {
    modelFormSubmitting.value = false
  }
}

async function handleDeleteModel(model: Model): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确定删除模型「${model.name}」？`,
      '删除模型',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
    await deleteModel(model.id)
    ElMessage.success('模型已删除')
    await loadModels()
    const allModels = await listModels()
    globalDefaultModel.value = allModels.find((m) => m.isDefault) ?? null
  } catch (e) {
    if (e === 'cancel') return
    ElMessage.error((e as Error).message || '删除失败')
  }
}

async function handleSetDefault(model: Model): Promise<void> {
  const existingDefault = models.value.find((m) => m.isDefault && m.id !== model.id)
  const warnMsg = existingDefault ? `将替换当前默认模型「${existingDefault.name}」，` : ''
  try {
    await ElMessageBox.confirm(
      `${warnMsg}确定将「${model.name}」设为默认模型？`,
      '设置默认模型',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'info' },
    )
    await updateModel(model.id, { isDefault: true })
    ElMessage.success(`已设为默认模型`)
    await loadModels()
    const allModels = await listModels()
    globalDefaultModel.value = allModels.find((m) => m.isDefault) ?? null
  } catch (e) {
    if (e === 'cancel') return
    ElMessage.error((e as Error).message || '设置失败')
  }
}

async function handleToggleActive(model: Model): Promise<void> {
  try {
    await updateModel(model.id, { isActive: !model.isActive })
    ElMessage.success(model.isActive ? '已禁用' : '已启用')
    await loadModels()
  } catch (e) {
    ElMessage.error((e as Error).message || '操作失败')
  }
}

async function handleTestModel(model: Model): Promise<void> {
  testDialogTitle.value = `测试模型 — ${model.name}`
  testDialogLoading.value = true
  testResult.value = null
  testError.value = ''
  showTestDialog.value = true
  try {
    const result = await testModel(model.id)
    testResult.value = result
  } catch (e) {
    testError.value = (e as Error).message || '测试失败'
  } finally {
    testDialogLoading.value = false
  }
}

// ---- Helpers ----

function getEmbeddingProviderLabel(provider: string): string {
  const map: Record<string, string> = {
    siliconflow: 'SiliconFlow',
    openai: 'OpenAI',
    custom: '自定义',
  }
  return map[provider] ?? provider
}

// ---- Refresh all ----

async function handleRefreshAll(): Promise<void> {
  await loadProviders()
  await loadModels()
  void loadEmbeddingConfig()
}

// ---- Embedding Config ----

const EMBEDDING_PROVIDER_PRESETS: Array<{
  value: EmbeddingProvider
  label: string
  defaultBaseUrl: string
  defaultModel: string
  defaultDimensions: number
  description: string
}> = [
  {
    value: 'siliconflow',
    label: 'SiliconFlow',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'BAAI/bge-m3',
    defaultDimensions: 1024,
    description: 'SiliconFlow 托管 BGE-M3，中文效果最佳',
  },
  {
    value: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'text-embedding-3-small',
    defaultDimensions: 1536,
    description: 'OpenAI text-embedding-3-small',
  },
  {
    value: 'custom',
    label: '自定义',
    defaultBaseUrl: '',
    defaultModel: '',
    defaultDimensions: 1536,
    description: 'OpenAI 兼容接口',
  },
]

async function loadEmbeddingConfig(): Promise<void> {
  embeddingLoading.value = true
  try {
    embeddingConfig.value = await getEmbeddingConfig()
  } catch (e) {
    ElMessage.error((e as Error).message || '加载嵌入模型配置失败')
  } finally {
    embeddingLoading.value = false
  }
}

function openEmbeddingDialog(): void {
  if (embeddingConfig.value) {
    embeddingForm.value = {
      provider: embeddingConfig.value.provider,
      model: embeddingConfig.value.model,
      baseUrl: embeddingConfig.value.baseUrl,
      apiKey: '',
      dimensions: embeddingConfig.value.dimensions,
    }
  }
  showEmbeddingDialog.value = true
}

function applyEmbeddingPreset(preset: typeof EMBEDDING_PROVIDER_PRESETS[number]): void {
  embeddingForm.value.provider = preset.value
  embeddingForm.value.baseUrl = preset.defaultBaseUrl
  embeddingForm.value.model = preset.defaultModel
  embeddingForm.value.dimensions = preset.defaultDimensions
}

async function handleEmbeddingSubmit(): Promise<void> {
  if (!embeddingForm.value.model.trim()) {
    ElMessage.warning('请输入模型标识')
    return
  }
  embeddingFormSubmitting.value = true
  try {
    const payload: UpdateEmbeddingConfigPayload = {
      provider: embeddingForm.value.provider,
      model: embeddingForm.value.model,
      baseUrl: embeddingForm.value.baseUrl,
      dimensions: embeddingForm.value.dimensions,
    }
    if (embeddingForm.value.apiKey) {
      payload.apiKey = embeddingForm.value.apiKey
    }
    embeddingConfig.value = await updateEmbeddingConfig(payload)
    showEmbeddingDialog.value = false
    ElMessage.success('嵌入模型配置已更新')
  } catch (e) {
    ElMessage.error((e as Error).message || '更新失败')
  } finally {
    embeddingFormSubmitting.value = false
  }
}

// ---- Init ----

onMounted(() => {
  void loadProviders()
  void loadEmbeddingConfig()
})
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.scroll">
      <!-- Header -->
      <header :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1>模型中心</h1>
            <p :class="styles.subtitle">
              管理 LLM 供应商与模型配置，测试连通性，设置默认模型。
            </p>
            <div v-if="globalDefaultModel" :class="styles.activeModelHint">
              <AppIcon name="circle-check-filled" :size="14" />
              <span>
                当前默认模型：<strong>{{ globalDefaultModel.name }}</strong>
                <span :class="styles.hintExtra">（{{ globalDefaultModel.model }}）</span>
              </span>
            </div>
          </div>
          <div :class="styles.headerActions">
            <el-button :loading="providersLoading" @click="handleRefreshAll">
              <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
              刷新
            </el-button>
            <el-button type="primary" @click="openCreateProviderDialog()">
              <AppIcon name="plus" :size="14" style="margin-right: 4px" />
              添加供应商
            </el-button>
          </div>
        </div>
      </header>

      <!-- Content: Two-column layout -->
      <div :class="styles.content">
        <!-- Quick-add presets (only when providers list is empty) -->
        <QuickAddPresets
          v-if="providers.length === 0 && !providersLoading"
          :presets="PROVIDER_PRESETS"
          @quick-add="handleQuickAdd"
        />

        <div :class="styles.twoColLayout" v-loading="providersLoading">
          <!-- Left panel: Provider list -->
          <ProviderList
            :providers="providers"
            :selected-provider-id="selectedProviderId"
            :providers-loading="providersLoading"
            :provider-conn-status="providerConnStatus"
            :selected-provider-model-count="models.length"
            @select="(id) => (selectedProviderId = id)"
            @test-connection="handleTestProviderConn"
            @edit="openEditProviderDialog"
            @delete="handleDeleteProvider"
            @add="openCreateProviderDialog()"
          />

          <!-- Right panel: Model list -->
          <div :class="styles.modelPanel">
            <template v-if="selectedProvider">
              <ModelList
                :models="models"
                :models-loading="modelsLoading"
                :selected-provider="selectedProvider"
                @test-connection="handleTestProviderConn"
                @test-model="handleTestModel"
                @set-default="handleSetDefault"
                @toggle-active="handleToggleActive"
                @edit="openEditModelDialog"
                @delete="handleDeleteModel"
                @create="openCreateModelDialog"
              />
            </template>

            <!-- No provider selected -->
            <div v-else :class="styles.noProviderSelected">
              <AppIcon name="setting" :size="40" />
              <p>请从左侧选择一个供应商</p>
            </div>
          </div>
        </div>

        <!-- Embedding model config card -->
        <div :class="styles.embeddingSection">
          <div :class="styles.embeddingHeader">
            <div :class="styles.embeddingTitle">
              <AppIcon name="connection" :size="16" />
              <h3>嵌入模型</h3>
            </div>
            <el-button size="small" type="primary" plain @click="openEmbeddingDialog">
              <AppIcon name="edit" :size="14" style="margin-right: 4px" />
              编辑配置
            </el-button>
          </div>
          <div v-if="embeddingLoading" :class="styles.embeddingLoading">
            <AppIcon name="loading" :size="20" />
          </div>
          <div v-else-if="embeddingConfig" :class="styles.embeddingBody">
            <div :class="styles.embeddingRow">
              <div :class="styles.embeddingField">
                <span :class="styles.embeddingLabel">供应商</span>
                <span :class="styles.embeddingValue">{{ getEmbeddingProviderLabel(embeddingConfig.provider) }}</span>
              </div>
              <div :class="styles.embeddingField">
                <span :class="styles.embeddingLabel">模型</span>
                <span :class="[styles.embeddingValue, styles.embeddingMono]">{{ embeddingConfig.model }}</span>
              </div>
              <div :class="styles.embeddingField">
                <span :class="styles.embeddingLabel">Base URL</span>
                <span :class="[styles.embeddingValue, styles.embeddingMono]">{{ embeddingConfig.baseUrl }}</span>
              </div>
              <div :class="styles.embeddingField">
                <span :class="styles.embeddingLabel">API Key</span>
                <span :class="[styles.embeddingValue, styles.embeddingMono]">{{ embeddingConfig.apiKey || '(未配置)' }}</span>
              </div>
              <div :class="styles.embeddingField">
                <span :class="styles.embeddingLabel">维度</span>
                <span :class="styles.embeddingValue">{{ embeddingConfig.dimensions }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Provider create/edit dialog -->
    <ProviderDialog
      v-model="showProviderDialog"
      :is-editing="isEditingProvider"
      :initial-form="providerInitialForm"
      :submitting="providerFormSubmitting"
      @submit="handleProviderSubmit"
    />

    <!-- Model create/edit dialog -->
    <ModelDialog
      v-model="showModelDialog"
      :is-editing="isEditingModel"
      :initial-form="modelInitialForm"
      :submitting="modelFormSubmitting"
      :selected-provider="selectedProvider"
      :ollama-models="ollamaModels"
      :ollama-models-loading="ollamaModelsLoading"
      @submit="handleModelSubmit"
    />

    <!-- Test connection result dialog -->
    <AppDialog
      v-model="showTestDialog"
      :title="testDialogTitle"
      width="600px"
      :show-fullscreen-btn="false"
    >
      <div v-if="testDialogLoading" style="text-align: center; padding: 20px">
        <AppIcon name="loading" :size="24" />
        <p style="margin-top: 8px; color: var(--text-color-secondary)">正在测试连接...</p>
      </div>
      <template v-else>
        <div v-if="testResult" :class="[styles.testResult, styles.testSuccess]">
          <div style="font-weight: 600; margin-bottom: 4px">连接成功</div>
          <div v-if="'provider' in testResult">
            Provider: {{ testResult.provider }}
            <template v-if="'model' in testResult"> | 模型: {{ testResult.model }}</template>
            <template v-if="'tokens' in testResult"> | Tokens: {{ testResult.tokens }}</template>
          </div>
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

    <!-- Embedding config edit dialog -->
    <AppDialog
      v-model="showEmbeddingDialog"
      title="编辑嵌入模型配置"
      width="680px"
      :loading="embeddingFormSubmitting"
      @confirm="handleEmbeddingSubmit"
    >
      <div :class="styles.presetSection">
        <div :class="styles.presetLabel">快速选择预设：</div>
        <div :class="styles.presetGrid">
          <button
            v-for="preset in EMBEDDING_PROVIDER_PRESETS"
            :key="preset.value"
            :class="styles.presetCard"
            @click="applyEmbeddingPreset(preset)"
          >
            <div :class="styles.presetInfo">
              <div :class="styles.presetName">{{ preset.label }}</div>
              <div :class="styles.presetDesc">{{ preset.description }}</div>
            </div>
          </button>
        </div>
      </div>

      <el-form label-position="top">
        <el-form-item label="供应商">
          <el-select v-model="embeddingForm.provider" style="width: 100%">
            <el-option
              v-for="preset in EMBEDDING_PROVIDER_PRESETS"
              :key="preset.value"
              :label="preset.label"
              :value="preset.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模型标识" required>
          <el-input
            v-model="embeddingForm.model"
            placeholder="例如：BAAI/bge-m3 / text-embedding-3-small"
            maxlength="200"
          />
        </el-form-item>
        <el-form-item label="Base URL">
          <el-input
            v-model="embeddingForm.baseUrl"
            placeholder="例如：https://api.siliconflow.cn/v1"
            maxlength="500"
          />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input
            v-model="embeddingForm.apiKey"
            placeholder="留空则不更新"
            maxlength="500"
            show-password
          />
        </el-form-item>
        <el-form-item label="向量维度">
          <el-input-number
            v-model="embeddingForm.dimensions"
            :min="1"
            :max="10000"
            :step="1"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEmbeddingDialog = false">取消</el-button>
        <el-button type="primary" :loading="embeddingFormSubmitting" @click="handleEmbeddingSubmit">
          保存
        </el-button>
      </template>
    </AppDialog>
  </div>
</template>
