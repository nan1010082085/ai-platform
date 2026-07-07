<script setup lang="ts">
/**
 * 插件中心 — 只读浏览服务端 Registry（Expert / Tool / MCP / Skill）。
 * 配置变更通过 Git / config/plugins 或 plugin:install 完成。
 */

import { ref, computed, onMounted } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import FilterTabs from '@schema-platform/platform-shared/components/common/FilterTabs.vue'
import { usePluginRegistry } from '@/composables/usePluginRegistry'
import styles from './PluginCenterView.module.scss'

type Tab = 'experts' | 'tools' | 'mcp' | 'skills'

const tabs = [
  { label: '专家', value: 'experts' as Tab },
  { label: '工具', value: 'tools' as Tab },
  { label: 'MCP', value: 'mcp' as Tab },
  { label: '技能', value: 'skills' as Tab },
]

const activeTab = ref<Tab>('experts')
const searchInput = ref('')
const { experts, skills, tools, mcpServers, loading, error, load, expertColor } = usePluginRegistry()

const q = computed(() => searchInput.value.trim().toLowerCase())

const filteredExperts = computed(() =>
  experts.value.filter((e) => {
    if (!q.value) return true
    return [e.id, e.label, e.description, e.legacyAgentKey, ...(e.tools ?? [])]
      .filter(Boolean)
      .some((s) => String(s).toLowerCase().includes(q.value))
  }),
)

const filteredTools = computed(() =>
  tools.value.filter((t) => {
    if (!q.value) return true
    return [t.name, t.kind, t.source, t.description, t.argsHint]
      .filter(Boolean)
      .some((s) => String(s).toLowerCase().includes(q.value))
  }),
)

const filteredMcp = computed(() =>
  mcpServers.value.filter((s) => {
    if (!q.value) return true
    return [s.id, s.transport, s.builtin, s.namespace]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q.value))
  }),
)

const filteredSkills = computed(() =>
  skills.value.filter((s) => {
    if (!q.value) return true
    return [s.id, s.label, ...(s.tools ?? [])]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q.value))
  }),
)

onMounted(() => {
  void load()
})
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.scroll">
      <header :class="styles.header">
        <div :class="styles.titleRow">
          <div>
            <h1>插件中心</h1>
            <p :class="styles.subtitle">只读浏览服务端 Registry；编辑请修改 server/config/plugins 或通过 plugin:pack 分发</p>
          </div>
          <div :class="styles.headerActions">
            <el-button :loading="loading" @click="load">
              <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
              刷新
            </el-button>
          </div>
        </div>

        <div :class="styles.toolbar">
          <FilterTabs v-model="activeTab" :tabs="tabs" />
          <el-input
            v-model="searchInput"
            :class="styles.search"
            placeholder="搜索 id / 名称 / 工具…"
            clearable
          >
            <template #prefix>
              <AppIcon name="search" :size="14" />
            </template>
          </el-input>
        </div>
      </header>

      <div v-if="error" :class="styles.error">{{ error }}</div>

      <div v-else v-loading="loading" :class="styles.content">
        <div :class="styles.summary">
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">专家</div>
            <div :class="styles.summaryValue">{{ experts.length }}</div>
          </div>
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">工具</div>
            <div :class="styles.summaryValue">{{ tools.length }}</div>
          </div>
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">MCP Server</div>
            <div :class="styles.summaryValue">{{ mcpServers.length }}</div>
          </div>
          <div :class="styles.summaryCard">
            <div :class="styles.summaryLabel">技能</div>
            <div :class="styles.summaryValue">{{ skills.length }}</div>
          </div>
        </div>

        <div v-show="activeTab === 'experts'" :class="styles.tableWrap">
          <el-table :data="filteredExperts" stripe>
            <el-table-column prop="label" label="名称" min-width="140" />
            <el-table-column prop="id" label="ID" min-width="160">
              <template #default="{ row }">
                <span :class="styles.mono">{{ row.id }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Legacy" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.legacyAgentKey" size="small" :color="expertColor(row.id)" effect="dark">
                  {{ row.legacyAgentKey }}
                </el-tag>
                <span v-else>—</span>
              </template>
            </el-table-column>
            <el-table-column label="工具" min-width="200">
              <template #default="{ row }">
                <div :class="styles.tagRow">
                  <el-tag v-for="t in row.tools" :key="t" size="small" type="info">{{ t }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
          </el-table>
        </div>

        <div v-show="activeTab === 'tools'" :class="styles.tableWrap">
          <el-table :data="filteredTools" stripe>
            <el-table-column prop="name" label="名称" min-width="180">
              <template #default="{ row }">
                <span :class="styles.mono">{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="kind" label="类型" width="90" />
            <el-table-column prop="source" label="来源" min-width="140" />
            <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
            <el-table-column prop="argsHint" label="argsHint" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <span :class="styles.mono">{{ row.argsHint || '—' }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div v-show="activeTab === 'mcp'" :class="styles.tableWrap">
          <el-table :data="filteredMcp" stripe>
            <el-table-column prop="id" label="ID" min-width="160">
              <template #default="{ row }">
                <span :class="styles.mono">{{ row.id }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="transport" label="Transport" width="110" />
            <el-table-column prop="builtin" label="Builtin" width="120" />
            <el-table-column prop="namespace" label="Namespace" min-width="120" />
          </el-table>
        </div>

        <div v-show="activeTab === 'skills'" :class="styles.tableWrap">
          <el-table :data="filteredSkills" stripe>
            <el-table-column prop="label" label="名称" min-width="140" />
            <el-table-column prop="id" label="ID" min-width="160">
              <template #default="{ row }">
                <span :class="styles.mono">{{ row.id }}</span>
              </template>
            </el-table-column>
            <el-table-column label="引用工具" min-width="200">
              <template #default="{ row }">
                <div :class="styles.tagRow">
                  <el-tag v-for="t in row.tools" :key="t" size="small">{{ t }}</el-tag>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <p v-if="!filteredSkills.length && !loading" :class="styles.hint">暂无 Skill 声明（可在 config/plugins/skills/ 添加）</p>
        </div>

        <p :class="styles.hint">
          热重载：开发态修改 plugins/local/ 后 SIGHUP 或自动监听；生产使用 pnpm plugin:install 安装到 local / tenants 目录。
        </p>
      </div>
    </div>
  </div>
</template>
