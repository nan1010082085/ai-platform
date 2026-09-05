<script setup lang="ts">
import { PageShell, PageHeader } from '@apform-ui/core'
/**
 * MCP 管理页面 - 浏览、测试、健康监控 MCP 工具
 */
import { ref, computed, onMounted } from 'vue'
import { message } from '@schema-platform/platform-shared/utils/message'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import {
  testMcpTool,
  type McpTestResult,
} from '@/api/aiApi/mcp'
import { useMcpHealth } from '@/composables/useMcpHealth'

// ── useMcpHealth（单一 servers 数据源，避免与本地 ref 脱节）──
const {
  servers,
  totalTools,
  unhealthyCount,
  loading,
  checking,
  loadServers,
  getToolMetric,
  getSuccessRate,
  pingAll,
  checkTool,
} = useMcpHealth()

const headerSubtitle = computed(() => {
  const base = `${servers.value.length} 个 Server · ${totalTools.value} 个工具`
  return unhealthyCount.value > 0 ? `${base} · ${unhealthyCount.value} 个异常` : base
})

// ── 数据 ──
const selectedServer = ref('')
const selectedTool = ref('')
const argsText = ref('{}')
const testing = ref(false)
const testResult = ref<McpTestResult | null>(null)
const testError = ref<string | null>(null)

// ── 计算属性 ──
const currentServer = computed(() => servers.value.find((s) => s.id === selectedServer.value))
const currentTool = computed(() => {
  if (!currentServer.value) return null
  return currentServer.value.tools.find((t) => t.name === selectedTool.value) ?? null
})

const currentMetric = computed(() => {
  if (!selectedServer.value || !selectedTool.value) return null
  return getToolMetric(selectedServer.value, selectedTool.value)
})

const currentSuccessRate = computed(() => {
  if (!selectedServer.value || !selectedTool.value) return 0
  return getSuccessRate(selectedServer.value, selectedTool.value)
})

// ── 方法 ──
async function loadTools() {
  try {
    await loadServers()
    const first = servers.value.find((s) => s.tools.length > 0)
    if (first) {
      selectTool(first.id, first.tools[0].name)
    }
  } catch (err) {
    message.error(err instanceof Error ? err.message : '加载工具服务失败')
  }
}

function selectTool(serverId: string, toolName: string) {
  selectedServer.value = serverId
  selectedTool.value = toolName
  testResult.value = null
  testError.value = null

  const server = servers.value.find((s) => s.id === serverId)
  const tool = server?.tools.find((t) => t.name === toolName)
  if (tool?.inputSchema?.properties) {
    const defaults: Record<string, unknown> = {}
    for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
      if (prop.default !== undefined) {
        defaults[key] = prop.default
      } else if (prop.type === 'string') {
        defaults[key] = ''
      } else if (prop.type === 'number' || prop.type === 'integer') {
        defaults[key] = 0
      } else if (prop.type === 'boolean') {
        defaults[key] = false
      } else if (prop.type === 'array') {
        defaults[key] = []
      }
    }
    const required = tool.inputSchema.required ?? []
    const filtered: Record<string, unknown> = {}
    for (const key of Object.keys(defaults)) {
      if (required.includes(key) || tool.inputSchema.properties[key].default !== undefined) {
        filtered[key] = defaults[key]
      }
    }
    argsText.value = JSON.stringify(Object.keys(filtered).length > 0 ? filtered : {}, null, 2)
  } else {
    argsText.value = '{}'
  }
}

function parseArgs(): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(argsText.value)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      message.error('参数必须是 JSON 对象')
      return null
    }
    return parsed as Record<string, unknown>
  } catch (err) {
    message.error(`JSON 格式错误: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

async function handleTest() {
  if (!selectedServer.value || !selectedTool.value) return
  const args = parseArgs()
  if (args === null) return

  testing.value = true
  testResult.value = null
  testError.value = null

  try {
    const result = await testMcpTool(selectedServer.value, selectedTool.value, args)
    testResult.value = result
    // 记录到 useMcpHealth
    await checkTool(selectedServer.value, selectedTool.value, args)
  } catch (err) {
    testError.value = err instanceof Error ? err.message : String(err)
  } finally {
    testing.value = false
  }
}

async function handlePingAll() {
  await pingAll()
  message.success('批量健康检查完成')
}

function formatJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

function rateTagType(rate: number): string {
  if (rate >= 80) return 'success'
  if (rate >= 50) return 'warning'
  return 'danger'
}

onMounted(() => {
  void loadTools()
})
</script>

<template>
  <PageShell fill>
    <div :class="$style.container">
    <PageHeader title="工具服务" :subtitle="headerSubtitle">
      <template #actions>
        <el-button :loading="checking" @click="handlePingAll">
          <AppIcon name="refresh" :size="14" />
          批量健康检查
        </el-button>
        <el-button :loading="loading" @click="loadTools">
          <AppIcon name="refresh-right" :size="14" />
          刷新
        </el-button>
      </template>
    </PageHeader>

    <div :class="$style.body">
      <!-- 左侧：Server + 工具列表（含健康指标） -->
      <div :class="$style.sidebar">
        <div v-loading="loading" :class="$style.serverList">
          <div
            v-for="server in servers"
            :key="server.id"
            :class="$style.serverGroup"
          >
            <div :class="$style.serverHeader">
              <AppIcon
                :name="server.id === 'rag' ? 'magic-stick' : server.id === 'schema' ? 'document-copy' : server.id === 'flow' ? 'switch-button' : server.id === 'widget' ? 'takeaway-box' : 'office-building'"
                :size="14"
              />
              <span :class="$style.serverName">{{ server.id }}</span>
              <el-tag size="small" type="info">{{ server.tools.length }}</el-tag>
              <el-tag v-if="server.transport" size="small" type="info" effect="plain">{{ server.transport }}</el-tag>
              <el-tag v-if="server.error" size="small" type="danger">异常</el-tag>
              <el-tag v-else size="small" type="success">在线</el-tag>
            </div>
            <div v-if="server.error" :class="$style.serverError">
              <AppIcon name="warning-filled" :size="12" />
              {{ server.error }}
            </div>
            <div
              v-for="tool in server.tools"
              :key="tool.name"
              :class="[
                $style.toolItem,
                selectedTool === tool.name && selectedServer === server.id ? $style.toolItemActive : '',
              ]"
              @click="selectTool(server.id, tool.name)"
            >
              <AppIcon name="arrow-right" :size="12" />
              <span :class="$style.toolName">{{ tool.name }}</span>
              <span
                v-if="getToolMetric(server.id, tool.name)"
                :class="$style.toolMetric"
              >
                <el-tag :type="rateTagType(getSuccessRate(server.id, tool.name))" size="small" effect="plain">
                  {{ getSuccessRate(server.id, tool.name) }}%
                </el-tag>
                <span :class="$style.toolDuration">
                  {{ getToolMetric(server.id, tool.name)?.avgDurationMs ?? 0 }}ms
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：测试面板 -->
      <div :class="$style.panel">
        <template v-if="currentTool">
          <!-- 工具信息 + 健康指标 -->
          <div :class="$style.toolHeader">
            <div>
              <h3 :class="$style.toolTitle">{{ currentTool.name }}</h3>
              <p :class="$style.toolDesc">{{ currentTool.description || '无描述' }}</p>
            </div>
            <div :class="$style.toolMeta">
              <el-tag size="small" type="info">{{ currentServer?.id }}</el-tag>
              <template v-if="currentMetric">
                <el-tag :type="rateTagType(currentSuccessRate)" size="small">
                  成功率 {{ currentSuccessRate }}%
                </el-tag>
                <span :class="$style.metaText">
                  平均 {{ currentMetric.avgDurationMs }}ms · 共 {{ currentMetric.totalCalls }} 次
                </span>
              </template>
            </div>
          </div>

          <!-- 最近错误 -->
          <div v-if="currentMetric?.lastError" :class="$style.lastError">
            <el-alert type="error" :closable="false" show-icon>
              <template #title>最近错误</template>
              {{ currentMetric.lastError }}
            </el-alert>
          </div>

          <!-- 参数输入 -->
          <div :class="$style.section">
            <div :class="$style.sectionLabel">
              <AppIcon name="edit-pen" :size="14" />
              参数 (JSON)
            </div>
            <div v-if="currentTool.inputSchema?.properties" :class="$style.paramHints">
              <span
                v-for="key in Object.keys(currentTool.inputSchema.properties)"
                :key="key"
                :class="$style.paramTag"
              >
                {{ key }}
                <span v-if="currentTool.inputSchema.required?.includes(key)" :class="$style.required">*</span>
                <span :class="$style.paramType">{{ currentTool.inputSchema.properties[key].type ?? 'any' }}</span>
              </span>
            </div>
            <textarea
              v-model="argsText"
              :class="$style.codeEditor"
              spellcheck="false"
              placeholder='{"keyword":"表单","limit":5}'
            />
          </div>

          <!-- 调用按钮 -->
          <div :class="$style.actions">
            <el-button type="primary" :loading="testing" @click="handleTest">
              <AppIcon name="video-play" :size="14" />
              调用工具
            </el-button>
          </div>

          <!-- 结果展示 -->
          <div v-if="testResult || testError" :class="$style.section">
            <div :class="$style.sectionLabel">
              <AppIcon name="document-copy" :size="14" />
              结果
              <span v-if="testResult" :class="$style.resultMeta">
                <el-tag :type="testResult.isError ? 'danger' : 'success'" size="small">
                  {{ testResult.isError ? '工具返回错误' : '成功' }}
                </el-tag>
                <span :class="$style.duration">{{ testResult.duration }}ms</span>
              </span>
            </div>
            <pre v-if="testResult" :class="$style.resultBox">{{ formatJson(testResult.result) }}</pre>
            <pre v-if="testError" :class="[$style.resultBox, $style.resultError]">{{ testError }}</pre>
          </div>
        </template>

        <div v-else :class="$style.empty">
          <AppIcon name="set-up" :size="48" />
          <p>选择左侧工具开始测试</p>
        </div>
      </div>
    </div>
    </div>
  </PageShell>
</template>

<style module>
.container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.headerActions {
  display: flex;
  gap: 8px;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--ai-text-primary, #1d2129);
}

.subtitle {
  font-size: 13px;
  color: var(--ai-text-secondary, #86909c);
  margin: 4px 0 0;
}

.unhealthy {
  color: var(--el-color-danger);
}

.body {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 16px;
}

.sidebar {
  width: 300px;
  flex-shrink: 0;
  border: 1px solid var(--ai-border-light, #ebedf3);
  border-radius: 8px;
  overflow-y: auto;
  background: var(--ai-bg-white, #fff);
}

.serverList {
  padding: 8px;
}

.serverGroup {
  margin-bottom: 8px;
}

.serverHeader {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ai-text-primary, #1d2129);
}

.serverName {
  flex: 1;
}

.serverError {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--el-color-danger);
}

.toolItem {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--ai-text-regular, #4e5969);
  transition: all 0.15s;
}

.toolItem:hover {
  background: var(--ai-bg-gray, #f5f7fa);
}

.toolItemActive {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.toolName {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolMetric {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.toolDuration {
  font-size: 11px;
  color: var(--ai-text-secondary, #86909c);
}

.panel {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--ai-border-light, #ebedf3);
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
  background: var(--ai-bg-white, #fff);
}

.toolHeader {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ai-border-light, #ebedf3);
}

.toolTitle {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--ai-text-primary, #1d2129);
}

.toolDesc {
  font-size: 13px;
  color: var(--ai-text-secondary, #86909c);
  margin: 6px 0 0;
  line-height: 1.5;
  max-width: 600px;
}

.toolMeta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.metaText {
  font-size: 12px;
  color: var(--ai-text-secondary, #86909c);
}

.lastError {
  margin-bottom: 16px;
}

.section {
  margin-bottom: 20px;
}

.sectionLabel {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ai-text-primary, #1d2129);
  margin-bottom: 8px;
}

.paramHints {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.paramTag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: var(--ai-bg-gray, #f5f7fa);
  color: var(--ai-text-regular, #4e5969);
}

.required {
  color: var(--el-color-danger);
}

.paramType {
  color: var(--ai-text-secondary, #86909c);
  font-size: 11px;
}

.codeEditor {
  display: block;
  width: 100%;
  min-height: 120px;
  padding: 12px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ai-text-primary, #1d2129);
  background: var(--ai-bg-gray, #f5f7fa);
  border: 1px solid var(--ai-border-light, #ebedf3);
  border-radius: 8px;
  outline: none;
  resize: vertical;
  tab-size: 2;
}

.codeEditor:focus {
  border-color: var(--el-color-primary);
  background: var(--ai-bg-white, #fff);
}

.actions {
  margin-bottom: 20px;
}

.resultMeta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.duration {
  font-size: 12px;
  color: var(--ai-text-secondary, #86909c);
}

.resultBox {
  padding: 12px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  background: var(--ai-bg-gray, #f5f7fa);
  border: 1px solid var(--ai-border-light, #ebedf3);
  border-radius: 8px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
  margin: 0;
}

.resultError {
  color: var(--el-color-danger);
  border-color: var(--el-color-danger-light-5);
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--ai-text-secondary, #86909c);
  font-size: 14px;
}
</style>
