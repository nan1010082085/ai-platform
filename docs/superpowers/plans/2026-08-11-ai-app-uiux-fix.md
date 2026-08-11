# AI App UI/UX 修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 UI/UX 审计结论，先止血导航/确认/错误反馈，再统一页面壳与基础可访问性，不重做视觉品牌。

**Architecture:** 只改 `ai/app` 前端。行为修复落在既有 View/Composable；设置分组改 `AiLayout` 结构；页面壳统一复用已有 `PageShell` + `PageHeader`。全屏设计器/执行详情保持独立路由，用明确返回契约补齐上下文，不把画布强塞回 Layout。

**Tech Stack:** Vue 3 + TypeScript + Element Plus + CSS Module + Vitest；图标一律 `AppIcon`（`platform-shared/utils/iconRegistry.ts`）。

**Source audit:** [ai-app-uiux-audit.canvas.tsx](/Users/yangdongnan/.cursor/projects/Users-yangdongnan-work-schema-platform-ai/canvases/ai-app-uiux-audit.canvas.tsx)

## Global Constraints

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
| a11y | `app/src/components/AiChatPanel.vue` |
| 全局执行入口（关联债） | `app/src/router.ts`、`AgentExecutionListView.vue`、`AgentWorkflowListView.vue`、`app/src/api/agentWorkflowApi.ts`（server 已支持 `status`/`trigger`） |

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

## 执行顺序与依赖

```text
Task 1 (返回) ──┐
Task 2 (错误态) ─┼─► Task 8 (全局列表复用 ListView，依赖 1/2 稳定)
Task 3 (确认) ───┘
Task 4 (设置分组)     可并行
Task 5 (PluginMarket) 可并行
Task 6 (全屏契约)     建议在 1 之后；与 8 的 backTo 协调
Task 7 (PageShell)    可与 8 并行，注意 ListView 冲突时串行
Task 9 (a11y)         可并行
Task 10 (色值试点)    最后，避免与大改 UI 冲突
```

**建议里程碑**
- **M1（止血）**: Task 1–5  
- **M2（产品闭环）**: Task 6 + 8  
- **M3（一致性）**: Task 7 + 9 + 10  

---

## Self-review

| 审计项 | 对应 Task |
|--------|-----------|
| P0 返回自指 | Task 1 |
| P0 Layout 断裂 | Task 6（契约，不强行嵌 Layout） |
| P1 设置过载 | Task 4 |
| P1 PluginMarket | Task 5 |
| P1 无确认 | Task 3 |
| P1 静默空表 | Task 2 |
| P2 PageShell | Task 7 |
| P2 aria | Task 9 |
| P2 表单 label | Task 9（一页试点） |
| P2 硬编码色 | Task 10（试点） |
| P2 响应式 | **本计划不做**（声明桌面优先；另开专项） |
| 全局执行+筛选 | Task 8（审计后续产品项） |

无 TBD/占位步骤；响应式明确排除以免范围膨胀。

---

## 验证清单（整包）

- [ ] `cd app && pnpm test`（或至少本计划新增/修改的 spec）
- [ ] `cd app && pnpm build`
- [ ] 手测：工作流列表 ↔ 执行列表 ↔ 详情 ↔ 设计器 返回路径
- [ ] 手测：设置下拉分组；清空对话取消；停止执行取消
- [ ] 手测：`/executions` 筛选 status=waiting / trigger=webhook
