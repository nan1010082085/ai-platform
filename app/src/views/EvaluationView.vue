<script setup lang="ts">
/**
 * EvaluationView - 评测中心
 *
 * 三 Tab 分离评测工作流：
 * - 数据集：管理测试用例（CRUD + 抽屉编辑）
 * - 运行：选目标 workflow + 数据集发起评测，实时进度 + 失败用例预览
 * - 对比：选两次运行横向对比通过率/耗时/token/LLM 评分，失败用例 diff
 *
 * 挂在监控下拉（评测 = 质量监控）。
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PageShell from '@/components/common/PageShell.vue'
import {
  listEvalDatasets,
  createEvalDataset,
  updateEvalDataset,
  deleteEvalDataset,
  runEvaluation,
  listEvalRuns,
  getEvalRun,
  type EvaluationDatasetInput,
} from '@/api/aiApi'
import { listWorkflows } from '@/api/agentWorkflowApi'
import { resolveErrorText } from '@/constants/errorCodes'
import type {
  EvaluationDataset,
  EvaluationRun,
  EvaluationTestcase,
  JudgeType,
} from '@/types'
import styles from './EvaluationView.module.scss'

type TabKey = 'datasets' | 'run' | 'compare'

const activeTab = ref<TabKey>('datasets')
const loading = ref(false)

// ── Datasets ──
const datasets = ref<EvaluationDataset[]>([])
const editingDataset = ref<EvaluationDataset | null>(null)
const drawerVisible = ref(false)
const editName = ref('')
const editDesc = ref('')
const editTestcases = ref<EvaluationTestcase[]>([])

const JUDGE_TYPE_OPTIONS: Array<{ label: string; value: JudgeType; hint: string }> = [
  { label: '关键词', value: 'keyword', hint: '逗号分隔，全部命中即通过' },
  { label: '正则', value: 'regex', hint: '正则匹配即通过' },
  { label: 'LLM 评分', value: 'llm', hint: 'LLM 打分 0-5，≥3 通过' },
  { label: '语义相似', value: 'semantic', hint: 'embedding 余弦相似度阈值（如 0.75）' },
]

// ── Run ──
const workflows = ref<Array<{ id: string; name: string; status: string }>>([])
const runDatasetId = ref('')
const runWorkflowId = ref('')
const runJudgeMethods = ref<JudgeType[]>(['keyword'])
const running = ref(false)
const currentRun = ref<EvaluationRun | null>(null)
let runPollTimer: ReturnType<typeof setInterval> | null = null

// ── Compare ──
const runs = ref<EvaluationRun[]>([])
const compareA = ref('')
const compareB = ref('')

const runA = computed(() => runs.value.find((r) => r.id === compareA.value) ?? null)
const runB = computed(() => runs.value.find((r) => r.id === compareB.value) ?? null)

const completedRuns = computed(() => runs.value.filter((r) => r.status === 'completed'))

async function loadDatasets() {
  loading.value = true
  try {
    datasets.value = await listEvalDatasets()
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '加载测试集失败'))
  } finally {
    loading.value = false
  }
}

async function loadWorkflows() {
  try {
    const list = await listWorkflows()
    workflows.value = list.map((w) => ({ id: w.id, name: w.name, status: w.status }))
  } catch {
    // 静默：工作流加载失败不阻塞界面
  }
}

async function loadRuns() {
  try {
    runs.value = await listEvalRuns()
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '加载评测运行失败'))
  }
}

// ── Dataset 编辑 ──
function openNewDataset() {
  editingDataset.value = null
  editName.value = ''
  editDesc.value = ''
  editTestcases.value = [makeEmptyTestcase()]
  drawerVisible.value = true
}

function openEditDataset(ds: EvaluationDataset) {
  editingDataset.value = ds
  editName.value = ds.name
  editDesc.value = ds.description
  editTestcases.value = ds.testcases.length
    ? ds.testcases.map((t) => ({ ...t }))
    : [makeEmptyTestcase()]
  drawerVisible.value = true
}

function makeEmptyTestcase(): EvaluationTestcase {
  return { id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, input: '', expectedOutput: '', judgeType: 'keyword', judgeConfig: '' }
}

function addTestcase() {
  editTestcases.value.push(makeEmptyTestcase())
}

function removeTestcase(idx: number) {
  editTestcases.value.splice(idx, 1)
}

async function saveDataset() {
  if (!editName.value.trim()) {
    ElMessage.warning('请输入测试集名称')
    return
  }
  const validTestcases = editTestcases.value.filter((t) => t.input.trim())
  if (validTestcases.length === 0) {
    ElMessage.warning('至少需要一条有效用例（输入不能为空）')
    return
  }
  const payload: EvaluationDatasetInput = {
    name: editName.value.trim(),
    description: editDesc.value,
    testcases: validTestcases,
  }
  try {
    if (editingDataset.value) {
      await updateEvalDataset(editingDataset.value.id, payload)
      ElMessage.success('测试集已更新')
    } else {
      await createEvalDataset(payload)
      ElMessage.success('测试集已创建')
    }
    drawerVisible.value = false
    await loadDatasets()
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '保存失败'))
  }
}

async function removeDataset(ds: EvaluationDataset) {
  try {
    await ElMessageBox.confirm(`确认删除测试集「${ds.name}」？`, '删除', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteEvalDataset(ds.id)
    ElMessage.success('已删除')
    await loadDatasets()
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '删除失败'))
  }
}

// CSV 导入：每行一个用例，列：input,expectedOutput,judgeType,judgeConfig
function importCsv(file: File) {
  const reader = new FileReader()
  reader.onload = () => {
    const text = String(reader.result ?? '')
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length === 0) return
    const parsed: EvaluationTestcase[] = []
    // 跳过表头（若首行含 input）
    const start = lines[0].toLowerCase().includes('input') ? 1 : 0
    for (let i = start; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i])
      if (!cols[0]?.trim()) continue
      parsed.push({
        id: `tc-${Date.now()}-${i}`,
        input: cols[0] ?? '',
        expectedOutput: cols[1] ?? '',
        judgeType: (['keyword', 'regex', 'llm', 'semantic'].includes(cols[2]) ? cols[2] : 'keyword') as JudgeType,
        judgeConfig: cols[3] ?? '',
      })
    }
    if (parsed.length > 0) {
      editTestcases.value = parsed
      ElMessage.success(`已导入 ${parsed.length} 条用例`)
    }
  }
  reader.readAsText(file)
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') inQuote = !inQuote
    else if (ch === ',' && !inQuote) { result.push(cur); cur = '' }
    else cur += ch
  }
  result.push(cur)
  return result
}

// ── 评测运行 ──
async function startRun() {
  if (!runDatasetId.value) { ElMessage.warning('请选择数据集'); return }
  if (!runWorkflowId.value) { ElMessage.warning('请选择目标工作流'); return }
  running.value = true
  currentRun.value = null
  try {
    const run = await runEvaluation({
      datasetId: runDatasetId.value,
      target: { type: 'workflow', id: runWorkflowId.value },
      judgeMethods: runJudgeMethods.value,
    })
    currentRun.value = run
    // 若仍在运行，轮询进度
    if (run.status === 'running') {
      startPolling(run.id)
    }
    ElMessage.success('评测完成')
    await loadRuns()
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '评测运行失败'))
  } finally {
    running.value = false
  }
}

function startPolling(runId: string) {
  stopPolling()
  runPollTimer = setInterval(async () => {
    try {
      const updated = await getEvalRun(runId)
      currentRun.value = updated
      if (updated.status !== 'running') {
        stopPolling()
        await loadRuns()
      }
    } catch {
      stopPolling()
    }
  }, 1500)
}

function stopPolling() {
  if (runPollTimer) { clearInterval(runPollTimer); runPollTimer = null }
}

const runProgress = computed(() => {
  if (!currentRun.value) return null
  const s = currentRun.value.summary
  return { done: s.total, total: s.total, passed: s.passed, failed: s.failed }
})

// ── 对比 ──
const compareRows = computed(() => {
  if (!runA.value || !runB.value) return []
  const a = runA.value.summary
  const b = runB.value.summary
  const fmt = (v: number | null | undefined, unit = '') =>
    v == null ? '-' : `${v}${unit}`
  return [
    { label: '通过率', a: fmt(a.passRate, '%'), b: fmt(b.passRate, '%'),
      change: (b.passRate - a.passRate), good: b.passRate >= a.passRate, unit: '%' },
    { label: '平均耗时', a: fmt(a.avgDurationMs, 'ms'), b: fmt(b.avgDurationMs, 'ms'),
      change: (b.avgDurationMs - a.avgDurationMs), good: b.avgDurationMs <= a.avgDurationMs, unit: 'ms' },
    { label: '平均 token', a: fmt(a.avgTokens), b: fmt(b.avgTokens),
      change: (b.avgTokens - a.avgTokens), good: b.avgTokens <= a.avgTokens, unit: '' },
    { label: 'LLM 评分', a: fmt(a.avgLlmScore), b: fmt(b.avgLlmScore),
      change: ((b.avgLlmScore ?? 0) - (a.avgLlmScore ?? 0)), good: (b.avgLlmScore ?? 0) >= (a.avgLlmScore ?? 0), unit: '' },
  ]
})

// 失败用例对比：取 A 和 B 都失败的 testcaseId，展示两边输出
const failedCompareItems = computed(() => {
  if (!runA.value || !runB.value) return []
  const aMap = new Map(runA.value.results.map((r) => [r.testcaseId, r]))
  const bMap = new Map(runB.value.results.map((r) => [r.testcaseId, r]))
  const ids = new Set([...aMap.keys(), ...bMap.keys()])
  return [...ids].map((id) => ({
    id,
    input: aMap.get(id)?.input ?? bMap.get(id)?.input ?? '',
    aOutput: aMap.get(id)?.actualOutput ?? '(未运行)',
    aPassed: aMap.get(id)?.passed ?? false,
    bOutput: bMap.get(id)?.actualOutput ?? '(未运行)',
    bPassed: bMap.get(id)?.passed ?? false,
  })).filter((item) => !item.aPassed || !item.bPassed)
})

function changeClass(change: number, good: boolean): string {
  if (change === 0) return styles.changeSame
  return good ? styles.changeGood : styles.changeBad
}

function changeText(change: number, unit: string): string {
  if (change === 0) return '不变'
  const sign = change > 0 ? '↑' : '↓'
  return `${sign}${Math.abs(Math.round(change * 10) / 10)}${unit}`
}

function judgeTypeLabel(t: JudgeType): string {
  return { keyword: '关键词', regex: '正则', llm: 'LLM', semantic: '语义相似' }[t]
}

onMounted(() => {
  loadDatasets()
  loadWorkflows()
  loadRuns()
})

onUnmounted(() => {
  if (runPollTimer) clearInterval(runPollTimer)
})
</script>

<template>
  <PageShell>
      <PageHeader
        title="评测中心"
        subtitle="用测试集离线评测 workflow 质量，横向对比版本差异"
      />

      <div :class="styles.tabsRow">
        <button
          v-for="tab in [{ key: 'datasets', label: '数据集' }, { key: 'run', label: '评测运行' }, { key: 'compare', label: '结果对比' }]"
          :key="tab.key"
          type="button"
          :class="[styles.tab, activeTab === tab.key && styles.tabActive]"
          @click="activeTab = tab.key as TabKey"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 数据集 Tab -->
      <div v-if="activeTab === 'datasets'" v-loading="loading" :class="styles.tabBody">
        <div :class="styles.toolbar">
          <el-button type="primary" size="small" @click="openNewDataset">
            <AppIcon name="magic-stick" :size="14" /> 新建测试集
          </el-button>
        </div>

        <div v-if="datasets.length === 0" :class="styles.empty">
          <AppIcon name="document-checked" :size="36" :class="styles.emptyIcon" />
          <p>暂无测试集，点击「新建测试集」开始</p>
        </div>

        <div v-else :class="styles.cardGrid">
          <div v-for="ds in datasets" :key="ds.id" :class="styles.dsCard">
            <div :class="styles.dsCardHead">
              <AppIcon name="document-checked" :size="18" />
              <span :class="styles.dsName">{{ ds.name }}</span>
            </div>
            <div :class="styles.dsDesc">{{ ds.description || '无描述' }}</div>
            <div :class="styles.dsMeta">
              <el-tag size="small" type="info">{{ ds.testcases.length }} 条用例</el-tag>
              <span :class="styles.dsTime">{{ new Date(ds.updatedAt).toLocaleDateString() }}</span>
            </div>
            <div :class="styles.dsActions">
              <el-button link type="primary" size="small" @click="openEditDataset(ds)">编辑</el-button>
              <el-button link type="danger" size="small" @click="removeDataset(ds)">删除</el-button>
              <el-button link type="primary" size="small" @click="runDatasetId = ds.id; activeTab = 'run'">运行评测</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 评测运行 Tab -->
      <div v-else-if="activeTab === 'run'" :class="styles.tabBody">
        <div :class="styles.runForm">
          <div :class="styles.formRow">
            <label>目标工作流</label>
            <el-select v-model="runWorkflowId" placeholder="选择工作流" filterable style="width: 280px">
              <el-option v-for="w in workflows" :key="w.id" :label="w.name" :value="w.id" />
            </el-select>
          </div>
          <div :class="styles.formRow">
            <label>数据集</label>
            <el-select v-model="runDatasetId" placeholder="选择数据集" style="width: 280px">
              <el-option v-for="ds in datasets" :key="ds.id" :label="`${ds.name}（${ds.testcases.length}条）`" :value="ds.id" />
            </el-select>
          </div>
          <div :class="styles.formRow">
            <label>评判方式</label>
            <el-checkbox-group v-model="runJudgeMethods">
              <el-checkbox value="keyword">关键词</el-checkbox>
              <el-checkbox value="regex">正则</el-checkbox>
              <el-checkbox value="llm">LLM 评分</el-checkbox>
              <el-checkbox value="semantic">语义相似</el-checkbox>
            </el-checkbox-group>
          </div>
          <div :class="styles.formRow">
            <el-button type="primary" :loading="running" :disabled="!runWorkflowId || !runDatasetId" @click="startRun">
              <AppIcon name="video-play" :size="14" /> 开始评测
            </el-button>
          </div>
        </div>

        <div v-if="currentRun" :class="styles.runProgress">
          <div :class="styles.progressHead">
            <span>{{ currentRun.target.name }} · {{ currentRun.datasetName }}</span>
            <el-tag size="small" :type="currentRun.status === 'completed' ? 'success' : currentRun.status === 'failed' ? 'danger' : 'warning'">
              {{ currentRun.status === 'running' ? '运行中' : currentRun.status === 'completed' ? '已完成' : '失败' }}
            </el-tag>
          </div>
          <el-progress
            :percentage="runProgress ? Math.round((runProgress.done / Math.max(runProgress.total, 1)) * 100) : 0"
            :status="currentRun.status === 'failed' ? 'exception' : currentRun.status === 'completed' ? 'success' : undefined"
          />
          <div :class="styles.progressStats">
            <span :class="styles.statGood">通过 {{ currentRun.summary.passed }}</span>
            <span :class="styles.statBad">失败 {{ currentRun.summary.failed }}</span>
            <span>共 {{ currentRun.summary.total }}</span>
          </div>

          <div v-if="currentRun.results.length" :class="styles.resultList">
            <div v-for="(r, idx) in currentRun.results" :key="idx" :class="[styles.resultRow, !r.passed && styles.resultRowFail]">
              <div :class="styles.resultIdx">
                <AppIcon :name="r.passed ? 'circle-check-filled' : 'warning-filled'" :size="14" :class="r.passed ? styles.iconGood : styles.iconBad" />
              </div>
              <div :class="styles.resultBody">
                <div :class="styles.resultInput">{{ r.input }}</div>
                <div v-if="r.error" :class="styles.resultError">{{ r.error }}</div>
                <div v-else :class="styles.resultOutput">实际：{{ r.actualOutput.slice(0, 100) }}{{ r.actualOutput.length > 100 ? '…' : '' }}</div>
              </div>
              <span :class="styles.resultDuration">{{ r.durationMs }}ms</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 结果对比 Tab -->
      <div v-else :class="styles.tabBody">
        <div :class="styles.compareSelectors">
          <div :class="styles.formRow">
            <label>版本 A</label>
            <el-select v-model="compareA" placeholder="选择运行" filterable style="width: 320px">
              <el-option v-for="r in completedRuns" :key="r.id" :label="`${r.target.name} · ${new Date(r.createdAt).toLocaleString()}`" :value="r.id" />
            </el-select>
          </div>
          <div :class="styles.formRow">
            <label>版本 B</label>
            <el-select v-model="compareB" placeholder="选择运行" filterable style="width: 320px">
              <el-option v-for="r in completedRuns" :key="r.id" :label="`${r.target.name} · ${new Date(r.createdAt).toLocaleString()}`" :value="r.id" />
            </el-select>
          </div>
        </div>

        <div v-if="runA && runB" :class="styles.compareBody">
          <el-table :data="compareRows" border size="small">
            <el-table-column prop="label" label="指标" width="120" />
            <el-table-column label="版本 A">
              <template #default="{ row }">{{ row.a }}</template>
            </el-table-column>
            <el-table-column label="版本 B">
              <template #default="{ row }">{{ row.b }}</template>
            </el-table-column>
            <el-table-column label="变化">
              <template #default="{ row }">
                <span :class="changeClass(row.change, row.good)">{{ changeText(row.change, row.unit) }}</span>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="failedCompareItems.length" :class="styles.diffSection">
            <h3 :class="styles.diffTitle">失败用例对比（{{ failedCompareItems.length }}）</h3>
            <div v-for="item in failedCompareItems" :key="item.id" :class="styles.diffItem">
              <div :class="styles.diffInput">{{ item.input }}</div>
              <div :class="styles.diffCols">
                <div :class="[styles.diffCol, !item.aPassed && styles.diffColFail]">
                  <span :class="styles.diffTag">A {{ item.aPassed ? '✓' : '✗' }}</span>
                  <div :class="styles.diffText">{{ item.aOutput }}</div>
                </div>
                <div :class="[styles.diffCol, !item.bPassed && styles.diffColFail]">
                  <span :class="styles.diffTag">B {{ item.bPassed ? '✓' : '✗' }}</span>
                  <div :class="styles.diffText">{{ item.bOutput }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else :class="styles.empty">
          <AppIcon name="data-analysis" :size="36" :class="styles.emptyIcon" />
          <p>选择两次完成的评测运行进行对比</p>
        </div>
      </div>

    <!-- 数据集编辑抽屉 -->
    <el-drawer v-model="drawerVisible" :title="editingDataset ? '编辑测试集' : '新建测试集'" size="70%">
      <div :class="styles.drawerBody">
        <div :class="styles.formRow">
          <label>名称</label>
          <el-input v-model="editName" placeholder="测试集名称" style="width: 280px" />
        </div>
        <div :class="styles.formRow">
          <label>描述</label>
          <el-input v-model="editDesc" placeholder="可选描述" style="width: 380px" />
        </div>
        <div :class="styles.drawerToolbar">
          <span :class="styles.hint">{{ editTestcases.length }} 条用例</span>
          <div>
            <el-button size="small" @click="addTestcase">+ 添加用例</el-button>
            <el-upload :show-file-list="false" :before-upload="(f: File) => { importCsv(f); return false }" accept=".csv">
              <el-button size="small"><AppIcon name="upload" :size="12" /> CSV 导入</el-button>
            </el-upload>
          </div>
        </div>

        <el-table :data="editTestcases" border size="small" style="margin-top: 8px">
          <el-table-column label="输入" min-width="180">
            <template #default="{ row }">
              <el-input v-model="row.input" type="textarea" :rows="2" placeholder="测试输入" />
            </template>
          </el-table-column>
          <el-table-column label="期望输出" min-width="160">
            <template #default="{ row }">
              <el-input v-model="row.expectedOutput" type="textarea" :rows="2" placeholder="可选" />
            </template>
          </el-table-column>
          <el-table-column label="评判" width="120">
            <template #default="{ row }">
              <el-select v-model="row.judgeType" size="small">
                <el-option v-for="opt in JUDGE_TYPE_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="评判配置" min-width="160">
            <template #default="{ row }">
              <el-input v-model="row.judgeConfig" :placeholder="JUDGE_TYPE_OPTIONS.find(o => o.value === row.judgeType)?.hint" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="" width="60">
            <template #default="{ $index }">
              <el-button link type="danger" size="small" @click="removeTestcase($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div :class="styles.drawerFooter">
          <el-button @click="drawerVisible = false">取消</el-button>
          <el-button type="primary" @click="saveDataset">保存</el-button>
        </div>
      </div>
    </el-drawer>
</PageShell>
</template>
