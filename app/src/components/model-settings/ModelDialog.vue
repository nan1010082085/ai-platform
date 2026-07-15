<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import type { Provider } from '@/api/providerApi'
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
  ollamaModels: string[]
  ollamaModelsLoading: boolean
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

watch(modelValue, (isOpen) => {
  if (isOpen) {
    form.value = {
      name: props.initialForm.name,
      model: props.initialForm.model,
      parameters: { ...props.initialForm.parameters },
      isDefault: props.initialForm.isDefault,
      isActive: props.initialForm.isActive,
    }
  }
})

const modelDropdownOptions = computed(() => {
  if (props.selectedProvider?.type !== 'ollama') return []
  return props.ollamaModels
})

function getProviderTypeIcon(type: string): string {
  const map: Record<string, string> = {
    deepseek: 'chat-dot-round',
    openai: 'chat-round',
    ollama: 'monitor',
    mimo: 'magic-stick',
    azure: 'cloudy',
    custom: 'setting',
  }
  return map[type] ?? 'setting'
}

function handleSubmit(): void {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入模型名称')
    return
  }
  if (!form.value.model.trim()) {
    ElMessage.warning('请输入 model 标识')
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
    </div>

    <el-form label-position="top">
      <el-form-item label="模型名称" required>
        <el-input
          v-model="form.name"
          placeholder="例如：DeepSeek Chat / Qwen 72B"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="Model 标识" required>
        <!-- Ollama: dropdown from /api/tags -->
        <el-select
          v-if="selectedProvider?.type === 'ollama' && modelDropdownOptions.length > 0"
          v-model="form.model"
          filterable
          allow-create
          style="width: 100%"
          placeholder="选择或输入模型标识"
          :loading="ollamaModelsLoading"
        >
          <el-option
            v-for="name in modelDropdownOptions"
            :key="name"
            :label="name"
            :value="name"
          />
        </el-select>
        <!-- Others: free text input -->
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
