<script setup lang="ts">
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import type { Provider } from '@/api/providerApi'
import styles from '@/views/ModelSettingsView.module.scss'

const props = defineProps<{
  providers: Provider[]
  selectedProviderId: string
  providersLoading: boolean
  providerConnStatus: Map<string, 'ok' | 'fail' | 'testing'>
  selectedProviderModelCount: number
}>()

const emit = defineEmits<{
  select: [id: string]
  testConnection: [provider: Provider]
  edit: [provider: Provider]
  delete: [provider: Provider]
  add: []
}>()

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

function getProviderTypeColor(type: string): string {
  const map: Record<string, string> = {
    deepseek: '#4D6BFE',
    openai: '#10A37F',
    ollama: '#2080F0',
    mimo: '#FF6B35',
    azure: '#0078D4',
    custom: '#909399',
  }
  return map[type] ?? '#909399'
}

function getProviderConnClass(id: string): string {
  const status = props.providerConnStatus.get(id)
  if (status === 'ok') return styles.providerTestOk
  if (status === 'fail') return styles.providerTestFail
  if (status === 'testing') return styles.providerTestTesting
  return ''
}

function getProviderConnText(id: string): string {
  const status = props.providerConnStatus.get(id)
  if (status === 'ok') return '正常'
  if (status === 'fail') return '失败'
  if (status === 'testing') return '测试中'
  return ''
}
</script>

<template>
  <div :class="styles.providerPanel">
    <div :class="styles.providerPanelHeader">
      <h3>供应商</h3>
      <el-button
        link
        type="primary"
        size="small"
        @click="emit('add')"
      >
        <AppIcon name="plus" :size="14" />
      </el-button>
    </div>

    <div :class="styles.providerList">
      <div
        v-for="provider in providers"
        :key="provider.id"
        :class="[
          styles.providerCard,
          selectedProviderId === provider.id ? styles.providerCardActive : '',
        ]"
        @click="emit('select', provider.id)"
      >
        <div
          :class="styles.providerCardIcon"
          :style="{ background: getProviderTypeColor(provider.type) + '15' }"
        >
          <AppIcon
            :name="getProviderTypeIcon(provider.type)"
            :size="18"
            :style="{ color: getProviderTypeColor(provider.type) }"
          />
        </div>
        <div :class="styles.providerCardBody">
          <div :class="styles.providerCardName">
            <span>{{ provider.name }}</span>
            <span
              v-if="providerConnStatus.has(provider.id)"
              :class="[styles.providerTestBadge, getProviderConnClass(provider.id)]"
            >
              {{ getProviderConnText(provider.id) }}
            </span>
          </div>
          <div :class="styles.providerCardUrl">
            {{ provider.baseUrl || '默认地址' }}
          </div>
          <div :class="styles.providerCardMeta">
            <span>{{ getProviderTypeLabel(provider.type) }}</span>
            <span v-if="provider.id === selectedProviderId">
              {{ selectedProviderModelCount }} 个模型
            </span>
          </div>
        </div>
        <div :class="styles.providerCardActions">
          <el-tooltip content="测试连接" placement="top" :show-after="500">
            <el-button
              :class="styles.providerCardActionBtn"
              link
              size="small"
              @click.stop="emit('testConnection', provider)"
            >
              <AppIcon name="connection" :size="14" />
            </el-button>
          </el-tooltip>
          <el-tooltip content="编辑" placement="top" :show-after="500">
            <el-button
              :class="styles.providerCardActionBtn"
              link
              type="primary"
              size="small"
              @click.stop="emit('edit', provider)"
            >
              <AppIcon name="edit" :size="14" />
            </el-button>
          </el-tooltip>
          <el-tooltip content="删除" placement="top" :show-after="500">
            <el-button
              :class="styles.providerCardActionBtn"
              link
              type="danger"
              size="small"
              @click.stop="emit('delete', provider)"
            >
              <AppIcon name="delete" :size="14" />
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="providers.length === 0 && !providersLoading"
        :class="styles.noProviderSelected"
      >
        <AppIcon name="setting" :size="32" />
        <p>暂无供应商</p>
        <el-button type="primary" plain size="small" @click="emit('add')">
          添加第一个供应商
        </el-button>
      </div>
    </div>
  </div>
</template>
