<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import {
  listRemoteModels,
  type Provider,
  type RemoteModelItem,
} from '@/api/providerApi'
import type { ModelParameters } from '@/api/modelApi'
import styles from '@/views/ModelSettingsView.module.scss'

export interface ModelFormState {
  name: string
  model: string
  parameters: ModelParameters
  isDefault: boolean
  isActive: boolean
}

const modelValue = defineModel<boolean>({ default: false })

const props = defineProps<{
  isEditing: boolean
  initialForm: ModelFormState
  submitting: boolean
  selectedProvider: Provider | null
  /** 当前供应商下已添加的 model id，拉取列表时用于标记/过滤 */
  existingModelIds?: string[]
}>()

const emit = defineEmits<{
  submit: [form: ModelFormState & { providerId?: string }]
}>()

const form = ref<ModelFormState>({
  name: '',
  model: '',
  parameters: { temperature: 0.7, maxTokens: 4096 },
  isDefault: false,
  isActive: true,
})

const remoteModels = ref<RemoteModelItem[]>([])
const remoteLoading = ref(false)
const remoteFetched = ref(false)
const remoteError = ref('')

const canPullRemote = computed(() => !props.isEditing && !!props.selectedProvider)
const existingSet = computed(() => new Set(props.existingModelIds ?? []))

const selectableRemoteModels = computed(() =>
  remoteModels.value.filter((item) => !existingSet.value.has(item.id)),
)

const remoteNameOptions = computed(() => {
  const names = new Map<string, string>()
  for (const item of selectableRemoteModels.value) {
    const label = item.name || item.id
    names.set(label, item.id)
  }
  return [...names.entries()].map(([label, id]) => ({ label, id }))
})

watch(modelValue, (isOpen) => {
  if (!isOpen) return
  form.value = {
    name: props.initialForm.name,
    model: props.initialForm.model,
    parameters: { ...props.initialForm.parameters },
    isDefault: props.initialForm.isDefault,
    isActive: props.initialForm.isActive,
  }
  remoteModels.value = []
  remoteFetched.value = false
  remoteError.value = ''
  if (canPullRemote.value) {
    void fetchRemoteModels()
  }
})

async function fetchRemoteModels(): Promise<void> {
  if (!props.selectedProvider) return
  remoteLoading.value = true
  remoteError.value = ''
  try {
    remoteModels.value = await listRemoteModels(props.selectedProvider.id)
    remoteFetched.value = true
    if (remoteModels.value.length === 0) {
      ElMessage.warning('供应商未返回可用模型，可手动输入')
    }
  } catch (e) {
    remoteModels.value = []
    remoteFetched.value = true
    remoteError.value = (e as Error).message || '拉取模型列表失败'
    ElMessage.error(remoteError.value)
  } finally {
    remoteLoading.value = false
  }
}

function getProviderTypeIcon(type: string): string {
  const map: Record<string, string> = {
    deepseek: 'chat-dot-round',
    openai: 'chat-line-round',
    ollama: 'monitor',
    mimo: 'magic-stick',
    azure: 'connection',
    custom: 'setting',
  }
  return map[type] ?? 'setting'
}

function onSelectRemoteModel(modelId: string): void {
  const item = remoteModels.value.find((m) => m.id === modelId)
  form.value.model = modelId
  if (!form.value.name.trim() && item) {
    form.value.name = item.name || item.id
  }
}

function onSelectRemoteName(name: string): void {
  form.value.name = name
  const item = remoteModels.value.find((m) => m.name === name || m.id === name)
  if (item && !form.value.model.trim()) {
    form.value.model = item.id
  }
}

function handleSubmit(): void {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入模型名称')
    return
  }
  if (!form.value.model.trim()) {
    ElMessage.warning('请输入模型标识')
    return
  }
  emit('submit', { ...form.value })
}
</script>

<template>
  <AppDialog
    v-model="modelValue"
    :title="isEditing ? '编辑模型' : '添加模型'"
    width="680px"
    :loading="submitting"
    @confirm="handleSubmit"
  >
    <div v-if="selectedProvider" :class="styles.editProviderInfo">
      <AppIcon :name="getProviderTypeIcon(selectedProvider.type)" :size="14" />
      <span>供应商：</span>
      <span :class="styles.editProviderInfoName">{{ selectedProvider.name }}</span>
      <el-button
        v-if="canPullRemote"
        link
        type="primary"
        size="small"
        :loading="remoteLoading"
        style="margin-left: auto"
        @click="fetchRemoteModels"
      >
        <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
        {{ remoteFetched ? '重新拉取' : '从供应商拉取模型' }}
      </el-button>
    </div>

    <p
      v-if="canPullRemote && remoteFetched"
      style="margin: 0 0 12px; font-size: 12px; color: var(--text-color-secondary)"
    >
      <template v-if="selectableRemoteModels.length > 0">
        已拉取 {{ remoteModels.length }} 个上游模型
        <template v-if="selectableRemoteModels.length < remoteModels.length">
          （可选 {{ selectableRemoteModels.length }} 个，其余已添加）
        </template>
        ，可下拉选择或直接输入
      </template>
      <template v-else-if="remoteError">
        {{ remoteError }}，请手动输入
      </template>
      <template v-else-if="remoteModels.length > 0">
        上游模型均已添加，可手动输入新标识
      </template>
      <template v-else>
        上游暂无模型列表，请手动输入
      </template>
    </p>

    <el-form label-position="top">
      <el-form-item label="模型名称" required>
        <el-select
          v-if="!isEditing"
          v-model="form.name"
          filterable
          allow-create
          default-first-option
          clearable
          :loading="remoteLoading"
          style="width: 100%"
          placeholder="选择或输入模型名称"
          @change="onSelectRemoteName"
        >
          <el-option
            v-for="opt in remoteNameOptions"
            :key="`name-${opt.id}`"
            :label="opt.label"
            :value="opt.label"
          />
        </el-select>
        <el-input
          v-else
          v-model="form.name"
          placeholder="例如：DeepSeek Chat / Qwen 72B"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="模型标识" required>
        <el-select
          v-if="!isEditing"
          v-model="form.model"
          filterable
          allow-create
          default-first-option
          clearable
          :loading="remoteLoading"
          style="width: 100%"
          placeholder="选择或输入模型标识"
          @change="onSelectRemoteModel"
        >
          <el-option
            v-for="item in selectableRemoteModels"
            :key="`id-${item.id}`"
            :label="item.id"
            :value="item.id"
          >
            <span>{{ item.id }}</span>
            <span
              v-if="item.name && item.name !== item.id"
              style="float: right; color: var(--el-text-color-secondary); font-size: 12px"
            >
              {{ item.name }}
            </span>
          </el-option>
        </el-select>
        <el-input
          v-else
          v-model="form.model"
          placeholder="例如：deepseek-chat / llama3 / mimo-v2.5"
          maxlength="200"
        />
      </el-form-item>

      <div :class="styles.formRow">
        <el-form-item label="Temperature">
          <el-input-number
            v-model="form.parameters.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            :precision="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="Max Tokens">
          <el-input-number
            v-model="form.parameters.maxTokens"
            :min="1"
            :max="1000000"
            :step="256"
            style="width: 100%"
          />
        </el-form-item>
      </div>
      <el-form-item label="Top P">
        <el-input-number
          v-model="form.parameters.topP"
          :min="0"
          :max="1"
          :step="0.05"
          :precision="2"
          style="width: 100%"
          placeholder="可选"
        />
      </el-form-item>
      <div :class="styles.formRow">
        <el-form-item label="设为默认">
          <el-switch v-model="form.isDefault" />
          <span style="margin-left: 8px; font-size: 12px; color: var(--text-color-secondary)">
            全局唯一默认
          </span>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.isActive" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="modelValue = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEditing ? '保存' : '创建' }}
      </el-button>
    </template>
  </AppDialog>
</template>
