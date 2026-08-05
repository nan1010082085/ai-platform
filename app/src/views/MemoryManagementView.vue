<script setup lang="ts">
/**
 * MemoryManagementView - 长程记忆管理
 *
 * 列出当前用户的跨会话长程记忆（preference/fact/event/skill），支持按 namespace 过滤、
 * 关键词搜索、删除单条、以及召回测试（验证记忆检索质量）。
 *
 * 与 RAG 知识库的区别：RAG 管理知识文档索引；本页管理用户个性化记忆（由 memory-* 节点 / chat 沉淀）。
 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PageShell from '@/components/common/PageShell.vue'
import { useAuthStore } from '@schema-platform/platform-shared/utils/stores/authStore'
import { listMemory, deleteMemory, recallMemory, type MemoryItem, type MemoryNamespace } from '@/api/aiApi'

const authStore = useAuthStore()
const userId = computed(() => authStore.user?.id ?? authStore.user?.userId ?? '')

const loading = ref(false)
const memories = ref<MemoryItem[]>([])
const namespaceFilter = ref<'all' | MemoryNamespace>('all')
const keyword = ref('')

// 召回测试
const recallQuery = ref('')
const recallResults = ref<MemoryItem[]>([])
const recalling = ref(false)

const NAMESPACES: Array<{ value: MemoryNamespace; label: string; tag: string }> = [
  { value: 'preference', label: '偏好', tag: 'primary' },
  { value: 'fact', label: '事实', tag: 'success' },
  { value: 'event', label: '事件', tag: 'warning' },
  { value: 'skill', label: '技能', tag: 'info' },
]

const stats = computed(() => {
  const byNs: Record<string, number> = { preference: 0, fact: 0, event: 0, skill: 0 }
  for (const m of memories.value) byNs[m.namespace] = (byNs[m.namespace] ?? 0) + 1
  return { total: memories.value.length, ...byNs }
})

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return memories.value.filter((m) => {
    if (namespaceFilter.value !== 'all' && m.namespace !== namespaceFilter.value) return false
    if (kw && !m.content.toLowerCase().includes(kw)) return false
    return true
  })
})

async function load() {
  if (!userId.value) {
    ElMessage.warning('未获取到用户信息')
    return
  }
  loading.value = true
  try {
    memories.value = await listMemory(userId.value)
  } catch (err) {
    ElMessage.error('加载记忆失败')
    console.error('[memory] load failed', err)
  } finally {
    loading.value = false
  }
}

async function remove(item: MemoryItem) {
  try {
    await ElMessageBox.confirm(`确定删除该记忆？\n${item.content.slice(0, 60)}`, '删除记忆', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await deleteMemory(item.id)
    memories.value = memories.value.filter((m) => m.id !== item.id)
    ElMessage.success('已删除')
  } catch (err) {
    ElMessage.error('删除失败')
    console.error('[memory] delete failed', err)
  }
}

async function runRecall() {
  const q = recallQuery.value.trim()
  if (!q) {
    ElMessage.warning('请输入检索 query')
    return
  }
  recalling.value = true
  try {
    recallResults.value = await recallMemory({
      query: q,
      userId: userId.value,
      namespace: namespaceFilter.value === 'all' ? 'all' : namespaceFilter.value,
      limit: 10,
    })
  } catch (err) {
    ElMessage.error('检索失败')
    console.error('[memory] recall failed', err)
  } finally {
    recalling.value = false
  }
}

function nsTag(ns: MemoryNamespace): string {
  return NAMESPACES.find((n) => n.value === ns)?.tag ?? 'info'
}

function nsLabel(ns: MemoryNamespace): string {
  return NAMESPACES.find((n) => n.value === ns)?.label ?? ns
}

function formatTime(s?: string): string {
  if (!s) return '-'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('zh-CN', { hour12: false })
}

onMounted(load)
</script>

<template>
  <PageShell>
    <div class="memory-view">
    <PageHeader title="长程记忆" subtitle="用户的跨会话长程记忆：由 memory-* 节点与 chat 自动沉淀，按 namespace 分类，可被 memory-recall 召回">
      <template #actions>
        <el-button :loading="loading" @click="load">
          <AppIcon name="refresh" :size="14" /> 刷新
        </el-button>
      </template>
    </PageHeader>

    <!-- 统计卡片 -->
    <div class="stats">
      <div class="stat-card"><div class="stat-num">{{ stats.total }}</div><div class="stat-label">总计</div></div>
      <div v-for="ns in NAMESPACES" :key="ns.value" class="stat-card">
        <div class="stat-num">{{ stats[ns.value] ?? 0 }}</div>
        <div class="stat-label">{{ ns.label }}</div>
      </div>
    </div>

    <!-- 召回测试 -->
    <el-card shadow="never" class="recall-panel">
      <template #header><span class="panel-title">召回测试</span></template>
      <div class="recall-row">
        <el-input v-model="recallQuery" placeholder="输入检索 query，验证记忆召回质量" @keyup.enter="runRecall" />
        <el-button type="primary" :loading="recalling" @click="runRecall">检索</el-button>
      </div>
      <div v-if="recallResults.length" class="recall-results">
        <div v-for="(m, i) in recallResults" :key="m.id" class="recall-item">
          <el-tag :type="nsTag(m.namespace)" size="small">{{ nsLabel(m.namespace) }}</el-tag>
          <span class="recall-rank">{{ i + 1 }}.</span>
          <span class="recall-content">{{ m.content }}</span>
        </div>
      </div>
      <div v-else-if="recallQuery && !recalling" class="empty">无召回结果</div>
    </el-card>

    <!-- 记忆列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="list-header">
          <span class="panel-title">记忆列表（{{ filtered.length }}）</span>
          <div class="filter-row">
            <el-select v-model="namespaceFilter" size="small" style="width: 120px">
              <el-option label="全部类型" value="all" />
              <el-option v-for="ns in NAMESPACES" :key="ns.value" :label="ns.label" :value="ns.value" />
            </el-select>
            <el-input v-model="keyword" size="small" placeholder="搜索内容" clearable style="width: 200px" />
          </div>
        </div>
      </template>

      <el-table :data="filtered" :loading="loading" empty-text="暂无记忆" row-key="id">
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="nsTag(row.namespace)" size="small">{{ nsLabel(row.namespace) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="内容" prop="content" min-width="280" show-overflow-tooltip />
        <el-table-column label="重要性" width="90" prop="importance" />
        <el-table-column label="访问次数" width="90" prop="accessCount" />
        <el-table-column label="最后访问" width="160">
          <template #default="{ row }">{{ formatTime(row.lastAccessedAt) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    </div>
  </PageShell>
</template>

<style scoped>
.memory-view { display: flex; flex-direction: column; gap: 16px; }
.stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.stat-card { background: var(--el-bg-color, #fff); border: 1px solid var(--el-border-color-light, #ebeef5); border-radius: 8px; padding: 16px; text-align: center; }
.stat-num { font-size: 24px; font-weight: 600; color: var(--el-color-primary, #409eff); }
.stat-label { font-size: 12px; color: var(--el-text-color-secondary, #909399); margin-top: 4px; }
.recall-panel :deep(.el-card__body) { padding: 16px; }
.recall-row { display: flex; gap: 8px; }
.recall-results { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.recall-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.recall-rank { color: var(--el-text-color-secondary); min-width: 20px; }
.recall-content { flex: 1; }
.panel-title { font-weight: 600; }
.list-header { display: flex; justify-content: space-between; align-items: center; }
.filter-row { display: flex; gap: 8px; }
.empty { color: var(--el-text-color-secondary); font-size: 13px; margin-top: 12px; }
</style>
