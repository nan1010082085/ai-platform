/**
 * 嵌入模型配置 — 独立设置页
 *
 * 展示 / 编辑 RAG 等场景使用的 embedding provider（SiliconFlow / OpenAI / 自定义）。
 */

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import {
  getEmbeddingConfig,
  updateEmbeddingConfig,
  type EmbeddingConfig,
  type EmbeddingProvider,
  type UpdateEmbeddingConfigPayload,
} from '@/api/providerApi'
import styles from './EmbeddingSettingsView.module.scss'

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

function getEmbeddingProviderLabel(provider: string): string {
  const map: Record<string, string> = {
    siliconflow: 'SiliconFlow',
    openai: 'OpenAI',
    custom: '自定义',
  }
  return map[provider] ?? provider
}

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

function applyEmbeddingPreset(preset: (typeof EMBEDDING_PROVIDER_PRESETS)[number]): void {
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

onMounted(() => {
  void loadEmbeddingConfig()
})
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.scroll">
      <header :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1>嵌入模型</h1>
            <p :class="styles.subtitle">
              配置 RAG 检索等场景使用的向量嵌入模型（与对话 LLM 分开管理）。
            </p>
          </div>
          <div :class="styles.headerActions">
            <el-button :loading="embeddingLoading" @click="loadEmbeddingConfig">
              <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
              刷新
            </el-button>
            <el-button type="primary" @click="openEmbeddingDialog">
              <AppIcon name="edit" :size="14" style="margin-right: 4px" />
              编辑配置
            </el-button>
          </div>
        </div>
      </header>

      <div :class="styles.content">
        <div :class="styles.card">
          <div v-if="embeddingLoading" :class="styles.loading">
            <AppIcon name="loading" :size="24" />
            <p>加载配置中…</p>
          </div>

          <div v-else-if="embeddingConfig" :class="styles.body">
            <div :class="styles.row">
              <div :class="styles.field">
                <span :class="styles.label">供应商</span>
                <span :class="styles.value">{{ getEmbeddingProviderLabel(embeddingConfig.provider) }}</span>
              </div>
              <div :class="styles.field">
                <span :class="styles.label">模型</span>
                <span :class="[styles.value, styles.mono]">{{ embeddingConfig.model }}</span>
              </div>
              <div :class="styles.field">
                <span :class="styles.label">Base URL</span>
                <span :class="[styles.value, styles.mono]">{{ embeddingConfig.baseUrl }}</span>
              </div>
              <div :class="styles.field">
                <span :class="styles.label">API Key</span>
                <span :class="[styles.value, styles.mono]">{{ embeddingConfig.apiKey || '(未配置)' }}</span>
              </div>
              <div :class="styles.field">
                <span :class="styles.label">维度</span>
                <span :class="styles.value">{{ embeddingConfig.dimensions }}</span>
              </div>
            </div>
          </div>

          <div v-else :class="styles.empty">
            <AppIcon name="collection" :size="40" />
            <p>暂无嵌入模型配置</p>
            <el-button type="primary" @click="openEmbeddingDialog">立即配置</el-button>
          </div>
        </div>

        <div :class="styles.hint">
          <AppIcon name="info-filled" :size="14" />
          <span>嵌入模型用于向量检索；对话用的 LLM 请在「模型与连接」中管理。</span>
        </div>
      </div>
    </div>

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
            type="button"
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
