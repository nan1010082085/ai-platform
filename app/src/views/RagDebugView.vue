<script setup lang="ts">
/**
 * RagDebugView - RAG 检索调试界面
 *
 * 对同一 query 并行跑 semantic / rerank / hybrid 三路检索，横向对比召回质量：
 * - 三 Tab 切换查看每路结果
 * - 每条结果可展开看命中 chunk 原文 + 高亮匹配词
 * - rerank 视图标注 rerank 前后排名变化（↑/↓）
 * - 底部显示各路耗时，感知 rerank 成本
 *
 * 与 RoutingDebugView / WorkflowDebugView 并列，构成「路由 / 工作流 / 检索」调试三件套。
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { debugRagSearch } from '@/api/aiApi'
import { resolveErrorText } from '@/constants/errorCodes'
import type { RagDebugItem, RagDebugResult } from '@/types'
import styles from './RagDebugView.module.scss'

type TabKey = 'semantic' | 'rerank' | 'hybrid'

const query = ref('')
const loading = ref(false)
const result = ref<RagDebugResult | null>(null)
const activeTab = ref<TabKey>('rerank')
const expandedIds = ref<Set<string>>(new Set())

// 参数面板
const paramsOpen = ref(false)
const topK = ref(10)
const rerankEnabled = ref(true)
const semanticWeight = ref(0.7)
const keywordWeight = ref(0.3)
const schemaType = ref<string>('')

const history = ref<Array<{ query: string; result: RagDebugResult; timestamp: Date }>>([])

const quickQueries = ['用户注册', '请假审批', '设备台账', '表单权限', '流程节点']

const tabList = computed(() => [
  { key: 'semantic' as TabKey, label: '语义结果', count: result.value?.semantic.length ?? 0 },
  { key: 'rerank' as TabKey, label: 'Rerank 后', count: result.value?.rerank.length ?? 0 },
  { key: 'hybrid' as TabKey, label: 'Hybrid', count: result.value?.hybrid.length ?? 0 },
])

const currentList = computed<RagDebugItem[]>(() => {
  if (!result.value) return []
  return result.value[activeTab.value] ?? []
})

const rerankAvailable = computed(() => result.value?.rerankConfigured ?? false)

async function runSearch() {
  if (!query.value.trim()) {
    ElMessage.warning('请输入查询文本')
    return
  }
  loading.value = true
  result.value = null
  expandedIds.value.clear()
  try {
    const data = await debugRagSearch({
      query: query.value.trim(),
      topK: topK.value,
      type: schemaType.value === 'form' || schemaType.value === 'search_list' ? schemaType.value : undefined,
      rerankEnabled: rerankEnabled.value,
      semanticWeight: semanticWeight.value,
      keywordWeight: keywordWeight.value,
    })
    result.value = data
    // rerank 未配置时默认切到语义 tab
    activeTab.value = data.rerankConfigured && rerankEnabled.value ? 'rerank' : 'semantic'
    history.value.unshift({ query: query.value.trim(), result: data, timestamp: new Date() })
    if (history.value.length > 20) history.value = history.value.slice(0, 20)
  } catch (err) {
    ElMessage.error(resolveErrorText(err, '检索调试失败'))
  } finally {
    loading.value = false
  }
}

function applyQuickQuery(q: string) {
  query.value = q
  runSearch()
}

function loadFromHistory(item: { query: string; result: RagDebugResult }) {
  query.value = item.query
  result.value = item.result
  expandedIds.value.clear()
}

function clearHistory() {
  history.value = []
}

function toggleExpand(id: string) {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

function getScoreClass(score: number): string {
  if (score >= 70) return 'scoreHigh'
  if (score >= 40) return 'scoreMedium'
  return 'scoreLow'
}

function getSchemaTypeLabel(type: string): string {
  const labels: Record<string, string> = { form: '表单', search_list: '查询列表', flow: '流程', document: '文档' }
  return labels[type] ?? type
}

/** 把命中片段按 matchedTerms 高亮拆段 */
function highlightSnippet(snippet: string, terms: string[]): Array<{ text: string; hit: boolean }> {
  if (!terms.length) return [{ text: snippet, hit: false }]
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean)
  if (!escaped.length) return [{ text: snippet, hit: false }]
  const re = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = snippet.split(re)
  return parts.filter((p) => p.length > 0).map((p) => ({
    text: p,
    hit: terms.some((t) => t.toLowerCase() === p.toLowerCase()),
  }))
}
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.scroll">
      <PageHeader
        title="检索调试"
        subtitle="对同一查询并行跑语义 / Rerank / Hybrid 三路检索，横向对比召回质量"
      >
        <template #actions>
          <el-tag v-if="result" :type="rerankAvailable ? 'success' : 'info'" size="small">
            {{ rerankAvailable ? `Rerank: ${result.rerankModel}` : 'Rerank 未配置' }}
          </el-tag>
        </template>
      </PageHeader>

      <div :class="styles.content">
        <!-- 左列：查询 + 参数 + 历史 -->
        <div :class="styles.leftCol">
          <div :class="styles.inputCard">
            <h3 :class="styles.cardTitle">查询</h3>
            <el-input
              v-model="query"
              type="textarea"
              :rows="3"
              placeholder="输入查询文本，例如：用户注册表单、请假审批流程"
              @keydown.ctrl.enter="runSearch"
            />
            <div :class="styles.quickQueries">
              <button
                v-for="q in quickQueries"
                :key="q"
                type="button"
                :class="styles.chip"
                @click="applyQuickQuery(q)"
              >
                {{ q }}
              </button>
            </div>

            <div :class="styles.paramToggle" @click="paramsOpen = !paramsOpen">
              <AppIcon :name="paramsOpen ? 'arrow-down' : 'arrow-up'" :size="12" />
              <span>检索参数</span>
            </div>
            <div v-if="paramsOpen" :class="styles.paramBody">
              <div :class="styles.paramRow">
                <label>Top-K</label>
                <el-slider v-model="topK" :min="1" :max="20" show-input style="flex: 1" />
              </div>
              <div :class="styles.paramRow">
                <label>类型</label>
                <el-select v-model="schemaType" placeholder="全部" clearable style="width: 160px">
                  <el-option label="表单" value="form" />
                  <el-option label="查询列表" value="search_list" />
                </el-select>
              </div>
              <div :class="styles.paramRow">
                <label>Rerank</label>
                <el-switch v-model="rerankEnabled" />
              </div>
              <div :class="styles.paramRow">
                <label>语义权重</label>
                <el-slider v-model="semanticWeight" :min="0" :max="1" :step="0.1" show-input style="flex: 1" />
              </div>
              <div :class="styles.paramRow">
                <label>关键词权重</label>
                <el-slider v-model="keywordWeight" :min="0" :max="1" :step="0.1" show-input style="flex: 1" />
              </div>
            </div>

            <div :class="styles.inputActions">
              <span :class="styles.hint">Ctrl + Enter 检索</span>
              <el-button type="primary" :loading="loading" @click="runSearch">
                <AppIcon name="search" :size="14" style="margin-right: 4px" />
                检索
              </el-button>
            </div>
          </div>

          <div v-if="history.length" :class="styles.historyCard">
            <div :class="styles.historyHeader">
              <h3 :class="styles.cardTitle">检索历史</h3>
              <el-button link type="primary" size="small" @click="clearHistory">清空</el-button>
            </div>
            <div :class="styles.historyList}>
              <div
                v-for="(item, i) in history"
                :key="i"
                :class="styles.historyItem"
                @click="loadFromHistory(item)"
              >
                <div :class="styles.historyMessage">{{ item.query }}</div>
                <div :class="styles.historyMeta">
                  <el-tag size="small" type="info">语 {{ item.result.semantic.length }}</el-tag>
                  <el-tag size="small" type="success">重 {{ item.result.rerank.length }}</el-tag>
                  <el-tag size="small" type="warning">混 {{ item.result.hybrid.length }}</el-tag>
                  <span :class="styles.historyTime">{{ item.timestamp.toLocaleTimeString() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右列：结果对比 -->
        <div :class="styles.rightCol">
          <div :class="styles.resultCard">
            <div :class="styles.tabsRow">
              <button
                v-for="tab in tabList"
                :key="tab.key"
                type="button"
                :class="[styles.tab, activeTab === tab.key && styles.tabActive]"
                @click="activeTab = tab.key"
              >
                {{ tab.label }}
                <span :class="styles.tabCount">{{ tab.count }}</span>
              </button>
            </div>

            <div v-if="!result" :class="styles.empty">
              <AppIcon name="search" :size="36" :class="styles.emptyIcon" />
              <p>输入查询后点击「检索」开始对比</p>
            </div>

            <template v-else>
              <div v-if="currentList.length === 0" :class="styles.empty">
                <AppIcon name="warning-filled" :size="28" />
                <p>该路无召回结果</p>
              </div>

              <div v-else :class="styles.resultList">
                <div
                  v-for="(item, idx) in currentList"
                  :key="item.schemaId"
                  :class="styles.resultItem"
                >
                  <div :class="styles.scoreBlock">
                    <div :class="[styles.resultScore, styles[getScoreClass(item.score)]]">
                      {{ item.score }}
                    </div>
                    <div :class="styles.rankInfo">
                      <span :class="styles.rankIdx">#{{ idx + 1 }}</span>
                      <span
                        v-if="activeTab === 'rerank' && item.beforeRank && item.rankChange !== 0"
                        :class="[styles.rankChange, item.rankChange! > 0 ? styles.rankUp : styles.rankDown]"
                      >
                        <AppIcon :name="item.rankChange! > 0 ? 'arrow-up' : 'arrow-down'" :size="10" />
                        {{ Math.abs(item.rankChange!) }}
                      </span>
                      <span
                        v-else-if="activeTab === 'rerank' && item.beforeRank"
                        :class="styles.rankSame"
                      >不变</span>
                    </div>
                  </div>

                  <div :class="styles.resultContent" @click="toggleExpand(item.schemaId)">
                    <div :class="styles.resultName">
                      {{ item.name }}
                      <span v-if="activeTab === 'rerank' && item.beforeRank" :class="styles.beforeRank">
                        原第 {{ item.beforeRank }}
                      </span>
                    </div>
                    <div v-if="item.description" :class="styles.resultDesc">{{ item.description }}</div>
                    <div :class="styles.resultMeta">
                      <el-tag size="small" :type="item.type === 'form' ? 'primary' : 'success'">
                        {{ getSchemaTypeLabel(item.type) }}
                      </el-tag>
                      <span
                        v-for="field in item.fieldNames.slice(0, 3)"
                        :key="field"
                        :class="styles.fieldChip"
                      >{{ field }}</span>
                      <span v-if="item.widgetTypes.length" :class="styles.resultWidgets">
                        {{ item.widgetTypes.slice(0, 3).join(' · ') }}
                      </span>
                    </div>

                    <div v-if="expandedIds.has(item.schemaId)" :class="styles.snippetBox">
                      <div :class="styles.snippetLabel">
                        <AppIcon name="document-copy" :size="12" />
                        命中片段
                      </div>
                      <div :class="styles.snippetText">
                        <template v-for="(seg, si) in highlightSnippet(result.snippets[item.schemaId]?.snippet ?? '', result.snippets[item.schemaId]?.matchedTerms ?? [])" :key="si">
                          <mark v-if="seg.hit" :class="styles.highlight">{{ seg.text }}</mark>
                          <template v-else>{{ seg.text }}</template>
                        </template>
                      </div>
                      <div v-if="result.snippets[item.schemaId]?.matchedTerms.length" :class="styles.matchedTerms}>
                        匹配词：
                        <span
                          v-for="term in result.snippets[item.schemaId]!.matchedTerms"
                          :key="term"
                          :class="styles.termChip"
                        >{{ term }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 耗时统计 -->
              <div :class="styles.timingsBar">
                <span :class="styles.timing"><AppIcon name="data-line" :size="12" /> 语义 {{ result.timings.semantic }}ms</span>
                <span :class="styles.timing"><AppIcon name="magic-stick" :size="12" /> Rerank {{ result.timings.rerank }}ms</span>
                <span :class="styles.timing"><AppIcon name="filter" :size="12" /> Hybrid {{ result.timings.hybrid }}ms</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
