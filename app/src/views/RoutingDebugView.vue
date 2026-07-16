<script setup lang="ts">
/**
 * 路由调试 UI — 测试 Expert routing 匹配规则
 */

import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'
import { request } from '@/api/shared/request'
import styles from './RoutingDebugView.module.scss'

interface RouteResult {
  expertId: string
  legacyAgentKey: string
  chainPreview?: string[]
  routeReason: string
  matchedExperts: Array<{
    id: string
    label: string
    legacyAgentKey: string
    routingKeywords: string[]
    routingContextSources: string[]
  }>
}

const message = ref('')
const contextSource = ref<string>('')
const loading = ref(false)
const result = ref<RouteResult | null>(null)
const history = ref<Array<{ message: string; result: RouteResult; timestamp: Date }>>([])

const contextSourceOptions = [
  { label: '自动检测', value: '' },
  { label: 'Editor（表单）', value: 'editor' },
  { label: 'Flow（流程）', value: 'flow' },
  { label: 'Page（页面）', value: 'page' },
  { label: 'Standalone（独立）', value: 'standalone' },
]

async function testRoute() {
  if (!message.value.trim()) {
    ElMessage.warning('请输入测试消息')
    return
  }

  loading.value = true
  try {
    const data = await request<RouteResult>('/ai/debug/route', {
      method: 'POST',
      body: {
        message: message.value.trim(),
        contextSource: contextSource.value || undefined,
      },
    })
    result.value = data
    history.value.unshift({
      message: message.value.trim(),
      result: data,
      timestamp: new Date(),
    })
    if (history.value.length > 20) {
      history.value = history.value.slice(0, 20)
    }
  } catch (err) {
    ElMessage.error((err as Error).message || '路由测试失败')
  } finally {
    loading.value = false
  }
}

function loadFromHistory(item: { message: string; result: RouteResult }) {
  message.value = item.message
  result.value = item.result
}

function clearHistory() {
  history.value = []
}

const routeReasonColor = computed(() => {
  if (!result.value) return ''
  const reason = result.value.routeReason
  if (reason.startsWith('explicit')) return 'success'
  if (reason.startsWith('multi-intent')) return 'warning'
  if (reason.startsWith('pluginRegistry')) return 'primary'
  if (reason.startsWith('general')) return 'info'
  return 'danger'
})
</script>

<template>
  <div :class="styles.page">
    <div :class="styles.scroll">
      <header :class="styles.header">
        <div>
          <h1>路由调试</h1>
          <p :class="styles.subtitle">
            测试 Expert routing 匹配规则，查看消息如何路由到不同专家
          </p>
        </div>
      </header>

      <div :class="styles.content">
        <div :class="styles.inputSection">
          <el-input
            v-model="message"
            type="textarea"
            :rows="3"
            placeholder="输入测试消息，例如：帮我创建一个表单"
            @keydown.ctrl.enter="testRoute"
          />
          <div :class="styles.inputActions">
            <el-select v-model="contextSource" placeholder="上下文来源" clearable style="width: 180px">
              <el-option
                v-for="opt in contextSourceOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-button type="primary" :loading="loading" @click="testRoute">
              <AppIcon name="search" :size="14" style="margin-right: 4px" />
              测试路由
            </el-button>
          </div>
        </div>

        <div v-if="result" :class="styles.resultSection">
          <div :class="styles.resultCard">
            <div :class="styles.resultHeader">
              <h3>路由结果</h3>
              <el-tag :type="routeReasonColor" size="small">
                {{ result.routeReason }}
              </el-tag>
            </div>

            <div :class="styles.resultGrid">
              <div :class="styles.resultField">
                <span :class="styles.label">Expert ID</span>
                <span :class="[styles.value, styles.mono]">{{ result.expertId }}</span>
              </div>
              <div :class="styles.resultField">
                <span :class="styles.label">Legacy Agent Key</span>
                <span :class="[styles.value, styles.mono]">{{ result.legacyAgentKey }}</span>
              </div>
              <div v-if="result.chainPreview?.length" :class="styles.resultField">
                <span :class="styles.label">Multi-Intent Chain</span>
                <div :class="styles.chainPreview">
                  <el-tag
                    v-for="(step, i) in result.chainPreview"
                    :key="i"
                    size="small"
                    :type="i === 0 ? 'primary' : 'info'"
                  >
                    {{ step }}
                  </el-tag>
                </div>
              </div>
            </div>

            <div v-if="result.matchedExperts.length > 0" :class="styles.matchedSection">
              <h4>匹配的专家</h4>
              <el-table :data="result.matchedExperts" size="small" stripe>
                <el-table-column prop="label" label="名称" min-width="120" />
                <el-table-column prop="id" label="ID" min-width="160">
                  <template #default="{ row }">
                    <span :class="styles.mono">{{ row.id }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="legacyAgentKey" label="Legacy Key" width="120" />
                <el-table-column label="关键词" min-width="200">
                  <template #default="{ row }">
                    <div :class="styles.tagRow">
                      <el-tag
                        v-for="kw in row.routingKeywords?.slice(0, 5)"
                        :key="kw"
                        size="small"
                        type="info"
                      >
                        {{ kw }}
                      </el-tag>
                      <el-tag
                        v-if="(row.routingKeywords?.length ?? 0) > 5"
                        size="small"
                        type="info"
                      >
                        +{{ row.routingKeywords!.length - 5 }}
                      </el-tag>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="上下文来源" min-width="150">
                  <template #default="{ row }">
                    <div :class="styles.tagRow">
                      <el-tag
                        v-for="src in row.routingContextSources"
                        :key="src"
                        size="small"
                        type="warning"
                      >
                        {{ src }}
                      </el-tag>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </div>

        <div v-if="history.length > 0" :class="styles.historySection">
          <div :class="styles.historyHeader">
            <h3>测试历史</h3>
            <el-button text size="small" @click="clearHistory">
              清空历史
            </el-button>
          </div>
          <div :class="styles.historyList">
            <div
              v-for="(item, i) in history"
              :key="i"
              :class="styles.historyItem"
              @click="loadFromHistory(item)"
            >
              <div :class="styles.historyMessage">{{ item.message }}</div>
              <div :class="styles.historyMeta">
                <el-tag size="small" :type="item.result.routeReason.startsWith('explicit') ? 'success' : 'info'">
                  {{ item.result.legacyAgentKey }}
                </el-tag>
                <span :class="styles.historyTime">
                  {{ item.timestamp.toLocaleTimeString() }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
