<script setup lang="ts">
/**
 * 插件中心 — 只读浏览服务端 Registry（Expert / Tool / MCP / Skill）。
 * 配置变更通过 Git / config/plugins 或 plugin:install 完成。
 */

import { ref, computed, onMounted } from 'vue'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import FilterTabs from '@schema-platform/platform-shared/components/common/FilterTabs.vue'
import CardTable from '@/components/common/CardTable.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PageShell from '@/components/common/PageShell.vue'
import PluginEditor from '@/components/plugins/PluginEditor.vue'
import { usePluginRegistry } from '@/composables/usePluginRegistry'
import { usePluginRuntime } from '@/composables/usePluginRuntime'
import { getExpertLegacyBadge, type ExpertAgentKind } from '@/constants/expertNodeTypes'
import { getToolDisplayLabel } from '@schema-platform/platform-shared/ai/toolNames'
import type { PluginLocalLayer } from '@/api/pluginApi'
import styles from './PluginCenterView.module.scss'

type LayerTab = 'experts' | 'tools' | 'mcp' | 'skills' | 'runtime'
type ToolKindTab = 'all' | 'mcp' | 'graph' | 'http'

const layerTabs = [
  { label: '专家 Experts', value: 'experts' as LayerTab },
  { label: '工具 Tools', value: 'tools' as LayerTab },
  { label: 'MCP Server', value: 'mcp' as LayerTab },
  { label: '技能 Skills', value: 'skills' as LayerTab },
  { label: '运行时 Runtime', value: 'runtime' as LayerTab },
]

const toolKindTabs = [
  { label: '全部', value: 'all' as ToolKindTab },
  { label: 'MCP', value: 'mcp' as ToolKindTab },
  { label: 'LangGraph', value: 'graph' as ToolKindTab },
  { label: 'HTTP', value: 'http' as ToolKindTab },
]

const activeLayer = ref<LayerTab>('experts')
const activeToolKind = ref<ToolKindTab>('all')
const searchInput = ref('')
const {
  experts, skills, tools, mcpServers, loading, error, load,
  tenants, tenantsLoading, selectedTenantId, loadTenants, setTenant,
} = usePluginRegistry()

const { view: runtimeView } = usePluginRuntime()

const editorVisible = ref(false)
const editorTitle = ref('')
const editorLayer = ref<PluginLocalLayer>('experts')
const editorFileId = ref('')
const editorData = ref<unknown>({})

function openEditor(layer: PluginLocalLayer, fileId: string, label: string, data: unknown): void {
  editorLayer.value = layer
  editorFileId.value = fileId
  editorTitle.value = `编辑 ${label}`
  editorData.value = data
  editorVisible.value = true
}

function legacyBadge(key: string) {
  return getExpertLegacyBadge(key as ExpertAgentKind)
}

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
    if (activeToolKind.value !== 'all' && t.kind !== activeToolKind.value) return false
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
  void loadTenants()
})
</script>

<template>
  <PageShell>
      <PageHeader
        title="插件中心"
        subtitle="浏览已注册的专家、工具、MCP 服务器和技能"
      >
        <template #actions>
          <el-button :loading="loading" @click="load">
            <AppIcon name="refresh" :size="14" style="margin-right: 4px" />
            刷新
          </el-button>
        </template>
      </PageHeader>

      <div :class="styles.toolbar">
        <FilterTabs v-model="activeLayer" :options="layerTabs" />
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

        <div v-show="activeLayer === 'tools'" :class="styles.subToolbar">
          <FilterTabs v-model="activeToolKind" :options="toolKindTabs" />
        </div>

        <div v-show="activeLayer === 'mcp'" :class="styles.subToolbar">
          <div :class="styles.tenantFilter">
            <span :class="styles.tenantLabel">租户</span>
            <el-select
              :model-value="selectedTenantId"
              :loading="tenantsLoading"
              placeholder="全部租户"
              clearable
              filterable
              :class="styles.tenantSelect"
              @update:model-value="(v: string) => setTenant(v || '')"
            >
              <el-option
                v-for="t in tenants"
                :key="t.id"
                :label="t.name"
                :value="t.id"
              />
            </el-select>
          </div>
        </div>

        <CardTable v-show="activeLayer === 'experts'">
          <el-table :data="filteredExperts" stripe>
            <el-table-column prop="label" label="名称" min-width="140" />
            <el-table-column prop="id" label="ID" min-width="160">
              <template #default="{ row }">
                <span :class="styles.mono">{{ row.id }}</span>
              </template>
            </el-table-column>
            <el-table-column label="专家类型" width="148">
              <template #default="{ row }">
                <span
                  v-if="row.legacyAgentKey"
                  :class="styles.legacyBadge"
                  :style="{ '--badge-accent': legacyBadge(row.legacyAgentKey).color }"
                >
                  <span :class="styles.legacyIcon">
                    <AppIcon :name="legacyBadge(row.legacyAgentKey).icon" :size="12" />
                  </span>
                  <span :class="styles.legacyLabel">{{ legacyBadge(row.legacyAgentKey).label }}</span>
                </span>
                <span v-else :class="styles.emptyCell">—</span>
              </template>
            </el-table-column>
            <el-table-column label="工具" min-width="200">
              <template #default="{ row }">
                <div :class="styles.tagRow">
                  <el-tag v-for="t in row.tools" :key="t" size="small" type="info">{{ getToolDisplayLabel(t) }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openEditor('experts', row.id, row.label, row)">
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </CardTable>

        <CardTable v-show="activeLayer === 'tools'">
          <el-table :data="filteredTools" stripe>
            <el-table-column label="显示名" min-width="140">
              <template #default="{ row }">
                {{ row.label || getToolDisplayLabel(row.name) }}
              </template>
            </el-table-column>
            <el-table-column prop="name" label="工具 ID" min-width="180">
              <template #default="{ row }">
                <span :class="styles.mono">{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="kind" label="类型" width="90" />
            <el-table-column prop="source" label="来源" min-width="140" />
            <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
            <el-table-column prop="argsHint" label="参数提示" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <span :class="styles.mono">{{ row.argsHint || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openEditor('tools', row.name, row.label || row.name, row)">
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </CardTable>

        <CardTable v-show="activeLayer === 'mcp'">
          <el-table :data="filteredMcp" stripe>
            <el-table-column prop="id" label="ID" min-width="160">
              <template #default="{ row }">
                <span :class="styles.mono">{{ row.id }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="transport" label="传输方式" width="110" />
            <el-table-column prop="builtin" label="内置" width="120" />
            <el-table-column prop="namespace" label="命名空间" min-width="120" />
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openEditor('mcp', row.id, row.id, row)">
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </CardTable>

        <CardTable v-show="activeLayer === 'skills'">
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
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openEditor('skills', row.id, row.label, row)">
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <p v-if="!filteredSkills.length && !loading" :class="styles.hint">暂无 Skill 声明（可在 config/plugins/skills/ 添加）</p>
        </CardTable>

        <CardTable v-show="activeLayer === 'runtime'">
          <div :class="styles.runtimeGrid">
            <!-- Cordis 服务状态 -->
            <div :class="styles.serviceCard" v-for="svc in runtimeView.services" :key="svc.name">
              <div :class="styles.serviceHeader">
                <span :class="styles.serviceName">{{ svc.name }}</span>
                <el-tag :type="svc.status === 'running' ? 'success' : 'danger'" size="small">
                  {{ svc.status === 'running' ? '运行中' : '异常' }}
                </el-tag>
              </div>
              <ul :class="styles.serviceDetails">
                <li v-for="d in svc.details" :key="d">{{ d }}</li>
              </ul>
            </div>

            <!-- Harness 连接状态 -->
            <div :class="styles.serviceCard">
              <div :class="styles.serviceHeader">
                <span :class="styles.serviceName">harness（Agent 运行时）</span>
                <el-tag
                  :type="runtimeView.harness.reachable ? 'success' : 'warning'"
                  size="small"
                >
                  {{ runtimeView.harness.reachable ? '已连接' : '未连接' }}
                </el-tag>
              </div>
              <div v-if="runtimeView.harness.reachable && runtimeView.harness.gateway" :class="styles.serviceDetails">
                <p>活跃租户: {{ runtimeView.harness.gateway.tenants ?? 0 }}</p>
                <p>活跃会话: {{ runtimeView.harness.gateway.sessions ?? 0 }}</p>
                <p>日 RMB 预算: {{ runtimeView.harness.gateway.budgetRmbDaily ?? 10 }} 元</p>
              </div>
              <div v-else :class="styles.serviceDetails">
                <p>harness 服务未启动或不可达（{{ runtimeView.harness.error ?? '请单独部署 ai/harness' }}）</p>
              </div>
            </div>
          </div>

          <!-- 工具分类树 -->
          <h4 :class="styles.runtimeSectionTitle">工具分类（三层合并后 {{ runtimeView.toolLayers.total }}）</h4>
          <el-table :data="runtimeView.toolGroups" stripe size="small">
            <el-table-column prop="label" label="分类" width="180" />
            <el-table-column label="工具（名称 · 来源层）" min-width="420">
              <template #default="{ row }">
                <div :class="styles.tagRow">
                  <el-tag v-for="t in row.tools" :key="t.name" size="small" :type="t.source === 'patch' ? 'danger' : t.source === 'registry' ? 'success' : undefined">
                    {{ t.name }}<template v-if="t.source"> · {{ t.source }}</template>
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="数量" width="90">
              <template #default="{ row }">{{ row.tools.length }}</template>
            </el-table-column>
          </el-table>
          <p :class="styles.hint">
            分层：内置 {{ runtimeView.toolLayers.builtin }} · registry overlay {{ runtimeView.toolLayers.overlay }} · 本地 patch {{ runtimeView.toolLayers.patch }}（同名 patch 优先）
          </p>
          <p :class="styles.hint">
            节点类型：内置 {{ runtimeView.nodeTypeBuiltin }} · 动态注册 {{ runtimeView.nodeTypeDynamic }}；渲染器：{{ runtimeView.rendererCount }}（priority 匹配）
          </p>
        </CardTable>

        <p :class="styles.hint">
          热重载：开发态改 <code>plugins/local/</code> 后 SIGHUP，或设 <code>AI_PLUGIN_WATCH=1</code> 自动监听。
          生产安装插件包：<code>cd server && pnpm plugin:install --file dist/xxx.tgz</code>（可选 <code>--tenant &lt;id&gt;</code> 写入 tenants 目录）。
        </p>
      </div>

    <PluginEditor
      v-model:visible="editorVisible"
      :title="editorTitle"
      :layer="editorLayer"
      :file-id="editorFileId"
      :data="editorData"
      @saved="load"
    />
</PageShell>
</template>
