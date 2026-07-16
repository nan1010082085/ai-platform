<script setup lang="ts">
/**
 * 插件市场 — 浏览和安装插件模板。
 */

import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import FilterTabs from '@schema-platform/platform-shared/components/common/FilterTabs.vue'
import CardTable from '@/components/common/CardTable.vue'
import { request } from '@/api/shared/request'
import styles from './PluginMarketView.module.scss'

interface PluginTemplate {
  id: string
  name: string
  description: string
  category: 'expert' | 'tool' | 'mcp' | 'skill' | 'workflow'
  version: string
  author: string
  icon: string
  downloads: number
  installed: boolean
  tags: string[]
}

type CategoryTab = 'all' | 'expert' | 'tool' | 'mcp' | 'skill' | 'workflow'

const categoryTabs = [
  { label: '全部', value: 'all' as CategoryTab },
  { label: '专家', value: 'expert' as CategoryTab },
  { label: '工具', value: 'tool' as CategoryTab },
  { label: 'MCP Server', value: 'mcp' as CategoryTab },
  { label: '技能', value: 'skill' as CategoryTab },
  { label: '工作流', value: 'workflow' as CategoryTab },
]

const activeCategory = ref<CategoryTab>('all')
const searchInput = ref('')
const loading = ref(false)
const plugins = ref<PluginTemplate[]>([])

const q = computed(() => searchInput.value.trim().toLowerCase())

const filteredPlugins = computed(() =>
  plugins.value.filter((p) => {
    if (activeCategory.value !== 'all' && p.category !== activeCategory.value) return false
    if (!q.value) return true
    return [p.name, p.description, p.author, ...p.tags]
      .filter(Boolean)
      .some((s) => String(s).toLowerCase().includes(q.value))
  }),
)

const installedCount = computed(() => plugins.value.filter((p) => p.installed).length)

async function loadPlugins() {
  loading.value = true
  try {
    plugins.value = await request<PluginTemplate[]>('/plugins/market')
  } catch (err) {
    console.error('Failed to load plugin market:', err)
    ElMessage.error('加载插件市场失败')
  } finally {
    loading.value = false
  }
}

async function installPlugin(plugin: PluginTemplate) {
  try {
    await ElMessageBox.confirm(
      `确定要安装 "${plugin.name}" 吗？`,
      '安装插件',
      { confirmButtonText: '安装', cancelButtonText: '取消', type: 'info' },
    )

    await request(`/plugins/market/${plugin.id}/install`, { method: 'POST' })
    plugin.installed = true
    ElMessage.success(`已安装 ${plugin.name}`)
  } catch (err) {
    if (err !== 'cancel') {
      console.error('Failed to install plugin:', err)
      ElMessage.error('安装失败')
    }
  }
}

async function uninstallPlugin(plugin: PluginTemplate) {
  try {
    await ElMessageBox.confirm(
      `确定要卸载 "${plugin.name}" 吗？`,
      '卸载插件',
      { confirmButtonText: '卸载', cancelButtonText: '取消', type: 'warning' },
    )

    await request(`/plugins/market/${plugin.id}/uninstall`, { method: 'POST' })
    plugin.installed = false
    ElMessage.success(`已卸载 ${plugin.name}`)
  } catch (err) {
    if (err !== 'cancel') {
      console.error('Failed to uninstall plugin:', err)
      ElMessage.error('卸载失败')
    }
  }
}

function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    expert: '专家',
    tool: '工具',
    mcp: 'MCP Server',
    skill: '技能',
    workflow: '工作流',
  }
  return map[category] ?? category
}

function getCategoryIcon(category: string): string {
  const map: Record<string, string> = {
    expert: 'user',
    tool: 'tool',
    mcp: 'connection',
    skill: 'magic-stick',
    workflow: 'share',
  }
  return map[category] ?? 'box'
}

onMounted(() => {
  void loadPlugins()
})
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.scroll">
      <header :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1>插件市场</h1>
            <p :class="styles.subtitle">
              浏览和安装社区插件模板
            </p>
          </div>
          <div :class="styles.headerActions">
            <el-button :loading="loading" @click="loadPlugins">
              <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
              刷新
            </el-button>
          </div>
        </div>

        <div :class="styles.toolbar">
          <FilterTabs v-model="activeCategory" :options="categoryTabs" />
          <el-input
            v-model="searchInput"
            :class="styles.search"
            placeholder="搜索插件名称、作者、标签…"
            clearable
          >
            <template #prefix>
              <AppIcon name="search" :size="14" />
            </template>
          </el-input>
        </div>
      </header>

      <div v-loading="loading" :class="styles.content">
        <div :class="styles.summary">
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">可用插件</div>
            <div :class="styles.summaryValue">{{ plugins.length }}</div>
          </div>
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">已安装</div>
            <div :class="styles.summaryValue">{{ installedCount }}</div>
          </div>
        </div>

        <CardTable>
          <el-table :data="filteredPlugins" stripe>
            <el-table-column label="插件" min-width="200">
              <template #default="{ row }">
                <div :class="styles.pluginInfo">
                  <div :class="styles.pluginIcon">
                    <AppIcon :name="row.icon || getCategoryIcon(row.category)" :size="20" />
                  </div>
                  <div>
                    <div :class="styles.pluginName">{{ row.name }}</div>
                    <div :class="styles.pluginAuthor">{{ row.author }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag size="small" :type="row.category === 'expert' ? 'primary' : 'info'">
                  {{ getCategoryLabel(row.category) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="250" show-overflow-tooltip />
            <el-table-column label="标签" min-width="150">
              <template #default="{ row }">
                <div :class="styles.tagRow">
                  <el-tag v-for="tag in row.tags" :key="tag" size="small" type="info">{{ tag }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="version" label="版本" width="80" />
            <el-table-column prop="downloads" label="下载" width="80" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="!row.installed"
                  type="primary"
                  size="small"
                  @click="installPlugin(row)"
                >
                  安装
                </el-button>
                <el-button
                  v-else
                  type="danger"
                  size="small"
                  plain
                  @click="uninstallPlugin(row)"
                >
                  卸载
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </CardTable>

        <div v-if="!loading && filteredPlugins.length === 0" :class="styles.empty">
          <AppIcon name="box" :size="48" />
          <p>暂无插件</p>
        </div>
      </div>
    </div>
  </div>
</template>
