/**
 * useModelCenter - 模型中心全部状态与逻辑
 *
 * 从 ModelSettingsView 抽出。provider/model 共享 selectedProviderId / globalDefaultModel
 * 等交叉状态，统一放一个 composable 避免拆两个时的参数传递耦合。
 */
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  testProvider,
  type Provider,
  type CreateProviderPayload,
  type UpdateProviderPayload,
  type TestConnectionResult as ProviderTestResult,
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
import type { ProviderPreset } from '@/components/model-settings/types'
import { PROVIDER_PRESETS } from '@/components/model-settings/providerPresets'
import type { ModelFormState } from '@/components/model-settings/ModelDialog.vue'
import { resolveErrorText } from '@/constants/errorCodes'

export function useModelCenter() {
  // ---- State: Providers ----
  const providers = ref<Provider[]>([])
  const providersLoading = ref(false)
  const selectedProviderId = ref('')
  const selectedProvider = computed(() =>
    providers.value.find((p) => p.id === selectedProviderId.value) ?? null,
  )
  const providerConnStatus = ref<Map<string, 'ok' | 'fail' | 'testing'>>(new Map())

  // ---- State: Models ----
  const models = ref<Model[]>([])
  const modelsLoading = ref(false)
  const modelTestStatus = ref<Map<string, 'ok' | 'fail' | 'testing'>>(new Map())
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
    capabilities: ['chat'],
    isDefault: false,
    isActive: true,
  })

  // ---- State: Test result dialog ----
  const showTestDialog = ref(false)
  const testDialogTitle = ref('')
  const testDialogLoading = ref(false)
  const testResult = ref<ProviderTestResult | ModelTestResult | null>(null)
  const testError = ref('')
  const testErrorDetails = ref('')

  // ---- Load ----
  async function loadProviders(): Promise<void> {
    providersLoading.value = true
    try {
      providers.value = await listProviders()
      if (!selectedProviderId.value && providers.value.length > 0) {
        selectedProviderId.value = providers.value[0]!.id
      }
      const allModels = await listModels()
      globalDefaultModel.value = allModels.find((m) => m.isDefault) ?? null
    } catch (e) {
      ElMessage.error(resolveErrorText(e, '加载供应商列表失败'))
    } finally {
      providersLoading.value = false
    }
  }

  async function loadModels(): Promise<void> {
    if (!selectedProviderId.value) {
      models.value = []
      return
    }
    modelsLoading.value = true
    try {
      models.value = await listModels(selectedProviderId.value)
    } catch (e) {
      ElMessage.error(resolveErrorText(e, '加载模型列表失败'))
    } finally {
      modelsLoading.value = false
    }
  }

  async function refreshGlobalDefault(): Promise<void> {
    const allModels = await listModels()
    globalDefaultModel.value = allModels.find((m) => m.isDefault) ?? null
  }

  watch(selectedProviderId, () => {
    modelTestStatus.value = new Map()
    void loadModels()
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

  async function ensurePresetModels(providerId: string, type: string): Promise<void> {
    const preset = PROVIDER_PRESETS.find((p) => p.type === type)
    if (!preset?.defaultModels.length) return
    const existing = await listModels(providerId)
    const existingIds = new Set(existing.map((m) => m.model))
    for (const modelId of preset.defaultModels) {
      if (existingIds.has(modelId)) continue
      await createModel({
        name: modelId,
        providerId,
        model: modelId,
        parameters: { temperature: 0.7, maxTokens: 4096 },
        isDefault: false,
        isActive: true,
      })
    }
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
        if (formData.apiKey) payload.apiKey = formData.apiKey
        await updateProvider(editingProviderId.value, payload)
        ElMessage.success('供应商已更新')
      } else {
        const created = await createProvider(formData)
        await ensurePresetModels(created.id, formData.type)
        ElMessage.success('供应商已创建，已自动添加预设模型')
        showProviderDialog.value = false
        await loadProviders()
        selectedProviderId.value = created.id
        await loadModels()
        return
      }
      showProviderDialog.value = false
      await loadProviders()
    } catch (e) {
      ElMessage.error(resolveErrorText(e, '操作失败'))
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
      ElMessage.error(resolveErrorText(e, '删除失败'))
    }
  }

  async function handleTestProviderConn(provider: Provider): Promise<void> {
    testDialogTitle.value = `测试连接 - ${provider.name}`
    testDialogLoading.value = true
    testResult.value = null
    testError.value = ''
    testErrorDetails.value = ''
    showTestDialog.value = true
    providerConnStatus.value.set(provider.id, 'testing')
    try {
      const result = await testProvider(provider.id)
      testResult.value = result
      providerConnStatus.value.set(provider.id, 'ok')
    } catch (e) {
      testError.value = resolveErrorText(e, '测试失败')
      testErrorDetails.value = extractErrorDetails(e)
      providerConnStatus.value.set(provider.id, 'fail')
    } finally {
      testDialogLoading.value = false
    }
  }

  async function handleQuickAdd(preset: ProviderPreset): Promise<void> {
    isEditingProvider.value = false
    editingProviderId.value = ''
    providerInitialForm.value = {
      name: preset.label,
      type: preset.type,
      baseUrl: preset.defaultBaseUrl,
      apiKey: '',
      isActive: true,
    }
    showProviderDialog.value = true
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
      capabilities: ['chat'],
      isDefault: false,
      isActive: true,
    }
    showModelDialog.value = true
  }

  function openEditModelDialog(model: Model): void {
    isEditingModel.value = true
    editingModelId.value = model.id
    modelInitialForm.value = {
      name: model.name,
      model: model.model,
      parameters: { ...model.parameters },
      capabilities: [...(model.capabilities ?? ['chat'])],
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
          capabilities: formData.capabilities,
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
          capabilities: formData.capabilities,
          isDefault: formData.isDefault,
          isActive: formData.isActive,
        }
        await createModel(payload)
        ElMessage.success('模型已创建')
      }
      showModelDialog.value = false
      await loadModels()
      await refreshGlobalDefault()
    } catch (e) {
      ElMessage.error(resolveErrorText(e, '操作失败'))
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
      await refreshGlobalDefault()
    } catch (e) {
      if (e === 'cancel') return
      ElMessage.error(resolveErrorText(e, '删除失败'))
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
      await refreshGlobalDefault()
    } catch (e) {
      if (e === 'cancel') return
      ElMessage.error(resolveErrorText(e, '设置失败'))
    }
  }

  async function handleToggleActive(model: Model): Promise<void> {
    try {
      await updateModel(model.id, { isActive: !model.isActive })
      ElMessage.success(model.isActive ? '已禁用' : '已启用')
      await loadModels()
    } catch (e) {
      ElMessage.error(resolveErrorText(e, '操作失败'))
    }
  }

  async function handleTestModel(model: Model): Promise<void> {
    testDialogTitle.value = `测试模型 - ${model.name}`
    testDialogLoading.value = true
    testResult.value = null
    testError.value = ''
    testErrorDetails.value = ''
    showTestDialog.value = true
    setModelTestStatus(model.id, 'testing')
    try {
      const result = await testModel(model.id)
      testResult.value = result
      setModelTestStatus(model.id, 'ok')
    } catch (e) {
      testError.value = resolveErrorText(e, '测试失败')
      testErrorDetails.value = extractErrorDetails(e)
      setModelTestStatus(model.id, 'fail')
    } finally {
      testDialogLoading.value = false
    }
  }

  function setModelTestStatus(modelId: string, status: 'ok' | 'fail' | 'testing'): void {
    const next = new Map(modelTestStatus.value)
    next.set(modelId, status)
    modelTestStatus.value = next
  }

  function extractErrorDetails(error: unknown): string {
    if (error && typeof error === 'object' && 'details' in error) {
      const details = (error as { details?: unknown }).details
      if (typeof details === 'string' && details.trim()) return details.trim()
    }
    return ''
  }

  async function handleRefreshAll(): Promise<void> {
    await loadProviders()
    await loadModels()
  }

  return {
    // providers
    providers,
    providersLoading,
    selectedProviderId,
    selectedProvider,
    providerConnStatus,
    // models
    models,
    modelsLoading,
    modelTestStatus,
    globalDefaultModel,
    // provider dialog
    showProviderDialog,
    isEditingProvider,
    providerFormSubmitting,
    providerInitialForm,
    // model dialog
    showModelDialog,
    isEditingModel,
    modelFormSubmitting,
    modelInitialForm,
    // test dialog
    showTestDialog,
    testDialogTitle,
    testDialogLoading,
    testResult,
    testError,
    testErrorDetails,
    // actions
    loadProviders,
    loadModels,
    openCreateProviderDialog,
    openEditProviderDialog,
    handleProviderSubmit,
    handleDeleteProvider,
    handleTestProviderConn,
    handleQuickAdd,
    openCreateModelDialog,
    openEditModelDialog,
    handleModelSubmit,
    handleDeleteModel,
    handleSetDefault,
    handleToggleActive,
    handleTestModel,
    handleRefreshAll,
  }
}
