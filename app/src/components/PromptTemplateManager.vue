<script setup lang="ts">
/**
 * PromptTemplateManager - Prompt 模板管理组件
 *
 * 在 AiChatSettings 中集成，用户可创建/编辑/删除 prompt 模板，
 * 点击模板直接填入聊天输入框。
 */
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import {
  getPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  type PromptTemplate,
} from '@/api/aiApi/llm'

const emit = defineEmits<{
  select: [content: string]
}>()

const templates = ref<PromptTemplate[]>([])
const loading = ref(false)
const editingId = ref<string | null>(null)
const formVisible = ref(false)
const form = ref({ title: '', content: '', category: '通用' })

const categories = computed(() => {
  const set = new Set(templates.value.map((t) => t.category))
  return Array.from(set).sort()
})

async function load() {
  loading.value = true
  try {
    templates.value = await getPromptTemplates()
  } catch { /* ignore */ }
  loading.value = false
}

onMounted(load)

function openCreate() {
  editingId.value = null
  form.value = { title: '', content: '', category: '通用' }
  formVisible.value = true
}

function openEdit(t: PromptTemplate) {
  editingId.value = t.id
  form.value = { title: t.title, content: t.content, category: t.category }
  formVisible.value = true
}

async function handleSave() {
  if (!form.value.title.trim() || !form.value.content.trim()) {
    ElMessage.warning('标题和内容必填')
    return
  }
  try {
    if (editingId.value) {
      await updatePromptTemplate(editingId.value, form.value)
      ElMessage.success('已更新')
    } else {
      await createPromptTemplate(form.value)
      ElMessage.success('已创建')
    }
    formVisible.value = false
    await load()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '操作失败')
  }
}

async function handleDelete(t: PromptTemplate) {
  try {
    await ElMessageBox.confirm(`确定删除模板「${t.title}」？`, '删除模板', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deletePromptTemplate(t.id)
    ElMessage.success('已删除')
    await load()
  } catch {
    // user cancelled
  }
}

function handleSelect(t: PromptTemplate) {
  emit('select', t.content)
}
</script>

<template>
  <div :class="$style.root">
    <div :class="$style.header">
      <span :class="$style.title">Prompt 模板</span>
      <el-button size="small" link type="primary" @click="openCreate">
        <AppIcon name="plus" :size="14" style="margin-right: 2px" />
        新建
      </el-button>
    </div>

    <div v-if="!templates.length && !loading" :class="$style.empty">
      暂无模板，点击「新建」创建
    </div>

    <div v-else :class="$style.list">
      <div v-for="t in templates" :key="t.id" :class="$style.item">
        <div :class="$style.itemInfo" @click="handleSelect(t)">
          <span :class="$style.itemTitle">{{ t.title }}</span>
          <el-tag size="small" type="info">{{ t.category }}</el-tag>
        </div>
        <div :class="$style.itemActions">
          <el-button size="small" link @click="openEdit(t)">
            <AppIcon name="edit" :size="14" />
          </el-button>
          <el-button size="small" link type="danger" @click="handleDelete(t)">
            <AppIcon name="delete" :size="14" />
          </el-button>
        </div>
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑模板' : '新建模板'"
      width="480px"
      :close-on-click-modal="false"
    >
      <div :class="$style.form">
        <el-input v-model="form.title" placeholder="模板标题" size="small" />
        <el-select v-model="form.category" size="small" allow-create filterable placeholder="分类">
          <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          <el-option label="通用" value="通用" />
          <el-option label="开发" value="开发" />
          <el-option label="写作" value="写作" />
        </el-select>
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="6"
          placeholder="Prompt 内容"
        />
      </div>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">
          {{ editingId ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style module>
.root {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.empty {
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}

.item:hover {
  background: var(--el-fill-color-light, #f5f7fa);
}

.itemInfo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.itemTitle {
  font-size: 13px;
  color: var(--el-text-color-primary, #303133);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.itemActions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
