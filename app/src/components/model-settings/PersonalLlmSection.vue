/**
 * 模型中心内嵌：个人 API Key（BYOK）
 * 普通用户对话前必须配置；复用模型中心页面，不另开路由。
 */
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import AppDialog from '@schema-platform/platform-shared/components/common/AppDialog.vue'
import {
  listUserLlmCredentials,
  createUserLlmCredential,
  updateUserLlmCredential,
  deleteUserLlmCredential,
  type UserLlmCredential,
} from '@/api/userLlmCredentialApi'
import { resolveErrorText } from '@/constants/errorCodes'
import { PROVIDER_PRESETS } from '@/components/model-settings/providerPresets'
import styles from '@/views/ModelSettingsView.module.scss'

const items = ref<UserLlmCredential[]>([])
const loading = ref(false)
const showDialog = ref(false)
const submitting = ref(false)
const editingId = ref<string | null>(null)
const form = ref({
  name: '',
  provider: 'deepseek',
  baseUrl: '',
  apiKey: '',
  model: '',
  isDefault: true,
})

/**
 * 加载个人凭证列表
 */
async function load(): Promise<void> {
  loading.value = true
  try {
    items.value = await listUserLlmCredentials()
  } catch (e) {
    ElMessage.error(resolveErrorText(e, '加载个人模型配置失败'))
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editingId.value = null
  const preset = PROVIDER_PRESETS.find((p) => p.type === 'deepseek')
  form.value = {
    name: preset?.name ?? '我的 DeepSeek',
    provider: 'deepseek',
    baseUrl: preset?.baseUrl ?? '',
    apiKey: '',
    model: 'deepseek-chat',
    isDefault: items.value.length === 0,
  }
  showDialog.value = true
}

function openEdit(row: UserLlmCredential): void {
  editingId.value = row.id
  form.value = {
    name: row.name,
    provider: row.provider,
    baseUrl: row.baseUrl || '',
    apiKey: '',
    model: row.model,
    isDefault: row.isDefault,
  }
  showDialog.value = true
}

async function submit(): Promise<void> {
  if (!form.value.name.trim() || !form.value.model.trim()) {
    ElMessage.warning('名称与模型 ID 必填')
    return
  }
  if (!editingId.value && !form.value.apiKey.trim()) {
    ElMessage.warning('请填写 API Key')
    return
  }
  submitting.value = true
  try {
    if (editingId.value) {
      const payload: Record<string, unknown> = {
        name: form.value.name.trim(),
        provider: form.value.provider,
        baseUrl: form.value.baseUrl.trim(),
        model: form.value.model.trim(),
        isDefault: form.value.isDefault,
      }
      if (form.value.apiKey.trim()) payload.apiKey = form.value.apiKey.trim()
      await updateUserLlmCredential(editingId.value, payload)
      ElMessage.success('已更新')
    } else {
      const res = await createUserLlmCredential({
        name: form.value.name.trim(),
        provider: form.value.provider,
        baseUrl: form.value.baseUrl.trim(),
        apiKey: form.value.apiKey.trim(),
        model: form.value.model.trim(),
        isDefault: form.value.isDefault,
      })
      ElMessage.success(res.notice || '已添加')
    }
    showDialog.value = false
    await load()
  } catch (e) {
    ElMessage.error(resolveErrorText(e, '保存失败'))
  } finally {
    submitting.value = false
  }
}

async function remove(row: UserLlmCredential): Promise<void> {
  try {
    await ElMessageBox.confirm(`删除「${row.name}」？`, '确认删除', { type: 'warning' })
    await deleteUserLlmCredential(row.id)
    ElMessage.success('已删除')
    await load()
  } catch (e) {
    if (e === 'cancel') return
    ElMessage.error(resolveErrorText(e, '删除失败'))
  }
}

async function setDefault(row: UserLlmCredential): Promise<void> {
  try {
    await updateUserLlmCredential(row.id, { isDefault: true })
    ElMessage.success('已设为默认')
    await load()
  } catch (e) {
    ElMessage.error(resolveErrorText(e, '设置失败'))
  }
}

onMounted(() => {
  void load()
})

defineExpose({ load })
</script>

<template>
  <section :class="styles.personalSection" v-loading="loading">
    <div :class="styles.personalHeader">
      <div>
        <h3 :class="styles.personalTitle">个人 API Key</h3>
        <p :class="styles.personalHint">
          普通用户对话 / 工作流必须使用自己的密钥，不会使用服务器平台 Key。
        </p>
      </div>
      <el-button type="primary" @click="openCreate">
        <AppIcon name="plus" :size="14" style="margin-right: 4px" />
        添加密钥
      </el-button>
    </div>

    <el-empty v-if="!loading && items.length === 0" description="尚未配置个人模型，请先添加 API Key" />

    <el-table v-else :data="items" stripe style="width: 100%">
      <el-table-column prop="name" label="名称" min-width="140" />
      <el-table-column prop="provider" label="供应商" width="110" />
      <el-table-column prop="model" label="模型" min-width="160" />
      <el-table-column prop="apiKey" label="API Key" min-width="140" />
      <el-table-column label="默认" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.isDefault" type="success" size="small">默认</el-tag>
          <el-button v-else link type="primary" @click="setDefault(row)">设为默认</el-button>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <AppDialog
      v-model="showDialog"
      :title="editingId ? '编辑个人模型' : '添加个人模型'"
      width="520px"
      :confirm-loading="submitting"
      @confirm="submit"
    >
      <el-form label-position="top">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="如：我的 DeepSeek" />
        </el-form-item>
        <el-form-item label="供应商">
          <el-select v-model="form.provider" style="width: 100%">
            <el-option
              v-for="p in PROVIDER_PRESETS"
              :key="p.type"
              :label="p.name"
              :value="p.type"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Base URL">
          <el-input v-model="form.baseUrl" placeholder="可选，默认按供应商" />
        </el-form-item>
        <el-form-item label="模型 ID" required>
          <el-input v-model="form.model" placeholder="如 deepseek-chat" />
        </el-form-item>
        <el-form-item :label="editingId ? 'API Key（留空则不改）' : 'API Key'" :required="!editingId">
          <el-input v-model="form.apiKey" type="password" show-password placeholder="sk-…" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="form.isDefault" />
        </el-form-item>
      </el-form>
    </AppDialog>
  </section>
</template>
