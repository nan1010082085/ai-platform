<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import FilterTabs from '@schema-platform/platform-shared/components/common/FilterTabs.vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import type { AgentWorkflowSummary } from '@/types/agentWorkflow'
import * as api from '@/api/agentWorkflowApi'
import styles from './AgentWorkflowListView.module.scss'

const router = useRouter()
const loading = ref(false)
const workflows = ref<AgentWorkflowSummary[]>([])
const searchInput = ref('')
const activeTab = ref('all')
const sortBy = ref<'updated' | 'name'>('updated')
const publishingId = ref<string | null>(null)

const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
]

const sortOptions = [
  { label: '最近更新', value: 'updated' },
  { label: '名称', value: 'name' },
]

async function load() {
  loading.value = true
  try {
    workflows.value = await api.listWorkflows()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function matchesSearch(w: AgentWorkflowSummary): boolean {
  const q = searchInput.value.trim().toLowerCase()
  if (!q) return true
  return w.name.toLowerCase().includes(q)
}

const filteredWorkflows = computed(() => {
  let list = workflows.value
  if (activeTab.value !== 'all') {
    list = list.filter((w) => w.status === activeTab.value)
  }
  list = list.filter(matchesSearch)
  if (sortBy.value === 'name') {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'zh'))
  } else {
    list = [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }
  return list
})

const isEmpty = computed(() => !loading.value && workflows.value.length === 0)
const isNoResults = computed(
  () => !loading.value && workflows.value.length > 0 && filteredWorkflows.value.length === 0,
)

async function onCreate() {
  try {
    const { value } = await ElMessageBox.prompt('工作流名称', '新建 Agent 工作流', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputValue: '我的工作流',
    })
    const wf = await api.createWorkflow(value.trim())
    router.push({ name: 'agent-workflow-designer', params: { id: wf.id } })
  } catch {
    // cancelled
  }
}

function onEdit(id: string) {
  router.push({ name: 'agent-workflow-designer', params: { id } })
}

function onExecutions(id: string) {
  router.push({ name: 'agent-workflow-executions', params: { id } })
}

async function onPublish(id: string) {
  publishingId.value = id
  try {
    const res = await api.publishWorkflow(id)
    ElMessage.success(`已发布 v${res.version}`)
    await load()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '发布失败')
  } finally {
    publishingId.value = null
  }
}

async function onDelete(id: string) {
  try {
    await ElMessageBox.confirm('确定删除此工作流？删除后不可恢复。', '删除', { type: 'warning' })
  } catch {
    return
  }
  try {
    await api.deleteWorkflow(id)
    ElMessage.success('已删除')
    await load()
  } catch (e) {
    message.error(e instanceof Error ? e.message : '删除失败')
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatVersion(v: string): string {
  if (!v || v.length !== 14) return v
  return `${v.slice(0, 8)}.${v.slice(8, 10)}${v.slice(10, 12)}`
}

onMounted(load)
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.scroll">
      <!-- Header -->
      <div :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1>Agent 编排</h1>
            <p :class="styles.subtitle">可视化编排 AI 工作流</p>
          </div>
          <div :class="styles.headerActions">
            <el-button type="primary" @click="onCreate">
              <AppIcon name="plus" class="el-icon--left" :size="14" />新建
            </el-button>
          </div>
        </div>

        <!-- Filter bar -->
        <div :class="styles.toolbar">
          <FilterTabs v-model="activeTab" :options="filterTabs" />
          <div :class="styles.toolbarRight">
            <el-input
              v-model="searchInput"
              placeholder="搜索名称..."
              clearable
              :class="styles.search"
            >
              <template #prefix><AppIcon name="search" :size="14" /></template>
            </el-input>
            <el-dropdown @command="(cmd: string) => (sortBy = cmd as 'updated' | 'name')">
              <el-button size="small">
                <AppIcon name="sort" class="el-icon--left" :size="14" />
                {{ sortOptions.find((s) => s.value === sortBy)?.label }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="s in sortOptions"
                    :key="s.value"
                    :command="s.value"
                  >
                    {{ s.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading && workflows.length === 0" :class="styles.content">
        <div :class="styles.skeleton">
          <div v-for="i in 6" :key="i" :class="styles.skeletonCard">
            <div :class="styles.skeletonPreview" />
            <div :class="styles.skeletonTitle" />
            <div :class="styles.skeletonText" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="isEmpty" :class="styles.emptyState">
        <div :class="styles.emptyIcon">
          <AppIcon name="set-up" :size="64" />
        </div>
        <h2 :class="styles.emptyTitle">还没有 Agent 工作流</h2>
        <p :class="styles.emptyDesc">创建您的第一个工作流来开始编排 AI 节点</p>
        <div :class="styles.emptyActions">
          <el-button type="primary" size="large" @click="onCreate">
            <AppIcon name="plus" class="el-icon--left" :size="14" />创建工作流
          </el-button>
        </div>
      </div>

      <!-- No results -->
      <div v-else-if="isNoResults" :class="styles.noResults">
        <p>未找到匹配的工作流</p>
        <el-button @click="activeTab = 'all'; searchInput = ''">清除筛选</el-button>
      </div>

      <!-- Card grid -->
      <div v-else :class="styles.content">
        <div :class="styles.cards">
          <div
            v-for="(item, idx) in filteredWorkflows"
            :key="item.id"
            :class="styles.card"
            :style="{ animationDelay: `${idx * 0.04}s` }"
          >
            <div :class="styles.cardPreview" @click="onEdit(item.id)">
              <div :class="styles.cardPreviewInner">
                <AppIcon name="share" :size="32" />
              </div>
            </div>
            <div :class="styles.cardBody">
              <h3 :class="styles.cardName">{{ item.name }}</h3>
              <div :class="styles.cardMeta">
                <el-tag size="small" :type="item.status === 'published' ? 'success' : 'info'">
                  {{ item.status === 'published' ? '已发布' : '草稿' }}
                </el-tag>
                <span v-if="item.publishedVersion" :class="styles.cardVersion">
                  v{{ formatVersion(item.publishedVersion) }}
                </span>
                <span :class="styles.cardDate">{{ formatDate(item.updatedAt) }}</span>
              </div>
            </div>
            <div :class="styles.cardActions">
              <el-tooltip content="编辑" placement="top" :show-after="300">
                <el-button size="small" text type="primary" @click="onEdit(item.id)">
                  <AppIcon name="edit" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="执行记录" placement="top" :show-after="300">
                <el-button size="small" text @click="onExecutions(item.id)">
                  <AppIcon name="list" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="发布" placement="top" :show-after="300">
                <el-button
                  size="small"
                  text
                  type="success"
                  :loading="publishingId === item.id"
                  :disabled="publishingId !== null"
                  @click="onPublish(item.id)"
                >
                  <AppIcon name="promotion" />
                </el-button>
              </el-tooltip>
              <el-tooltip
                :content="item.hasRunningExecution ? '执行中，不允许删除' : '删除'"
                placement="top"
                :show-after="300"
              >
                <span>
                  <el-button
                    size="small"
                    text
                    type="danger"
                    :disabled="item.hasRunningExecution"
                    @click="onDelete(item.id)"
                  >
                    <AppIcon name="delete" />
                  </el-button>
                </span>
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
