# AI App UI/UX 修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 UI/UX 审计结论，先止血导航/确认/错误反馈，再统一页面壳与基础可访问性，不重做视觉品牌。

**Architecture:** 只改 `ai/app` 前端。行为修复落在既有 View/Composable；设置分组改 `AiLayout` 结构；页面壳统一复用已有 `PageShell` + `PageHeader`。全屏设计器/执行详情保持独立路由，用明确返回契约补齐上下文，不把画布强塞回 Layout。

**Tech Stack:** Vue 3 + TypeScript + Element Plus + CSS Module + Vitest；图标一律 `AppIcon`（`platform-shared/utils/iconRegistry.ts`）。

**Source audit:**
- 首轮：[ai-app-uiux-audit.canvas.tsx](/Users/yangdongnan/.cursor/projects/Users-yangdongnan-work-schema-platform-ai/canvases/ai-app-uiux-audit.canvas.tsx)
- 整体走查（2026-08-11）：[ai-app-uiux-overall.canvas.tsx](/Users/yangdongnan/.cursor/projects/Users-yangdongnan-work-schema-platform-ai/canvases/ai-app-uiux-overall.canvas.tsx)

## Progress（对照整体走查）

| 里程碑 | Tasks | 状态 |
|--------|-------|------|
| M1 止血 | 1–5 | **已完成** |
| M2 产品闭环 | 6、8 | **已完成**（FullscreenChrome 改为删除，详情保留自建 toolbar + `from=global`） |
| M3 一致性 | 7、9、10 | **已完成**（Evaluation 外层 label 已有；Chat token 试点已做） |
| **M4 全屏页打磨** | **11–13** | **已完成**（commit `84416f2`）；Task 14 P3 仅跟踪 |
| 清理 | theme-tech 死文件 | **已完成**（commit `310009f`） |
| **M5 边角闭环** | **15–18** | Task 16 **已完成**；15 / 17 / 18 **待做** |

---
- 禁止修改 `server/`、禁止跨项目改 `platform-shared`（除非 Task 需要新图标且用户批准切到 platform-shared）
- 禁止编造未注册 AppIcon 名；缺图标先扩展 `iconRegistry.ts`
- 危险操作确认文案用中文，复用 `ElMessageBox.confirm`（与 `useWorkflowActions` / `useModelCenter` 一致）
- 全幅页（Chat / Designer / ExecDetail / Sidebar）继续 **不要** 套 `PageShell`（见 `PageShell.vue` 注释）
- 每个 Task 结束后跑相关 Vitest；禁止以「预存问题」跳过失败
- 提交仅在用户要求时执行；本计划 Step 中的 commit 为可选检查点

---

## File map（将要动到的文件）

| 区域 | 文件 |
|------|------|
| 执行列表 | `app/src/views/AgentExecutionListView.vue`、`AgentExecutionListView.module.scss`、新建 `app/src/__tests__/AgentExecutionListView.spec.ts` |
| 执行详情 | `app/src/views/AgentExecutionDetailView.vue` |
| Chat 确认 | `app/src/views/AiChatView.vue`、可选 `app/src/components/AiChatPanel.vue`、`app/src/locales/zh-CN.ts` / `en.ts` |
| 设置导航 | `app/src/components/AiLayout.vue`、`app/src/locales/zh-CN.ts` / `en.ts` |
| 孤儿页 | `app/src/router.ts`、`app/src/views/PluginMarketView.vue`（挂路由或删除，二选一） |
| 页面壳 | `AgentWorkflowListView.vue`、`AgentExecutionListView.vue`、`ApiKeyManagerView.vue`、`McpManagerView.vue` + 各自 scss |
| a11y | `app/src/components/AiChatPanel.vue`、`AgentWorkflowToolbar.vue`、`AiLayout.vue` |
| 全局执行入口（关联债） | `app/src/router.ts`、`AgentExecutionListView.vue`、`AgentWorkflowListView.vue`、`app/src/api/agentWorkflowApi.ts`（server 已支持 `status`/`trigger`） |
| 执行导航 | `app/src/utils/executionNavigation.ts`、`app/src/__tests__/executionNavigation.spec.ts` |
| 静默失败收口 | `AiMonitorView.vue`、`EvaluationView.vue`、`AgentWorkflowDesignerView.vue` |

---

### Task 1: 修复执行列表「返回」深链（P0）

**Files:**
- Modify: `app/src/views/AgentExecutionListView.vue`（约 176–179 行「返回」按钮）
- Create: `app/src/__tests__/AgentExecutionListView.spec.ts`

**Interfaces:**
- Consumes: 路由名 `agent-workflows`、`agent-workflow-designer`
- Produces: 「返回」始终进入工作流列表，不再 `push` 当前 `agent-workflow-executions`

- [ ] **Step 1: 写失败测试 — 返回按钮目标路由**

```ts
/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AgentExecutionListView from '@/views/AgentExecutionListView.vue'

vi.mock('@/api/agentWorkflowApi', () => ({
  listExecutions: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
  cancelExecution: vi.fn(),
}))

vi.mock('@/composables/useWorkflowExecutionStream', () => ({
  watchRunningWorkflowExecutions: vi.fn(() => () => {}),
}))

describe('AgentExecutionListView back navigation', () => {
  it('返回按钮导航到 agent-workflows 而非自身', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workflows', name: 'agent-workflows', component: { template: '<div />' } },
        {
          path: '/workflows/:id/executions',
          name: 'agent-workflow-executions',
          component: AgentExecutionListView,
        },
        {
          path: '/workflows/:id',
          name: 'agent-workflow-designer',
          component: { template: '<div />' },
        },
      ],
    })
    await router.push({ name: 'agent-workflow-executions', params: { id: '507f1f77bcf86cd799439011' } })
    const wrapper = mount(AgentExecutionListView, {
      global: { plugins: [router], stubs: { PageShell: true, AppIcon: true, TableRowActions: true } },
    })
    await flushPromises()
    const backBtn = wrapper.findAll('button, .el-button').find((b) => b.text().includes('返回'))
    expect(backBtn).toBeTruthy()
    await backBtn!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('agent-workflows')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd app && pnpm exec vitest run src/__tests__/AgentExecutionListView.spec.ts`

Expected: FAIL（当前返回仍停在 `agent-workflow-executions`）

- [ ] **Step 3: 改返回目标**

将：

```vue
<el-button @click="router.push({ name: 'agent-workflow-executions', params: { id: workflowId } })">
  返回
</el-button>
```

改为：

```vue
<el-button @click="router.push({ name: 'agent-workflows' })">
  返回
</el-button>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd app && pnpm exec vitest run src/__tests__/AgentExecutionListView.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit（可选）**

```bash
git add app/src/views/AgentExecutionListView.vue app/src/__tests__/AgentExecutionListView.spec.ts
git commit -m "$(cat <<'EOF'
fix(ai): 执行列表返回跳到工作流列表

EOF
)"
```

---

### Task 2: 执行列表加载失败 ≠ 空态（P1）

**Files:**
- Modify: `app/src/views/AgentExecutionListView.vue`
- Modify: `app/src/views/AgentExecutionListView.module.scss`
- Modify: `app/src/__tests__/AgentExecutionListView.spec.ts`

**Interfaces:**
- Consumes: `api.listExecutions`、`common.retry` / `common.loadFailed` i18n（`zh-CN.ts` 已有）
- Produces: `loadError: Ref<string | null>`；失败时展示错误文案 + 重试，不把 `#empty` 当成无数据

- [ ] **Step 1: 扩展测试 — listExecutions reject 时出现重试**

```ts
it('加载失败时展示错误态并可重试', async () => {
  const api = await import('@/api/agentWorkflowApi')
  vi.mocked(api.listExecutions)
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 })
  // mount 同上…
  await flushPromises()
  expect(wrapper.text()).toMatch(/加载失败|失败/)
  const retry = wrapper.findAll('button, .el-button').find((b) => b.text().includes('重试'))
  await retry!.trigger('click')
  await flushPromises()
  expect(api.listExecutions).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 2: 跑测确认失败**

Run: `cd app && pnpm exec vitest run src/__tests__/AgentExecutionListView.spec.ts`

- [ ] **Step 3: 实现 loadError**

在 `load()` 中：

```ts
const loadError = ref<string | null>(null)

async function load(opts?: { silent?: boolean }) {
  if (!opts?.silent) loading.value = true
  loadError.value = null
  try {
    // …existing validation + listExecutions…
  } catch (e) {
    items.value = []
    total.value = 0
    loadError.value = e instanceof Error ? e.message : '加载失败'
    stopWorkflowWatch?.()
    stopWorkflowWatch = null
  } finally {
    if (!opts?.silent) loading.value = false
  }
}
```

模板：在 table 上方或替换 `#empty` 分支：

```vue
<div v-if="loadError" :class="styles.errorState">
  <p>{{ loadError || t('common.loadFailed') }}</p>
  <el-button type="primary" size="small" @click="load()">{{ t('common.retry') }}</el-button>
</div>
<el-table v-else …>
```

若该页暂无 `useAiLocale`，可先硬编码「加载失败」「重试」，同 Task 再补 i18n。

- [ ] **Step 4: 跑测通过**

- [ ] **Step 5: Commit（可选）**

```bash
git commit -m "fix(ai): 执行列表区分加载失败与空数据"
```

---

### Task 3: 危险操作二次确认（P1）

**Files:**
- Modify: `app/src/views/AgentExecutionListView.vue`（`stopExecution`）
- Modify: `app/src/views/AgentExecutionDetailView.vue`（取消/停止入口）
- Modify: `app/src/views/AiChatView.vue`（`handleClearMessages`、`handleDeleteConversation`）
- Modify: `app/src/locales/zh-CN.ts`、`app/src/locales/en.ts`（确认文案）

**Interfaces:**
- Consumes: `ElMessageBox.confirm(message, title, { type: 'warning' })`
- Produces: 用户取消 confirm 时不调用 `cancelExecution` / 清空 / 删除 API

- [ ] **Step 1: 定位现有 handler**

确认：
- List：`stopExecution(id)` → `api.cancelExecution`
- Detail：取消按钮 → `api.cancelExecution`
- Chat：`handleClearMessages`、`handleDeleteConversation`（`AiChatView.vue`）

- [ ] **Step 2: 写/扩测试 — confirm 取消则不调 API**

对 List，在 spec 中 mock：

```ts
vi.mock('element-plus', async () => {
  const actual = await vi.importActual<typeof import('element-plus')>('element-plus')
  return {
    ...actual,
    ElMessageBox: { confirm: vi.fn() },
    ElMessage: { success: vi.fn(), error: vi.fn() },
  }
})
```

```ts
it('停止执行：用户取消确认时不调用 cancelExecution', async () => {
  const { ElMessageBox } = await import('element-plus')
  vi.mocked(ElMessageBox.confirm).mockRejectedValueOnce('cancel')
  const api = await import('@/api/agentWorkflowApi')
  // mount 带一条 running 的 row，触发停止…
  expect(api.cancelExecution).not.toHaveBeenCalled()
})
```

Chat 可用类似模式测 `handleClearMessages`（抽 composable 则更好测；首版可直接测 View 或把 confirm 包进小函数 `confirmDanger(msg)`）。

- [ ] **Step 3: 实现确认包装**

推荐在页面内局部函数（YAGNI，不先抽全局 util）：

```ts
import { ElMessageBox } from 'element-plus'

async function confirmDanger(message: string, title = '确认'): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, title, {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    })
    return true
  } catch {
    return false
  }
}

async function stopExecution(id: string) {
  const ok = await confirmDanger('确定停止该执行？停止后不可继续当前运行。', '停止执行')
  if (!ok) return
  // …existing cancel…
}
```

Chat：

```ts
async function handleClearMessages() {
  const ok = await confirmDanger('确定清空当前对话消息？此操作不可撤销。', '清空对话')
  if (!ok) return
  // …existing clear…
}

async function handleDeleteConversation(id: string) {
  const ok = await confirmDanger('确定删除该对话历史？此操作不可撤销。', '删除对话')
  if (!ok) return
  // …existing delete…
}
```

- [ ] **Step 4: 手动点路径自检**

1. 执行列表 → 停止 → 取消弹窗 → 状态仍为 running  
2. Chat → 清空 → 取消 → 消息仍在  
3. 历史抽屉删除 → 取消 → 列表项仍在  

- [ ] **Step 5: 跑相关 vitest + Commit（可选）**

```bash
git commit -m "fix(ai): 停止执行与清空/删除对话增加确认"
```

---

### Task 4: 设置下拉分组降噪（P1）

**Files:**
- Modify: `app/src/components/AiLayout.vue`
- Modify: `app/src/locales/zh-CN.ts`、`en.ts`
- Modify: models 图标：`connection` → `cpu`（已在 `iconRegistry` 注册，无需改 platform-shared）

**Interfaces:**
- Consumes: `el-dropdown-menu` / `el-dropdown-item`；可选 `el-dropdown-item` 的 `divided`
- Produces: 视觉分组「配置 / 集成 / 运维」；`settingsNav` 仍驱动 `settingsActive`

- [ ] **Step 1: 重构 settings 数据结构**

```ts
type SettingsNavItem = { path: string; label: string; icon: string; group: 'config' | 'integration' | 'ops' }

const settingsNav = computed<SettingsNavItem[]>(() => [
  { path: '/settings/models', label: t('layout.nav.models'), icon: 'cpu', group: 'config' },
  { path: '/settings/embedding', label: t('layout.nav.embedding'), icon: 'collection', group: 'config' },
  { path: '/settings/templates', label: t('layout.nav.templates'), icon: 'document-checked', group: 'config' },
  { path: '/memory', label: t('layout.nav.memory'), icon: 'data-board', group: 'config' },
  { path: '/integration', label: t('layout.nav.integration'), icon: 'link', group: 'integration' },
  { path: '/settings/keys', label: t('layout.nav.keys'), icon: 'key', group: 'integration' },
  { path: '/mcp', label: t('layout.nav.mcp'), icon: 'set-up', group: 'integration' },
  { path: '/schedules', label: t('layout.nav.schedules'), icon: 'alarm-clock', group: 'ops' },
  { path: '/evaluation', label: t('layout.nav.evaluation'), icon: 'data-analysis', group: 'ops' },
  { path: '/debug/routing', label: t('layout.nav.routingDebug'), icon: 'search', group: 'ops' },
  { path: '/debug/rag', label: t('layout.nav.ragDebug'), icon: 'filter', group: 'ops' },
])
```

- [ ] **Step 2: 模板按组渲染，组间 `divided`**

```vue
<template v-for="(group, gi) in settingsGroups" :key="group.id">
  <el-dropdown-item
    v-for="(item, ii) in group.items"
    :key="item.path"
    :command="item.path"
    :divided="gi > 0 && ii === 0"
  >
    <AppIcon :name="item.icon" :size="14" />
    <span>{{ item.label }}</span>
  </el-dropdown-item>
</template>
```

`settingsGroups` 由 `group` 字段 reduce 得出。

- [ ] **Step 3: i18n 组标题（可选可见标签）**

若 Element Plus 下拉不方便插非 item 标题，仅用 `divided` 分隔即可（YAGNI）。若要组标题，用 disabled item：

```vue
<el-dropdown-item disabled :divided="gi > 0">{{ t(`layout.settingsGroup.${group.id}`) }}</el-dropdown-item>
```

`zh-CN`: `config: '配置'`, `integration: '集成'`, `ops: '运维与调试'`

- [ ] **Step 4: 目视检查**

独立站打开任意页 → 设置齿轮 → 确认三组分隔、models 图标已非 `connection`。

- [ ] **Step 5: Commit（可选）**

```bash
git commit -m "ux(ai): 设置菜单分组并区分模型图标"
```

---

### Task 5: PluginMarket 孤儿页处置（P1）

**Files:**
- Read: `app/src/views/PluginMarketView.vue`
- Modify: `app/src/router.ts` **或** 删除/合并该视图

**Decision gate（实现前二选一，默认 A）：**
- **A（推荐）**：若内容已被 `PluginCenterView` 覆盖 → 删除 `PluginMarketView.vue` 及其 scss，并搜引用清掉
- **B**：若仍是独立能力 → 在 `AiLayout` children 增加 `path: 'plugins/market'`，并从 PluginCenter 链过去

- [ ] **Step 1: 对比 PluginCenter vs PluginMarket 职责**

列出两者标题、API、是否重复。写进 PR/提交说明一句结论。

- [ ] **Step 2A: 删除死代码**

```bash
rg -n "PluginMarket" app/src
# 无引用后
git rm app/src/views/PluginMarketView.vue app/src/views/PluginMarketView.module.scss
```

- [ ] **Step 2B: 挂路由（仅当选 B）**

```ts
{
  path: 'plugins/market',
  name: 'plugin-market',
  component: () => import('./views/PluginMarketView.vue'),
},
```

PluginCenter 增加「打开市场」按钮 → `router.push({ name: 'plugin-market' })`。

- [ ] **Step 3: `pnpm exec vue-tsc --noEmit` 或 `pnpm build` 确认无悬空 import**

- [ ] **Step 4: Commit（可选）**

```bash
git commit -m "chore(ai): 移除未挂路由的 PluginMarket 页面"
```

---

### Task 6: 全屏页返回契约文档化 + 面包屑条（P0 收尾）

**Files:**
- Modify: `app/src/views/AgentWorkflowDesignerView.vue` / `AgentWorkflowToolbar.vue`（确认已有回列表）
- Modify: `app/src/views/AgentExecutionDetailView.vue`（返回执行列表；全局模式时返回 `/executions` — 见 Task 8）
- Create: `app/src/components/common/FullscreenChrome.vue`（极薄顶栏：返回 + 标题 slot）

**Interfaces:**
- Consumes: `router.push`；props `{ backTo: RouteLocationRaw; title: string }`
- Produces: Designer / ExecDetail 统一顶栏返回行为；**不**改路由树、不嵌 AiLayout

- [ ] **Step 1: 抽出 FullscreenChrome**

```vue
<!-- app/src/components/common/FullscreenChrome.vue -->
<script setup lang="ts">
import { useRouter, type RouteLocationRaw } from 'vue-router'
import AppIcon from '@schema-platform/platform-shared/components/common/AppIcon.vue'

defineProps<{ backTo: RouteLocationRaw; title: string }>()
const router = useRouter()
</script>
<template>
  <header :class="$style.bar">
    <button type="button" :class="$style.back" :aria-label="'返回'" @click="router.push(backTo)">
      <AppIcon name="arrow-left" :size="16" />
    </button>
    <h1 :class="$style.title">{{ title }}</h1>
    <div :class="$style.actions"><slot name="actions" /></div>
  </header>
</template>
```

确认 `arrow-left` 已在 iconRegistry；否则用已有 `back`/`arrow-left` 注册名（以 registry 为准）。

- [ ] **Step 2: ExecDetail 接入**

`backTo` 默认 `{ name: 'agent-workflow-executions', params: { id: execution.workflowId } }`。

- [ ] **Step 3: Designer 评估**

若 Toolbar 已有返回且稳定，可只统一 aria-label，不强行替换 UI（避免大改）。在计划执行记录写清「保留 Toolbar」。

- [ ] **Step 4: 手动验证**

列表 → 设计器 → 返回列表；执行列表 → 详情 → 返回执行列表。

- [ ] **Step 5: Commit（可选）**

```bash
git commit -m "ux(ai): 全屏执行详情统一返回契约"
```

---

### Task 7: PageShell / PageHeader 对齐（P2）

**Files:**
- Modify: `AgentWorkflowListView.vue`、`AgentExecutionListView.vue`、`ApiKeyManagerView.vue`、`McpManagerView.vue`（及 module scss 去掉重复 header 样式）

**Interfaces:**
- Consumes: `PageShell`、`PageHeader`（`title` / `subtitle` / `#actions`）
- Produces: 上述页标题区视觉与 RAG/Monitor 一致

- [ ] **Step 1: 以 RagKnowledgeBase 或 AiMonitorView 为样板对照**

复制其：

```vue
<PageShell>
  <PageHeader title="…" subtitle="…">
    <template #actions>…</template>
  </PageHeader>
  …
</PageShell>
```

- [ ] **Step 2: 逐页替换自建 `<h1>` header**

每页一次提交或一个 PR 内分 commit，避免巨 diff。

- [ ] **Step 3: McpManager 套 PageShell（可用 `fill`）**

注意侧栏布局：若内部已是左右分栏，用 `<PageShell fill>`。

- [ ] **Step 4: 目视 4 页边距一致**

- [ ] **Step 5: Commit（可选）**

```bash
git commit -m "refactor(ai): 列表与设置页统一 PageHeader"
```

---

### Task 8: 全局执行列表路由 + 筛选（关联产品债）

> Server 已支持 `?status=&trigger=&workflowId=`（commit `aee4597`）。本 Task 完成审计外的产品闭环。

**Files:**
- Modify: `app/src/router.ts` — 增加 `path: 'executions', name: 'agent-executions'`
- Modify: `app/src/api/agentWorkflowApi.ts` — `listExecutions` 增加 `status?` `trigger?`
- Modify: `app/src/views/AgentExecutionListView.vue` — 全局模式 + 筛选条
- Modify: `app/src/views/AgentWorkflowListView.vue` — 「全部执行」入口
- Modify: `app/src/components/AiLayout.vue` — `activeNav` 已覆盖 `/executions`（确认即可）

**Interfaces:**
- Consumes: `GET /ai/workflow-executions?status=&trigger=&workflowId=&page=&pageSize=`
- Produces: `/executions` 无 `workflowId` param；筛选变更重置 `page=1` 并重新 `load`

- [ ] **Step 1: 扩展 API**

```ts
export function listExecutions(opts?: {
  workflowId?: string
  status?: 'running' | 'success' | 'error' | 'waiting' | 'cancelled'
  trigger?: 'manual' | 'chat' | 'webhook' | 'api' | 'schedule'
  page?: number
  pageSize?: number
}): Promise<{ items: AgentWorkflowExecution[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams()
  if (opts?.workflowId) params.set('workflowId', opts.workflowId)
  if (opts?.status) params.set('status', opts.status)
  if (opts?.trigger) params.set('trigger', opts.trigger)
  if (opts?.page) params.set('page', String(opts.page))
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize))
  const qs = params.toString()
  return request(`/ai/workflow-executions${qs ? `?${qs}` : ''}`)
}
```

更新 `agentWorkflowApi.spec.ts` 断言 query string。

- [ ] **Step 2: 注册路由（须在 `workflows/:id/executions` 旁，注意与顶层 `/executions/:id` 不冲突）**

在 `AiLayout` children：

```ts
{
  path: 'executions',
  name: 'agent-executions',
  component: () => import('./views/AgentExecutionListView.vue'),
},
```

顶层已有 `/executions/:id` 详情，保持不动。

- [ ] **Step 3: ListView 双模式**

```ts
const isGlobal = computed(() => route.name === 'agent-executions')
const filterStatus = ref<string>('')
const filterTrigger = ref<string>('')

// load:
await api.listExecutions({
  workflowId: isGlobal.value ? undefined : validation.id,
  status: filterStatus.value || undefined,
  trigger: filterTrigger.value || undefined,
  page: page.value,
  pageSize: pageSize.value,
})
```

全局模式：表加「工作流」列（`workflowName`）；返回 → `agent-workflows`；筛选 UI：`el-select` 状态 + 触发方式。

单工作流模式：同样展示 status/trigger 筛选（复用同一条 toolbar）。

- [ ] **Step 4: WorkflowList 入口**

Header actions：

```vue
<el-button @click="router.push({ name: 'agent-executions' })">全部执行</el-button>
```

- [ ] **Step 5: 测试 + 手动**

- API spec query  
- ListView：全局路由 mount 不校验 ObjectId  
- 本地/线上：`/executions?status=waiting` 有数据或空表正确  

- [ ] **Step 6: Commit（可选）**

```bash
git commit -m "feat(ai): 全局执行列表与 status/trigger 筛选"
```

---

### Task 9: Chat icon-only a11y + 关键表单可见 label（P2）

**Files:**
- Modify: `app/src/components/AiChatPanel.vue` — 历史 / 设置 / 清空 / 新对话按钮补 `aria-label`
- Modify: 优先 1 个表单重灾页：`EvaluationView.vue` 或 `WorkflowIntegrationView.vue`（选调用更频繁者）— `el-form-item` label

**Interfaces:**
- Consumes: 既有 `t('chat.clearChat')` 等作 aria-label
- Produces: 读屏可读按钮名；表单失焦后仍见字段名

- [ ] **Step 1: AiChatPanel 按钮**

```vue
<button
  :class="$style.actionBtn"
  :aria-label="t('chat.clearChat')"
  :title="t('chat.clearChat')"
  @click="emit('clear-messages')"
>
```

对 `open-conversation-history` / `open-settings` / `new-conversation` 同样处理。

- [ ] **Step 2: 选一页把 placeholder-only 改为 label**

示例：

```vue
<el-form-item :label="t('…')">
  <el-input v-model="…" />
</el-form-item>
```

- [ ] **Step 3: 键盘 Tab 扫过 Chat 顶栏，确认焦点环可见**

若 `actionBtn` 去掉了 outline，补：

```scss
.actionBtn:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Commit（可选）**

```bash
git commit -m "a11y(ai): Chat 操作按钮 aria-label 与焦点态"
```

---

### Task 10: 硬编码色收敛试点（P2，限范围）

**Files:**
- Modify: **仅** `app/src/components/AiChatPanel.module.scss`（或 `<style module>` 段）中出现频率最高的 5–10 个 `#hex` → `var(--ai-*)` / `var(--el-*)`
- Read: `app/src/styles/ai-theme-bridge.scss` 确认可用 token

**Interfaces:**
- Consumes: 既有 CSS 变量，不新增设计体系
- Produces: Chat 顶栏/背景在主题切换下不「花」

- [ ] **Step 1: `rg -n '#[0-9a-fA-F]{3,8}' app/src/components/AiChatPanel*` 列出清单**

- [ ] **Step 2: 映射到 bridge 变量（无对应则保留 hex，不发明新 token）**

- [ ] **Step 3: 明暗主题目视 Chat 页**

- [ ] **Step 4: Commit（可选）**

```bash
git commit -m "style(ai): Chat 面板硬编码色收敛到主题变量"
```

> 全量 1557 处不在本计划范围；后续另开「主题收敛」专项。

---

# M4 — 整体走查新增（全屏页打磨）

> 来源：2026-08-11 整体走查（B+）。M1–M3 行为项已闭环；下列为仍开放的 P1/P2（P3 移动端/全量 hex 仍排除）。

### Task 11: 执行详情加载失败态（P1）

**Files:**
- Modify: `app/src/views/AgentExecutionDetailView.vue`
- Modify: `app/src/views/AgentExecutionDetailView.module.scss`（错误态样式，可对齐 List 的 `errorState`）
- Create 或扩展: `app/src/__tests__/AgentExecutionDetailView.spec.ts`（可选；至少补导航/失败文案断言）

**Interfaces:**
- Consumes: `api.getExecution`、`backToExecutions` / `resolveExecutionDetailBackTo`
- Produces: `loadError: Ref<string | null>`；失败时不留白，展示错误 + 重试 + 返回

- [ ] **Step 1: 复现路径**

人为让 `getExecution` 抛错（断网或 mock reject）→ 确认当前仅 `console.error`，模板 `v-if="execution"` 导致空白。

- [ ] **Step 2: 增加 loadError 状态**

```ts
const loadError = ref<string | null>(null)

onMounted(async () => {
  loadError.value = null
  try {
    const exec = await api.getExecution(executionId())
    execution.value = exec
    startWorkflowWatch()
    await loadExecutionGraph(exec)
    await load()
    if (execution.value?.status === 'waiting') {
      openHitlDialog('approve')
    }
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : '加载执行记录失败'
    console.error('[exec] load failed', err)
  }
})

async function retryLoad() {
  loadError.value = null
  execution.value = null
  // 复用 onMounted 主体，或抽 `bootstrap()`
  await bootstrap()
}
```

- [ ] **Step 3: 模板错误态（与成功态互斥）**

```vue
<div v-if="loadError" :class="styles.errorPage">
  <AppIcon name="warning-filled" :size="32" />
  <p>{{ loadError }}</p>
  <div :class="styles.errorActions">
    <el-button @click="router.push(backToExecutions)">返回列表</el-button>
    <el-button type="primary" @click="retryLoad">重试</el-button>
  </div>
</div>
<div v-else-if="execution" :class="styles.page">
  <!-- 既有 toolbar / 画布 -->
</div>
```

`backToExecutions` 在 `execution` 为空时已由 `resolveExecutionDetailBackTo` 回退到 `agent-executions`（缺 workflowId）。

- [ ] **Step 4: 手测**

非法 id / 断网 → 见错误与重试；重试成功 → 进入正常详情；点返回 → 列表。

- [ ] **Step 5: Commit（可选）**

```bash
git commit -m "fix(ai): 执行详情加载失败展示错误态与重试"
```

---

### Task 12: 设计器 Toolbar + Layout homeBtn a11y（P2）

**Files:**
- Modify: `app/src/components/agent-workflow/AgentWorkflowToolbar.vue`
- Modify: `app/src/components/agent-workflow/AgentWorkflowToolbar.module.scss`（补 `:focus-visible`，对齐 Chat）
- Modify: `app/src/components/AiLayout.vue`（`homeBtn`）

**Interfaces:**
- Consumes: 既有 `title` / tooltip 文案作 `aria-label`
- Produces: 每个 icon-only 按钮同时具备 `aria-label`（与 `title` 同文或更完整）

- [ ] **Step 1: Toolbar 按钮清单**

至少覆盖：返回列表、节点面板、属性面板、连线样式、删除、执行记录、快捷键、版本历史、校验。示例：

```vue
<button
  :class="styles.iconBtn"
  title="返回列表"
  aria-label="返回列表"
  @click="goToList"
>
```

有 `el-tooltip` 的按钮：`aria-label` 用与 tooltip 一致的动态文案（如「隐藏节点面板」/「显示节点面板」）。

- [ ] **Step 2: focus-visible**

```scss
.iconBtn:focus-visible {
  outline: 2px solid var(--ai-color-primary, #0060a2);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Layout homeBtn**

```vue
<button
  :class="$style.homeBtn"
  :title="t('layout.homeTitle')"
  :aria-label="t('layout.homeTitle')"
  @click="goToShellHome"
>
```

- [ ] **Step 4: 键盘 Tab 扫过设计器顶栏与（嵌入态）Layout 首页按钮**

- [ ] **Step 5: Commit（可选）**

```bash
git commit -m "a11y(ai): 设计器工具栏与 Layout 首页按钮 aria-label"
```

---

### Task 13: 静默 catch 改为可见失败（P2）

**Files:**
- Modify: `app/src/views/AiMonitorView.vue`（`loadNodeTypeStats`）
- Modify: `app/src/views/EvaluationView.vue`（`loadWorkflows`）
- Modify: `app/src/views/AgentWorkflowDesignerView.vue`（`listWorkflowVersions` 失败）

**Interfaces:**
- Consumes: `ElMessage.error` 或页面内 `*Error` ref + 空态文案
- Produces: 用户能区分「无数据」与「加载失败」

- [ ] **Step 1: Monitor — 节点类型统计**

```ts
async function loadNodeTypeStats() {
  nodeTypeLoading.value = true
  try {
    nodeTypeStats.value = await getNodeTypeStats()
  } catch (e) {
    nodeTypeStats.value = []
    ElMessage.error(e instanceof Error ? e.message : '加载节点类型统计失败')
  } finally {
    nodeTypeLoading.value = false
  }
}
```

若图表区有空态，失败时可加一行「统计加载失败」；最低要求 toast。

- [ ] **Step 2: Evaluation — 工作流列表**

```ts
async function loadWorkflows() {
  try {
    const list = await listWorkflows()
    workflows.value = list.map((w) => ({ id: w.id, name: w.name, status: w.status }))
  } catch (err) {
    workflows.value = []
    ElMessage.error(resolveErrorText(err, '加载工作流列表失败'))
  }
}
```

- [ ] **Step 3: Designer — 版本历史**

引入 `versionsError` 或复用 toast：

```ts
const versionsLoadError = ref<string | null>(null)

try {
  versionsLoadError.value = null
  versions.value = await api.listWorkflowVersions(workflowId())
} catch (e) {
  versions.value = []
  versionsLoadError.value = e instanceof Error ? e.message : '加载版本历史失败'
}
```

模板：

```vue
<div v-if="versionsLoadError" …>{{ versionsLoadError }}</div>
<div v-else-if="versions.length === 0" …>暂无版本记录</div>
```

- [ ] **Step 4: 手测三处失败路径（mock / 断 API）**

- [ ] **Step 5: Commit（可选）**

```bash
git commit -m "fix(ai): Monitor/评测/版本历史加载失败可见反馈"
```

---

### Task 14: P3 登记（本里程碑不做，仅跟踪）

下列项在整体走查中确认为债，**M4 不实施**，避免范围膨胀：

| 项 | 说明 | 建议专项 |
|----|------|----------|
| 移动端 @media | Layout / Chat / Designer 无断点 | 「桌面优先」文档声明 + 日后移动专项 |
| 裸 hex 收敛 | 组件层仍约百余处非 token | 主题收敛专项（按目录分批） |
| Evaluation 表内 placeholder | 抽屉外层已有 label；单元格内可保留 | 低优先 |
| Debug 清空历史无确认 | WorkflowDebug / RoutingDebug | 与 Chat 确认模式对齐时可做 |
| 画布删节点无确认 | 设计器常见交互 | 默认不做 |
| Sidebar icon-only a11y | `AiSidebarView` | → **M5 Task 16 已完成** |
| `theme-tech.scss` 死文件 | 疑似未 import | 清理专项时删除或重新挂载 |

---

## 执行顺序与依赖

```text
【已完成】
Task 1–13（M1–M4 实施项）+ theme-tech 死文件清理

【跟踪】
Task 14 (P3 登记) — 移动端 / 裸 hex / Debug 确认等，另开专项
```

**建议里程碑**
- **M1（止血）**: Task 1–5 → 已完成  
- **M2（产品闭环）**: Task 6 + 8 → 已完成  
- **M3（一致性）**: Task 7 + 9 + 10 → 已完成  
- **M4（全屏页打磨）**: Task 11–13 → **已完成**；Task 14 跟踪  
- **M5（边角闭环）**: Task 16 → **已完成**；Task 15 / 17 / 18 → 待做  

---

## Self-review

| 审计项 | 对应 Task | 状态 |
|--------|-----------|------|
| P0 返回自指 | Task 1 | 已完成 |
| P0 Layout 断裂 | Task 6 / `from=global` | 已完成（不强行嵌 Layout） |
| P1 设置过载 | Task 4 | 已完成 |
| P1 PluginMarket | Task 5 | 已完成 |
| P1 无确认 | Task 3 | 已完成 |
| P1 静默空表 | Task 2 | 已完成 |
| P2 PageShell | Task 7 | 已完成 |
| P2 Chat aria | Task 9 | 已完成 |
| P2 硬编码色试点 | Task 10 | 已完成 |
| 全局执行+筛选 | Task 8 | 已完成 |
| **P1 详情加载空白** | **Task 11** | **已完成** |
| **P2 Toolbar / homeBtn a11y** | **Task 12** | **已完成** |
| **P2 静默 catch** | **Task 13** | **已完成** |
| P2 响应式 | Task 14 | 排除 / 专项 |
| P3 裸 hex / Debug 确认等 | Task 14 | 排除 / 专项 |

无 TBD/占位步骤；响应式与全量色值明确排除。

---

## 验证清单（整包）

### M1–M3（回归）

- [x] 工作流列表 ↔ 执行列表 ↔ 详情（含 `from=global`）↔ 设计器 返回路径
- [x] 设置下拉分组；清空对话取消；停止执行取消
- [x] `/executions` 筛选 status / trigger
- [x] Chat 顶栏 aria-label；无 plugin-market 断链

### M4（新增）

- [x] 执行详情非法 id / 失败：错误文案 + 重试 + 返回
- [x] 设计器顶栏 Tab 可达，读屏可读按钮名；Layout homeBtn 有 aria-label
- [x] Monitor 节点统计 / 评测工作流下拉 / 版本历史：失败可见，不与空数据混淆
- [ ] `cd app && pnpm exec vitest run`（相关 spec）+ `pnpm build`（提交前按需）

---

# M5 — M4 后复审新增（边角闭环）

> 来源：2026-08-12 复审（总评 A-）。M4 抽查均 pass；下列为仍开放项。

### Task 15: 对话分享页路由闭环（P1）

**Files:**
- Create: `app/src/views/SharedConversationView.vue`（只读展示分享对话）
- Modify: `app/src/router.ts` — 增加 public 路由 `shared/:shareId`
- Modify: `app/src/api/aiApi/conversation.ts` — 若尚无则补 `getSharedConversation(shareId)`
- Modify: `app/src/views/AiChatView.vue` — 分享 URL 与路由 base 对齐（`/shared/:id` 或带 `VITE_ROUTE_BASE`）

**Interfaces:**
- Consumes: 已有后端 `GET /api/ai/conversations/shared/:shareId`（`server/src/ai/routes.ts`）
- Produces: 复制链接可打开只读页；`meta: { public: true }` 免登录

- [ ] **Step 1: API 客户端**

```ts
export async function getSharedConversation(shareId: string): Promise<{
  id: string
  title: string
  messages: unknown[]
  // 按服务端实际字段对齐
}> {
  return request(`/ai/conversations/shared/${encodeURIComponent(shareId)}`)
}
```

确认 `request` 对 public 接口不强制 token（或单独用无鉴权 fetch）。

- [ ] **Step 2: 路由**

```ts
{
  path: '/shared/:shareId',
  name: 'shared-conversation',
  component: () => import('./views/SharedConversationView.vue'),
  meta: { public: true },
},
```

- [ ] **Step 3: SharedConversationView**

加载 shareId → 渲染标题 + 消息只读列表（可复用消息渲染器只读模式）；失败展示错误态；无需套 AiLayout 或套最简壳。

- [ ] **Step 4: 修正复制 URL**

```ts
const base = import.meta.env.BASE_URL?.replace(/\/$/, '') || ''
const url = `${window.location.origin}${base}/shared/${result.shareId}`
```

- [ ] **Step 5: 手测复制链接 → 无痕窗口打开 → 可见消息**

- [ ] **Step 6: Commit（可选）**

```bash
git commit -m "feat(ai): 对话分享公开页与路由闭环"
```

---

### Task 16: AiSidebarView icon-only a11y（P2）

**Files:**
- Modify: `app/src/views/AiSidebarView.vue`

**Interfaces:**
- Consumes: 既有 `title` 文案
- Produces: 历史 / 新对话 / Agent 编排 / 停止生成 均有 `aria-label`

- [x] **Step 1: 补 aria-label**（历史 / 新对话 / Agent 编排 / 停止生成）
- [x] **Step 2: 与 Chat 顶栏同一模式（title + aria-label）**
- [ ] **Step 3: Commit（可选）**

```bash
git commit -m "a11y(ai): Sidebar 顶栏操作按钮 aria-label"
```

---

### Task 17: 属性面板 / Prompt 模板加载失败可见（P2）

**Files:**
- Modify: `app/src/components/PromptTemplateManager.vue`
- Modify: `app/src/components/agent-workflow/property-panel/panels/HandoffNodePanel.vue`
- Modify: `app/src/components/agent-workflow/property-panel/panels/AgentLoopNodePanel.vue`
- Modify: `app/src/components/agent-workflow/property-panel/panels/AgentTeamNodePanel.vue`（同类 ignore）

**Interfaces:**
- Consumes: `ElMessage.error`
- Produces: 失败 toast；下拉不静默成「无数据」

- [ ] **Step 1: PromptTemplateManager**

`catch { /* ignore */ }` → `ElMessage.error(...)` + 保持空列表。

- [ ] **Step 2: Handoff / AgentLoop / AgentTeam**

加载已发布工作流失败时 toast，避免空下拉被误读为「没有已发布流」。

- [ ] **Step 3: 手测断 API 时各面板**

- [ ] **Step 4: Commit（可选）**

```bash
git commit -m "fix(ai): 模板与属性面板工作流列表加载失败可见"
```

---

### Task 18: 批量删除部分失败反馈（P2）

**Files:**
- Modify: `app/src/views/AgentWorkflowListView.vue`（批量删除循环）

**Interfaces:**
- Produces: toast 区分「全部成功」与「成功 N / 失败 M」

- [ ] **Step 1: 累计 fail 数**

```ts
let success = 0
let failed = 0
for (const id of [...]) {
  try {
    await api.deleteWorkflow(id)
    success++
  } catch {
    failed++
  }
}
if (failed === 0) ElMessage.success(`已删除 ${success} 个`)
else ElMessage.warning(`已删除 ${success} 个，失败 ${failed} 个`)
```

- [ ] **Step 2: 手测混合成功/失败**

- [ ] **Step 3: Commit（可选）**

```bash
git commit -m "fix(ai): 批量删除工作流展示部分失败数量"
```

---

### Task 14 补充（P3，仍不实施）

| 项 | 说明 |
|----|------|
| 评测轮询失败静默停表 | EvaluationView `startPolling` catch |
| 调度首载失败像空列表 | ScheduleView |
| Debug 清空无确认 | 低优先 |
| AiConversationList 死代码 | 无引用，清理专项 |
| 移动端 / 裸 hex | 不变 |

---

**M5 执行顺序**

```text
Task 15 (分享页)     P1，优先
Task 16 (Sidebar a11y) 可与 15 并行
Task 17 (面板静默)   可并行
Task 18 (批量删反馈) 可并行
```
