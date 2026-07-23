<script setup lang="ts">
/**
 * 模型中心 - 供应商 + 模型两级管理
 *
 * 左侧面板：供应商列表（CRUD + 测试连接）
 * 右侧面板：选中供应商的模型列表（CRUD + 设为默认 + 启用/禁用）
 *
 * 业务逻辑在 useModelCenter composable，视图只负责编排与渲染。
 */

import { onMounted } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import QuickAddPresets from '@/components/model-settings/QuickAddPresets.vue'
import ProviderList from '@/components/model-settings/ProviderList.vue'
import ProviderDialog from '@/components/model-settings/ProviderDialog.vue'
import ModelList from '@/components/model-settings/ModelList.vue'
import ModelDialog from '@/components/model-settings/ModelDialog.vue'
import { useModelCenter } from '@/composables/useModelCenter'
import { PROVIDER_PRESETS } from '@/components/model-settings/providerPresets'
import styles from './ModelSettingsView.module.scss'

const {
  providers,
  providersLoading,
  selectedProviderId,
  selectedProvider,
  providerConnStatus,
  models,
  modelsLoading,
  modelTestStatus,
  globalDefaultModel,
  showProviderDialog,
  isEditingProvider,
  providerFormSubmitting,
  providerInitialForm,
  showModelDialog,
  isEditingModel,
  modelFormSubmitting,
  modelInitialForm,
  showTestDialog,
  testDialogTitle,
  testDialogLoading,
  testResult,
  testError,
  testErrorDetails,
  loadProviders,
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
} = useModelCenter()

onMounted(() => {
  void loadProviders()
})
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.scroll">
      <!-- Header -->
      <PageHeader
        title="模型中心"
        subtitle="管理 LLM 供应商与模型配置，测试连通性，设置默认模型。"
      >
        <div v-if="globalDefaultModel" :class="styles.activeModelHint">
          <AppIcon name="circle-check-filled" :size="14" />
          <span>
            当前默认模型：<strong>{{ globalDefaultModel.name }}</strong>
            <span :class="styles.hintExtra">（{{ globalDefaultModel.model }}）</span>
          </span>
        </div>
        <template #actions>
          <el-button :loading="providersLoading" @click="handleRefreshAll">
            <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
            刷新
          </el-button>
          <el-button type="primary" @click="openCreateProviderDialog()">
            <AppIcon name="plus" :size="14" style="margin-right: 4px" />
            添加供应商
          </el-button>
        </template>
      </PageHeader>

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
                :model-test-status="modelTestStatus"
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
      :existing-model-ids="models.map((m) => m.model)"
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
          <div v-if="testErrorDetails" :class="styles.testReply" style="margin-top: 8px">
            {{ testErrorDetails }}
          </div>
        </div>
      </template>
      <template #footer>
        <el-button type="primary" @click="showTestDialog = false">关闭</el-button>
      </template>
    </AppDialog>
  </div>
</template>
