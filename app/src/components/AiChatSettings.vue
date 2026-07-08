<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { ChatSettings } from '@/types'
import { checkAIHealth, type AIHealthResponse } from '@/api/aiApi'
import { useModelOptions } from '@/composables/useModelOptions'
import AgentWorkflowPicker from '@/components/AgentWorkflowPicker.vue'
import SectionToggle from '@/components/agent-workflow/property-panel/SectionToggle.vue'
import FieldRow from '@/components/agent-workflow/property-panel/FieldRow.vue'
import styles from './AiChatSettings.module.scss'

const props = defineProps<{
  visible: boolean
  settings: ChatSettings
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:settings': [settings: ChatSettings]
}>()

const router = useRouter()
const { modelOptions, loading: modelsLoading, loadModelOptions } = useModelOptions()

const localSettings = ref<ChatSettings>(JSON.parse(JSON.stringify(props.settings)))
const healthData = ref<AIHealthResponse | null>(null)
const healthLoading = ref(false)

async function fetchHealth(): Promise<void> {
  healthLoading.value = true
  try {
    healthData.value = await checkAIHealth()
  } catch {
    healthData.value = null
  } finally {
    healthLoading.value = false
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    localSettings.value = JSON.parse(JSON.stringify(props.settings))
    fetchHealth()
    void loadModelOptions()
  }
})

function handleClose(): void {
  emit('update:visible', false)
}

function handleSave(): void {
  emit('update:settings', JSON.parse(JSON.stringify(localSettings.value)))
  emit('update:visible', false)
}
</script>

<template>
  <el-drawer
    :model-value="visible"
    title="对话设置"
    :size="320"
    :class="styles.drawer"
    @update:model-value="handleClose"
  >
    <el-scrollbar :class="styles.scroll">
      <SectionToggle title="连接状态">
        <div v-if="healthLoading" :class="styles.statusRow">
          <span :class="[styles.statusDot, styles.statusChecking]" />
          <span>检测中...</span>
        </div>
        <template v-else-if="healthData">
          <div :class="styles.statusRow">
            <span
              :class="[
                styles.statusDot,
                healthData.status === 'ok' ? styles.statusOk : styles.statusError,
              ]"
            />
            <span>{{ healthData.status === 'ok' ? 'API Key 已配置' : '未配置 API Key' }}</span>
          </div>
          <div v-if="healthData.providers.length > 0" :class="styles.providerList">
            <div
              v-for="provider in healthData.providers"
              :key="provider.name"
              :class="styles.providerItem"
            >
              <span>
                {{ provider.name }}
                <span v-if="provider.isDefault" :class="styles.badge">默认</span>
              </span>
              <span :class="styles.providerModel">{{ provider.model }}</span>
            </div>
          </div>
        </template>
      </SectionToggle>

      <SectionToggle title="模型" :count="1">
        <FieldRow label="对话模型" hint="选择 Chat 对话使用的大模型">
          <el-select v-model="localSettings.model" :loading="modelsLoading">
            <el-option
              v-for="option in modelOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </FieldRow>
      </SectionToggle>

      <SectionToggle title="Agent 编排" :count="1">
        <FieldRow
          label="工作流"
          textarea
          hint="选择已发布编排后，发送将触发该工作流而非默认对话"
        >
          <AgentWorkflowPicker
            v-model="localSettings.agentWorkflowId"
            :show-label="false"
          />
        </FieldRow>
        <div :class="styles.navLinks">
          <el-button link type="primary" @click="router.push('/workflows')">
            打开 Agent 编排
          </el-button>
          <el-button link type="primary" @click="router.push('/plugins')">
            插件中心
          </el-button>
        </div>
      </SectionToggle>

      <SectionToggle title="用户偏好" :count="3">
        <FieldRow label="回复语言">
          <el-select v-model="localSettings.preferences.replyLanguage">
            <el-option label="中文" value="zh-CN" />
            <el-option label="English" value="en-US" />
          </el-select>
        </FieldRow>
        <FieldRow label="回复风格">
          <el-select v-model="localSettings.preferences.replyStyle">
            <el-option label="简洁" value="concise" />
            <el-option label="详细" value="detailed" />
          </el-select>
        </FieldRow>
        <FieldRow label="代码注释">
          <el-select v-model="localSettings.preferences.codeComment">
            <el-option label="是" value="yes" />
            <el-option label="否" value="no" />
          </el-select>
        </FieldRow>
      </SectionToggle>

      <SectionToggle title="对话历史摘要" :count="localSettings.historySummary.mode === 'manual' ? 2 : 1">
        <FieldRow label="生成方式">
          <el-select v-model="localSettings.historySummary.mode">
            <el-option label="自动" value="auto" />
            <el-option label="手动" value="manual" />
          </el-select>
        </FieldRow>
        <FieldRow
          v-if="localSettings.historySummary.mode === 'manual'"
          label="手动摘要"
          textarea
          hint="注入到后续对话的上下文摘要"
        >
          <el-input
            v-model="localSettings.historySummary.manualSummary"
            type="textarea"
            :rows="3"
            resize="vertical"
            placeholder="输入对话历史摘要..."
          />
        </FieldRow>
      </SectionToggle>
    </el-scrollbar>

    <template #footer>
      <div :class="styles.footer">
        <el-button size="small" @click="handleClose">取消</el-button>
        <el-button type="primary" size="small" @click="handleSave">保存</el-button>
      </div>
    </template>
  </el-drawer>
</template>
