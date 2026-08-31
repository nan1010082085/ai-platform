<script setup lang="ts">
import { PageShell, PageHeader } from '@apform-ui/core'
/**
 * WorkflowTemplateManagerView - 工作流模板管理
 *
 * 左侧卡片网格（按分类分组 + 搜索）+ 右侧详情面板（graph 预览 + 元信息）。
 * 操作：新建（抽屉表单）、编辑、删除（内置不可删）、导入、导出。
 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { useAiLocale } from '@/composables/useAiLocale'
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  exportTemplate,
  importTemplate,
  type WorkflowTemplate,
  type WorkflowTemplateCategory,
  type WorkflowTemplateInput,
} from '@/api/aiApi'
import { resolveErrorText } from '@/constants/errorCodes'
import styles from './WorkflowTemplateManagerView.module.scss'

const { t } = useAiLocale()

const CATEGORY_LABELS: Record<string, string> = {
  general: '通用',
  document: '文档',
  assistant: '助手',
  integration: '集成',
  batch: '批处理',
  'customer-service': '客服',
  audit: '审计',
  hr: '人力资源',
  finance: '财务',
  operations: '运营',
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))

const loading = ref(false)
const templates = ref<WorkflowTemplate[]>([])
const selectedId = ref<string | null>(null)
const selectedTemplate = ref<WorkflowTemplate | null>(null)
const detailLoading = ref(false)

const searchQuery = ref('')
const categoryFilter = ref('all')

// ── Drawer 编辑状态 ──
const drawerVisible = ref(false)
const editing = ref(false)
const form = ref({
  templateId: '',
  name: '',
  description: '',
  category: 'general' as WorkflowTemplateCategory,
  icon: '',
  tags: '' as string,
  graph: '',
})
const saving = ref(false)
const formError = ref('')

const filteredTemplates = computed(() => {
  let list = templates.value
  if (categoryFilter.value !== 'all') {
    list = list.filter((tp) => tp.category === categoryFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      (tp) =>
        tp.name.toLowerCase().includes(q) ||
        tp.description.toLowerCase().includes(q) ||
        tp.templateId.toLowerCase().includes(q),
    )
  }
  return list
})

/** 按分类分组 */
const groupedTemplates = computed(() => {
  const groups: Record<string, WorkflowTemplate[]> = {}
  for (const tp of filteredTemplates.value) {
    const cat = tp.category
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(tp)
  }
  // 按 CATEGORY_LABELS 定义顺序排列
  return Object.keys(CATEGORY_LABELS)
    .filter((cat) => groups[cat]?.length)
    .map((cat) => ({ category: cat, label: CATEGORY_LABELS[cat], items: groups[cat] }))
})

// ── graph 统计 ──
function graphStats(graph: Record<string, unknown>): { nodes: number; edges: number } {
  const nodes = Array.isArray(graph.nodes) ? (graph.nodes as unknown[]).length : 0
  const edges = Array.isArray(graph.edges) ? (graph.edges as unknown[]).length : 0
  return { nodes, edges }
}

function graphPreview(graph: Record<string, unknown>): string {
  const json = JSON.stringify(graph, null, 2)
  return json.length > 3000 ? json.slice(0, 3000) + '\n…（已截断）' : json
}

// ── 加载 ──
async function loadTemplates() {
  loading.value = true
  try {
    templates.value = await listTemplates()
    // 选中第一个模板用于展示详情
    if (templates.value.length > 0 && !selectedId.value) {
      await selectTemplate(templates.value[0])
    }
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '加载模板失败'))
  } finally {
    loading.value = false
  }
}

async function selectTemplate(tp: WorkflowTemplate) {
  selectedId.value = tp.templateId
  detailLoading.value = true
  try {
    // 列表项可能不含完整 graph，拉详情
    selectedTemplate.value = await getTemplate(tp.templateId)
  } catch (err) {
    // 详情拉取失败时降级用列表数据
    selectedTemplate.value = tp
    ElMessage.warning(resolveErrorText(err, '加载详情失败，显示基本信息'))
  } finally {
    detailLoading.value = false
  }
}

// ── 新建 / 编辑 ──
function openNew() {
  editing.value = false
  form.value = {
    templateId: '',
    name: '',
    description: '',
    category: 'general',
    icon: '',
    tags: '',
    graph: JSON.stringify({ nodes: [], edges: [] }, null, 2),
  }
  formError.value = ''
  drawerVisible.value = true
}

function openEdit(tp: WorkflowTemplate) {
  editing.value = true
  form.value = {
    templateId: tp.templateId,
    name: tp.name,
    description: tp.description,
    category: tp.category,
    icon: tp.icon ?? '',
    tags: (tp.tags ?? []).join(', '),
    graph: JSON.stringify(tp.graph ?? {}, null, 2),
  }
  formError.value = ''
  drawerVisible.value = true
}

async function save() {
  if (!form.value.name.trim()) {
    formError.value = '请输入模板名称'
    return
  }
  if (!editing.value && !form.value.templateId.trim()) {
    formError.value = '请输入模板 ID'
    return
  }
  let parsedGraph: Record<string, unknown>
  try {
    parsedGraph = JSON.parse(form.value.graph)
  } catch {
    formError.value = 'Graph JSON 格式无效'
    return
  }
  if (!parsedGraph || typeof parsedGraph !== 'object') {
    formError.value = 'Graph 必须是 JSON 对象'
    return
  }

  const tags = form.value.tags
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await updateTemplate(form.value.templateId, {
        name: form.value.name.trim(),
        description: form.value.description,
        category: form.value.category,
        icon: form.value.icon,
        tags,
        graph: parsedGraph,
      })
      ElMessage.success('模板已更新')
    } else {
      const input: WorkflowTemplateInput = {
        templateId: form.value.templateId.trim(),
        name: form.value.name.trim(),
        description: form.value.description,
        category: form.value.category,
        icon: form.value.icon,
        tags,
        graph: parsedGraph,
      }
      await createTemplate(input)
      ElMessage.success('模板已创建')
    }
    drawerVisible.value = false
    await loadTemplates()
  } catch (err) {
    formError.value = resolveErrorText(err, '保存失败')
  } finally {
    saving.value = false
  }
}

// ── 删除 ──
async function remove(tp: WorkflowTemplate) {
  if (tp.builtin) {
    ElMessage.warning('内置模板不可删除')
    return
  }
  try {
    await ElMessageBox.confirm(`确认删除模板「${tp.name}」？`, '删除', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteTemplate(tp.templateId)
    ElMessage.success('已删除')
    if (selectedId.value === tp.templateId) {
      selectedId.value = null
      selectedTemplate.value = null
    }
    await loadTemplates()
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '删除失败'))
  }
}

// ── 导出 ──
async function exportTpl(tp: WorkflowTemplate) {
  try {
    const data = await exportTemplate(tp.templateId)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tp.templateId}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('已导出')
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '导出失败'))
  }
}

// ── 导入 ──
function triggerImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as WorkflowTemplateInput
      if (!data.templateId || !data.name || !data.graph) {
        ElMessage.warning('导入文件缺少必填字段（templateId / name / graph）')
        return
      }
      await importTemplate({
        templateId: data.templateId,
        name: data.name,
        description: data.description ?? '',
        category: data.category ?? 'general',
        icon: data.icon ?? '',
        tags: data.tags ?? [],
        graph: data.graph,
      })
      ElMessage.success('模板已导入')
      await loadTemplates()
    } catch (err) {
      ElMessage.error(resolveErrorText(err, '导入失败'))
    }
  }
  input.click()
}

onMounted(() => {
  loadTemplates()
})
</script>

<template>
  <PageShell fill>
      <PageHeader
        :title="t('workflowTemplates.title')"
        :subtitle="t('workflowTemplates.subtitle')"
      >
        <template #actions>
          <el-button size="small" @click="triggerImport">
            <AppIcon name="upload" :size="14" />
            {{ t('workflowTemplates.import') }}
          </el-button>
          <el-button type="primary" size="small" @click="openNew">
            <AppIcon name="plus" :size="14" />
            {{ t('workflowTemplates.create') }}
          </el-button>
        </template>
      </PageHeader>

      <div :class="styles.toolbar">
        <el-input
          v-model="searchQuery"
          :placeholder="t('workflowTemplates.searchPlaceholder')"
          clearable
          size="small"
          :class="styles.searchInput"
        >
          <template #prefix>
            <AppIcon name="search" :size="14" />
          </template>
        </el-input>
        <el-select
          v-model="categoryFilter"
          size="small"
          style="width: 140px"
        >
          <el-option label="全部分类" value="all" />
          <el-option
            v-for="opt in CATEGORY_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <div :class="styles.body">
        <!-- 左侧：模板列表 -->
        <div :class="styles.listSection" v-loading="loading">
          <div v-if="filteredTemplates.length === 0 && !loading" :class="styles.empty">
            <AppIcon name="document-checked" :size="36" :class="styles.emptyIcon" />
            <p>{{ t('workflowTemplates.empty') }}</p>
          </div>

          <div
            v-for="group in groupedTemplates"
            :key="group.category"
            :class="styles.categoryGroup"
          >
            <h3 :class="styles.categoryTitle">
              <AppIcon name="folder" :size="14" />
              {{ group.label }}
              <span :class="styles.categoryCount">（{{ group.items.length }}）</span>
            </h3>
            <div :class="styles.cardGrid">
              <div
                v-for="tp in group.items"
                :key="tp.id"
                :class="[styles.card, selectedId === tp.templateId && styles.cardActive]"
                @click="selectTemplate(tp)"
              >
                <div :class="styles.cardHead">
                  <AppIcon :name="tp.icon || 'document-checked'" :size="18" :class="styles.cardIcon" />
                  <span :class="styles.cardName">{{ tp.name }}</span>
                  <el-tag v-if="tp.builtin" size="small" type="warning" :class="styles.builtinTag">
                    {{ t('workflowTemplates.builtin') }}
                  </el-tag>
                </div>
                <div :class="styles.cardDesc">{{ tp.description || t('workflowTemplates.noDesc') }}</div>
                <div :class="styles.cardMeta">
                  <el-tag v-if="tp.tags?.length" size="small" type="info">
                    {{ tp.tags[0] }}{{ tp.tags.length > 1 ? ` +${tp.tags.length - 1}` : '' }}
                  </el-tag>
                  <span :class="styles.cardTime">{{ new Date(tp.updatedAt).toLocaleDateString() }}</span>
                </div>
                <div :class="styles.cardActions">
                  <el-button link type="primary" size="small" @click.stop="selectTemplate(tp); openEdit(tp)">
                    {{ t('workflowTemplates.edit') }}
                  </el-button>
                  <el-button link type="primary" size="small" @click.stop="exportTpl(tp)">
                    {{ t('workflowTemplates.export') }}
                  </el-button>
                  <el-button
                    link
                    type="danger"
                    size="small"
                    :disabled="tp.builtin"
                    @click.stop="remove(tp)"
                  >
                    {{ t('workflowTemplates.delete') }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：详情面板 -->
        <div :class="styles.detailPanel" v-loading="detailLoading">
          <div v-if="!selectedTemplate" :class="styles.detailEmpty">
            <AppIcon name="document-checked" :size="36" :class="styles.detailEmptyIcon" />
            <p>{{ t('workflowTemplates.selectHint') }}</p>
          </div>

          <template v-else>
            <div :class="styles.detailHead">
              <AppIcon
                :name="selectedTemplate.icon || 'document-checked'"
                :size="20"
                :class="styles.cardIcon"
              />
              <span :class="styles.detailName">{{ selectedTemplate.name }}</span>
              <el-tag v-if="selectedTemplate.builtin" size="small" type="warning">
                {{ t('workflowTemplates.builtin') }}
              </el-tag>
            </div>

            <div :class="styles.detailDesc">
              {{ selectedTemplate.description || t('workflowTemplates.noDesc') }}
            </div>

            <div :class="styles.detailMeta">
              <div :class="styles.metaRow">
                <span :class="styles.metaLabel">ID</span>
                <span :class="styles.metaValue">{{ selectedTemplate.templateId }}</span>
              </div>
              <div :class="styles.metaRow">
                <span :class="styles.metaLabel">{{ t('workflowTemplates.category') }}</span>
                <span :class="styles.metaValue">{{ CATEGORY_LABELS[selectedTemplate.category] ?? selectedTemplate.category }}</span>
              </div>
              <div :class="styles.metaRow">
                <span :class="styles.metaLabel">{{ t('workflowTemplates.tags') }}</span>
                <span :class="styles.metaValue">
                  <el-tag v-for="tag in (selectedTemplate.tags ?? [])" :key="tag" size="small" type="info" style="margin-right: 4px">
                    {{ tag }}
                  </el-tag>
                  <span v-if="!selectedTemplate.tags?.length" style="color: var(--el-text-color-placeholder)">—</span>
                </span>
              </div>
              <div :class="styles.metaRow">
                <span :class="styles.metaLabel">{{ t('workflowTemplates.createdBy') }}</span>
                <span :class="styles.metaValue">{{ selectedTemplate.createdBy }}</span>
              </div>
              <div :class="styles.metaRow">
                <span :class="styles.metaLabel">{{ t('workflowTemplates.updatedAt') }}</span>
                <span :class="styles.metaValue">{{ new Date(selectedTemplate.updatedAt).toLocaleString() }}</span>
              </div>
            </div>

            <div :class="styles.graphSection">
              <h4 :class="styles.graphTitle">{{ t('workflowTemplates.graphPreview') }}</h4>
              <div :class="styles.graphStats">
                <span :class="styles.graphStat">
                  <AppIcon name="connection" :size="12" />
                  {{ t('workflowTemplates.nodes', { count: graphStats(selectedTemplate.graph).nodes }) }}
                </span>
                <span :class="styles.graphStat">
                  <AppIcon name="rank" :size="12" />
                  {{ t('workflowTemplates.edges', { count: graphStats(selectedTemplate.graph).edges }) }}
                </span>
              </div>
              <pre :class="styles.graphPreview">{{ graphPreview(selectedTemplate.graph) }}</pre>
            </div>

            <div :class="styles.detailActions">
              <el-button size="small" @click="openEdit(selectedTemplate)">
                <AppIcon name="edit" :size="14" />
                {{ t('workflowTemplates.edit') }}
              </el-button>
              <el-button size="small" @click="exportTpl(selectedTemplate)">
                <AppIcon name="download" :size="14" />
                {{ t('workflowTemplates.export') }}
              </el-button>
              <el-button
                size="small"
                type="danger"
                :disabled="selectedTemplate.builtin"
                @click="remove(selectedTemplate)"
              >
                <AppIcon name="delete" :size="14" />
                {{ t('workflowTemplates.delete') }}
              </el-button>
            </div>
          </template>
        </div>
      </div>
  </PageShell>

  <!-- 抽屉放在 PageShell 外，避免 fill 末子 flex:1 落到 drawer 上 -->
  <el-drawer
    v-model="drawerVisible"
    :title="editing ? t('workflowTemplates.editTitle') : t('workflowTemplates.createTitle')"
    size="60%"
  >
    <div :class="styles.drawerBody">
      <div :class="styles.formRow">
        <label :class="styles.formLabel">{{ t('workflowTemplates.fieldTemplateId') }}</label>
        <el-input
          v-model="form.templateId"
          :placeholder="t('workflowTemplates.fieldTemplateIdPlaceholder')"
          :disabled="editing"
          size="small"
        />
        <span :class="styles.formHint">{{ t('workflowTemplates.fieldTemplateIdHint') }}</span>
      </div>

      <div :class="styles.formRow">
        <label :class="styles.formLabel">{{ t('workflowTemplates.fieldName') }}</label>
        <el-input v-model="form.name" :placeholder="t('workflowTemplates.fieldNamePlaceholder')" size="small" />
      </div>

      <div :class="styles.formRow">
        <label :class="styles.formLabel">{{ t('workflowTemplates.fieldDescription') }}</label>
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          :placeholder="t('workflowTemplates.fieldDescriptionPlaceholder')"
        />
      </div>

      <div :class="styles.formRow">
        <label :class="styles.formLabel">{{ t('workflowTemplates.fieldCategory') }}</label>
        <el-select v-model="form.category" size="small" style="width: 200px">
          <el-option
            v-for="opt in CATEGORY_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>

      <div :class="styles.formRow">
        <label :class="styles.formLabel">{{ t('workflowTemplates.fieldIcon') }}</label>
        <el-input v-model="form.icon" :placeholder="t('workflowTemplates.fieldIconPlaceholder')" size="small" />
        <span :class="styles.formHint">{{ t('workflowTemplates.fieldIconHint') }}</span>
      </div>

      <div :class="styles.formRow">
        <label :class="styles.formLabel">{{ t('workflowTemplates.fieldTags') }}</label>
        <el-input v-model="form.tags" :placeholder="t('workflowTemplates.fieldTagsPlaceholder')" size="small" />
      </div>

      <div :class="styles.formRow">
        <label :class="styles.formLabel">{{ t('workflowTemplates.fieldGraph') }}</label>
        <el-input
          v-model="form.graph"
          type="textarea"
          :rows="16"
          :placeholder="'{&quot;nodes&quot;: [], &quot;edges&quot;: []}'"
          :class="styles.graphEditor"
        />
        <span :class="styles.formHint">{{ t('workflowTemplates.fieldGraphHint') }}</span>
      </div>

      <div v-if="formError" style="color: var(--el-color-danger); font-size: 13px">{{ formError }}</div>

      <div :class="styles.drawerFooter">
        <el-button @click="drawerVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="save">
          {{ t('common.confirm') }}
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>
