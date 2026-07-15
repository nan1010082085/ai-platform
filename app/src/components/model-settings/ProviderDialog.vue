<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import type { CreateProviderPayload } from '@/api/providerApi'
import type { ProviderPreset } from './types'
import { PROVIDER_PRESETS } from './providerPresets'
import styles from '@/views/ModelSettingsView.module.scss'

const modelValue = defineModel<boolean>({ default: false })

const props = defineProps<{
  isEditing: boolean
  initialForm: CreateProviderPayload
  submitting: boolean
}>()

const emit = defineEmits<{
  submit: [form: CreateProviderPayload]
}>()

const form = ref<CreateProviderPayload>({
  name: '',
  type: 'deepseek',
  baseUrl: '',
  website: '',
  apiKey: '',
  isActive: true,
})

watch(modelValue, (isOpen) => {
  if (isOpen) {
    form.value = { ...props.initialForm }
  }
})

const currentPreset = computed(() =>
  PROVIDER_PRESETS.find((p) => p.type === form.value.type),
)

const baseUrlPlaceholder = computed(() =>
  currentPreset.value?.defaultBaseUrl ?? 'https://api.example.com/v1',
)

const apiKeyPlaceholder = computed(() =>
  props.isEditing
    ? '留空则不更新'
    : currentPreset.value?.placeholderApiKey ?? 'sk-...',
)

function getProviderTypeLabel(type: string): string {
  const map: Record<string, string> = {
    deepseek: 'DeepSeek',
    openai: 'OpenAI',
    ollama: 'Ollama',
    mimo: 'Mimo',
    azure: 'Azure',
    custom: '自定义',
  }
  return map[type] ?? type
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

function applyPresetToForm(preset: ProviderPreset): void {
  form.value.type = preset.type
  form.value.baseUrl = preset.defaultBaseUrl
  form.value.website = preset.website
  if (!form.value.name) {
    form.value.name = preset.label
  }
}

function handleSubmit(): void {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入供应商名称')
    return
  }
  if (!form.value.baseUrl.trim()) {
    ElMessage.warning('请输入 Base URL')
    return
  }
  emit('submit', { ...form.value })
}
</script>

<template>
  <AppDialog
    v-model="modelValue"
    :title="isEditing ? '编辑供应商' : '添加供应商'"
    width="680px"
    :loading="submitting"
    @confirm="handleSubmit"
  >
    <!-- Quick presets (only on create) -->
    <div v-if="!isEditing" :class="styles.presetSection">
      <div :class="styles.presetLabel">快速选择预设：</div>
      <div :class="styles.presetGrid">
        <button
          v-for="preset in PROVIDER_PRESETS"
          :key="preset.type"
          :class="styles.presetCard"
          @click="applyPresetToForm(preset)"
        >
          <div :class="styles.presetIcon" :style="{ color: preset.color }">
            <AppIcon :name="preset.icon" :size="20" />
          </div>
          <div :class="styles.presetInfo">
            <div :class="styles.presetName">{{ preset.label }}</div>
            <div :class="styles.presetDesc">{{ preset.description }}</div>
          </div>
        </button>
      </div>
    </div>

    <!-- Edit info hint -->
    <div v-if="isEditing" :class="styles.editProviderInfo">
      <AppIcon :name="getProviderTypeIcon(form.type)" :size="14" />
      <span>类型：</span>
      <span :class="styles.editProviderInfoName">{{ getProviderTypeLabel(form.type) }}</span>
      <span style="color: var(--text-color-placeholder)">（类型不可更改）</span>
    </div>

    <el-form label-position="top">
      <el-form-item label="供应商名称" required>
        <el-input
          v-model="form.name"
          placeholder="例如：DeepSeek 主力 / 本地 Ollama"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
      <el-form-item v-if="!isEditing" label="类型" required>
        <el-select v-model="form.type" style="width: 100%">
          <el-option
            v-for="preset in PROVIDER_PRESETS"
            :key="preset.type"
            :label="preset.label"
            :value="preset.type"
          >
            <div style="display: flex; align-items: center; gap: 8px">
              <span :style="{ color: preset.color, fontWeight: 600 }">{{ preset.label }}</span>
              <span style="font-size: 11px; color: #909399">{{ preset.description }}</span>
            </div>
          </el-option>
          <el-option label="其他 (OpenAI 兼容)" value="custom" />
        </el-select>
      </el-form-item>
      <el-form-item label="Base URL">
        <el-input
          v-model="form.baseUrl"
          :placeholder="baseUrlPlaceholder"
          maxlength="500"
        />
        <div style="font-size: 11px; color: var(--text-color-placeholder); margin-top: 4px">
          OpenAI 兼容根地址（不含 <code>/chat/completions</code>）。DeepSeek 官方为
          <code>https://api.deepseek.com</code>；Mimo / OpenAI 含 <code>/v1</code>。
        </div>
      </el-form-item>
      <el-form-item label="官方网站">
        <el-input
          v-model="form.website"
          :placeholder="currentPreset?.website || 'https://...'"
          maxlength="500"
        >
          <template #prefix>
            <AppIcon name="link" :size="14" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item label="API Key">
        <el-input
          v-model="form.apiKey"
          :placeholder="apiKeyPlaceholder"
          maxlength="500"
          show-password
        />
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.isActive" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="modelValue = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEditing ? '保存' : '创建' }}
      </el-button>
    </template>
  </AppDialog>
</template>
