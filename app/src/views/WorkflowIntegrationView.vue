<script setup lang="ts">
/**
 * WorkflowIntegrationView - 工作流集成测试 Playground
 *
 * 列出已发布 workflow，三方可在此：
 * ① 查看 Open API 契约（endpoint / 鉴权 / 请求体 / 响应）
 * ② 在线试调（POST /api/ai/workflows/invoke/:slug，X-Workflow-Key 鉴权）+ 轮询执行结果
 * ③ 一键复制 curl / JavaScript / Python 调用示例
 *
 * 视图只做渲染：调用逻辑在 useWorkflowInvoke，API 在 workflowInvokeApi，示例生成在 workflowInvokeExamples。
 * 与 WorkflowDebugView（图结构调试）职责不同。
 */
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { BASE_URL } from '@/api/aiApi/base'
import { listWorkflows, rotateWorkflowInvokeKey } from '@/api/agentWorkflowApi'
import type { AgentWorkflowSummary } from '@/types/agentWorkflow'
import { buildInvokeCodeExamples } from '@/utils/workflowInvokeExamples'
import { useWorkflowInvoke } from '@/composables/useWorkflowInvoke'

const workflows = ref<AgentWorkflowSummary[]>([])
const loadingWorkflows = ref(false)
const selectedId = ref('')
const invokeKey = ref('')
const message = ref('你好，请介绍一下自己')
const rotating = ref(false)
/** 代码示例中是否显示真实密钥（默认 false，用占位符防泄露） */
const showKeyInExamples = ref(false)
const activeTab = ref<'curl' | 'javascript' | 'python'>('curl')
const activeResultTab = ref<'response' | 'output'>('response')

const { invoking, response, execution, pollError, invoke: runInvoke } = useWorkflowInvoke()

const selected = computed(() => workflows.value.find((w) => w.id === selectedId.value) ?? null)
const slugOrId = computed(() => selected.value?.slug || selected.value?.id || '')
const invokeUrl = computed(() => `${window.location.origin}${BASE_URL}/ai/workflows/invoke/${slugOrId.value}`)
/** 示例用的 key：未开启显示时为空（util 会替换为占位符） */
const exampleKey = computed(() => (showKeyInExamples.value ? invokeKey.value : ''))

const codeExamples = computed(() => buildInvokeCodeExamples({
  url: invokeUrl.value,
  invokeKey: exampleKey.value,
  message: message.value,
}))

const tabLabel = computed(() => (activeTab.value === 'curl' ? 'cURL' : activeTab.value))

async function loadWorkflows() {
  loadingWorkflows.value = true
  try {
    const all = await listWorkflows()
    workflows.value = all.filter((w) => w.status === 'published')
    if (workflows.value.length && !selectedId.value) selectedId.value = workflows.value[0].id
  } catch (err) {
    ElMessage.error('加载工作流失败')
    console.error('[integration] load failed', err)
  } finally {
    loadingWorkflows.value = false
  }
}

async function fetchKey() {
  if (!selectedId.value) return
  try {
    await ElMessageBox.confirm('轮换密钥会使旧密钥立即失效，确定继续？', '获取调用密钥', { type: 'warning' })
  } catch {
    return
  }
  rotating.value = true
  try {
    const res = await rotateWorkflowInvokeKey(selectedId.value)
    invokeKey.value = res.invokeKey
    ElMessage.success('密钥已获取（仅显示一次，请妥善保存）')
  } catch (err) {
    ElMessage.error('获取密钥失败')
    console.error('[integration] rotate key failed', err)
  } finally {
    rotating.value = false
  }
}

function onInvoke() {
  return runInvoke(slugOrId.value, invokeKey.value, message.value)
}

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${label} 已复制`)
  } catch {
    ElMessage.warning('复制失败，请手动选择复制')
  }
}

onMounted(loadWorkflows)
</script>

<template>
  <div class="integration-view">
    <PageHeader title="集成测试" description="工作流 Open API 集成 Playground：在线试调、查看契约、复制 curl/JS/Python 示例，供三方快速接入">
      <template #actions>
        <el-button :loading="rotating" :disabled="!selectedId" @click="fetchKey">
          <AppIcon name="key" :size="14" /> 获取密钥
        </el-button>
      </template>
    </PageHeader>

    <div class="grid">
      <!-- 左：配置 + 试调 -->
      <el-card shadow="never" class="col-left">
        <template #header><span class="panel-title">在线试调</span></template>

        <div class="form-row">
          <label>工作流</label>
          <el-select
            v-model="selectedId"
            v-loading="loadingWorkflows"
            filterable
            placeholder="选择已发布 workflow"
            style="width: 100%"
          >
            <el-option
              v-for="w in workflows"
              :key="w.id"
              :label="w.name + (w.slug ? ` (${w.slug})` : '')"
              :value="w.id"
            />
          </el-select>
        </div>

        <div v-if="selected" class="meta-row">
          <el-tag size="small" type="success">已发布</el-tag>
          <span class="meta-label">slug:</span>
          <code>{{ selected.slug || '(无 slug，用 id 调用)' }}</code>
        </div>

        <div class="form-row">
          <label>调用密钥 <span class="hint">X-Workflow-Key</span></label>
          <el-input v-model="invokeKey" type="password" show-password placeholder="粘贴调用密钥，或点击右上角「获取密钥」" />
        </div>

        <div class="form-row">
          <label>输入消息 <span class="hint">input.message</span></label>
          <el-input v-model="message" type="textarea" :rows="3" />
        </div>

        <el-button type="primary" :loading="invoking" :disabled="!selectedId" @click="onInvoke">
          <AppIcon name="video-play" :size="14" /> 调用 Open API
        </el-button>

        <!-- 执行结果 -->
        <div v-if="response || execution || pollError" class="result">
          <el-alert v-if="pollError" type="error" :title="pollError" :closable="false" show-icon class="result-alert" />
          <el-tabs v-model="activeResultTab">
            <el-tab-pane label="调用响应" name="response">
              <pre class="code-block">{{ JSON.stringify(response, null, 2) }}</pre>
            </el-tab-pane>
            <el-tab-pane :label="`执行结果${execution ? ' · ' + execution.status : ''}`" name="output">
              <div v-if="execution" class="exec-info">
                <el-tag size="small" :type="execution.status === 'success' ? 'success' : execution.status === 'error' ? 'danger' : 'primary'">
                  {{ execution.status }}
                </el-tag>
                <span class="meta-label">耗时:</span>
                <span>{{ execution.durationMs ? `${execution.durationMs}ms` : '-' }}</span>
              </div>
              <pre v-if="execution" class="code-block">{{ JSON.stringify(execution.nodeRecords?.map(n => ({ node: n.nodeName, status: n.status, output: n.output })), null, 2) }}</pre>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-card>

      <!-- 右：代码示例 + 契约 -->
      <el-card shadow="never" class="col-right">
        <template #header>
          <div class="right-header">
            <span class="panel-title">调用示例（三方集成）</span>
            <el-tooltip content="开启后示例含真实密钥，复制时注意泄露风险" placement="left">
              <el-checkbox v-model="showKeyInExamples">示例显示真实密钥</el-checkbox>
            </el-tooltip>
          </div>
        </template>
        <el-tabs v-model="activeTab">
          <el-tab-pane label="cURL" name="curl">
            <pre class="code-block">{{ codeExamples.curl }}</pre>
          </el-tab-pane>
          <el-tab-pane label="JavaScript" name="javascript">
            <pre class="code-block">{{ codeExamples.javascript }}</pre>
          </el-tab-pane>
          <el-tab-pane label="Python" name="python">
            <pre class="code-block">{{ codeExamples.python }}</pre>
          </el-tab-pane>
        </el-tabs>
        <el-button size="small" @click="copy(codeExamples[activeTab], tabLabel + ' 示例')">
          <AppIcon name="document-copy" :size="12" /> 复制{{ tabLabel }} 示例
        </el-button>

        <el-divider />

        <div class="contract">
          <h4>API 契约</h4>
          <div class="contract-row"><span class="c-label">端点</span><code>POST /api/ai/workflows/invoke/:slugOrId</code></div>
          <div class="contract-row"><span class="c-label">鉴权</span><code>X-Workflow-Key: &lt;调用密钥&gt;</code>（或 <code>X-API-Key: sk-*</code>）</div>
          <div class="contract-row"><span class="c-label">请求体</span><code>{ "input": { "message": "..." }, "trigger": "api" }</code></div>
          <div class="contract-row"><span class="c-label">响应</span><code>202 · { success, data: { executionId, status, execution } }</code></div>
          <div class="contract-row"><span class="c-label">轮询</span><code>GET /api/ai/workflows/invoke/executions/:executionId</code></div>
          <div class="contract-row"><span class="c-label">回调</span>支持 <code>callbackUrl</code> + <code>callbackSecret</code>（执行完成后回调）</div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.integration-view { display: flex; flex-direction: column; gap: 16px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.col-right :deep(.el-card__body) { padding: 16px; }
.form-row { margin-bottom: 14px; }
.form-row label { display: block; font-size: 13px; color: var(--el-text-color-regular); margin-bottom: 6px; font-weight: 500; }
.hint { color: var(--el-text-color-secondary); font-weight: 400; font-size: 12px; margin-left: 4px; }
.meta-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-size: 12px; }
.meta-label { color: var(--el-text-color-secondary); }
code { background: var(--el-fill-color-light, #f5f7fa); padding: 1px 6px; border-radius: 3px; font-size: 12px; }
.result { margin-top: 16px; }
.result-alert { margin-bottom: 12px; }
.code-block { background: #1e1e1e; color: #e0e0e0; padding: 12px; border-radius: 6px; font-size: 12px; line-height: 1.6; overflow-x: auto; max-height: 320px; white-space: pre-wrap; word-break: break-all; }
.exec-info { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 12px; }
.panel-title { font-weight: 600; }
.right-header { display: flex; justify-content: space-between; align-items: center; }
.contract h4 { margin: 0 0 10px; font-size: 14px; }
.contract-row { display: flex; gap: 8px; margin-bottom: 8px; font-size: 12px; align-items: baseline; }
.c-label { min-width: 56px; color: var(--el-text-color-secondary); flex-shrink: 0; }
</style>
