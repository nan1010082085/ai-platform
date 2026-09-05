# AI App 插件基座剩余 60% — 实施计划与分工

> **状态:** ⛔ **已关闭 · 已完成**（2026-09-04）· 勿再执行  
> **完成说明:** `ai/docs/design/plugin-foundation-complete.md`  
> **活跃计划:** 仅 [workflow-fanin-and-palette](./2026-09-04-workflow-fanin-and-palette.md)

**Goal:** （历史）把 ai/app 补齐到壳层槽位 + 去双轨 + 模块贡献路由。

**Architecture:** 沿用 Cordis 宿主；新增壳层 Service（`nodePanels` / `shellNav` / `shellRoutes`）；UI 只读 Service；功能按模块静态 `ctx.plugin` 贡献 routes/nav/panels。宿主保留鉴权与 Layout 壳。禁止浏览器运行时任意路径动态 import。

**Tech Stack:** Vue 3 + TypeScript + Cordis 4.0.1（精确版本）+ Vitest + Vue Router 4；范围仅 `ai/app`（禁止改 `server/`）。

**Spec:**
- `ai/docs/design/plugin-foundation-gap-60.md`
- `ai/docs/design/what-is-a-real-plugin-panel.md`
- `ai/docs/design/cordis-pluginization-routes-vs-modules.md`
- `ai/docs/design/plugin-architecture-principles.md`

## Global Constraints

- 业务只 `import ... from '@/plugins'`，禁止直接 `@deepseek-ai/cordis`
- 插件代码静态装载；工具/skill/workflow 是数据
- 扩展点迁完必须删除旧 Map/旧拼装，禁止双轨
- 图标只用已注册 `AppIcon` name
- 禁止空 `catch`；错误及时暴露
- 用户未要求时不要 `git commit`；若执行计划里写了 Commit 步骤，执行前再确认用户是否要提交
- 禁止改 `server/`、`editor/`、`flow/`

---

## 分工总览（怎么拆人 / 拆 Agent）

三条轨道，**Wave 1 可部分并行，Wave 2 必须等 Wave 1 合并后再开**。

```
时间 →
Track A 壳层槽位   [==== P0 nodePanels ====][== P2 shellNav ==]
Track B 去双轨           [======== P1 palette/canvas ========]
Track C 模块路由                         （等待）[==== P3 ====][= P4 =]
```

| 轨道 | 负责批次 | 约占另 60% | 前置 | 建议执行者 |
|------|----------|------------|------|------------|
| **A · 壳层槽位** | P0 → P2 | ~25% | 无 | Agent/开发者 A（主轨，先发） |
| **B · 去双轨** | P1 | ~10% | 可与 P0 **并行**（勿同时大改 `host.ts`） | Agent/开发者 B |
| **C · 模块路由** | P3 → P4 | ~25% | **P0+P1+P2 合入后** | Agent/开发者 A 或 C |

### 并行规则

1. **P0 与 P1 可并行**：P0 动 `node-panels` + `useAgentNodePropertyPanel`；P1 动 Palette/Canvas + `usePluginRegistry` 消费方式。约定：**P0 独占 `host.ts` / `types.ts` 的 `nodePanels` 行**；P1 不改这两个文件（已有 `nodeTypes` 够用）。
2. **P2 等 P0 合入后再开**：复用同一套 Service 样板；避免两人同时改 `host.ts`。
3. **P3/P4 单独立项**：路由合并契约在 Wave 1 结束评审一次再动手。
4. **冲突热点**：`plugins/index.ts`、`host.ts`、`types.ts`、`CLAUDE.md` —— 由 Track A 做「合并管家」，B/C 只提接口需求给 A 或 rebase 到 A 之后。

### 里程碑与基座进度

| 里程碑 | 完成条件 | 基座约 |
|--------|----------|--------|
| M-Wave1 | P0+P1+P2 合入，无双轨 | ~75% |
| M-Wave2 | P3+P4 合入，`router.ts` 为工厂 | ~100%（可控扩展点意义下） |

### 职责边界（防扯皮）

| 角色 | 做 | 不做 |
|------|----|------|
| Track A | Service 骨架、面板/导航注册、删旧 Map | 不重写 Palette 拼装逻辑（归 B） |
| Track B | Palette/Canvas 只读 `nodeTypes` | 不新建壳层 Service |
| Track C | 模块目录、`shellRoutes`、迁路由 | 不回潮硬编码 nav/panels |
| 审查门禁 | 每 Task：单测绿 + grep 无旧路径 | 不允许「先双轨再删」过夜 |

---

## 文件地图（目标态）

```
ai/app/src/plugins/
  host.ts                         # + nodePanels / shellNav / shellRoutes 装载
  types.ts                        # Context 扩展
  index.ts                        # 唯一出口
  plugins/
    node-panels/                  # P0 新建
      index.ts                    # NodePanelsService
      types.ts
      builtin.ts                  # 从旧 Map 迁来的 register 表
    shell-nav/                    # P2 新建
      index.ts
      types.ts
      builtin.ts                  # 现有 AiLayout 项迁入
    shell-routes/                 # P3 新建
      index.ts
      types.ts
  modules/                        # P3/P4 新建（功能模块插件）
    workflow/index.ts
    rag/index.ts
    chat/index.ts
    settings/index.ts
    ops/index.ts
    plugins-center/index.ts
```

---

# Wave 1 — 壳层槽位 + 去双轨（P0 / P1 / P2）

## Track A · Task A1: `NodePanelsService` 骨架

**Files:**
- Create: `ai/app/src/plugins/plugins/node-panels/types.ts`
- Create: `ai/app/src/plugins/plugins/node-panels/index.ts`
- Create: `ai/app/src/plugins/__tests__/nodePanels.spec.ts`
- Modify: `ai/app/src/plugins/types.ts`
- Modify: `ai/app/src/plugins/host.ts`
- Modify: `ai/app/src/plugins/index.ts`

**Interfaces:**
- Produces: `NodePanelsService` with:
  - `register(type: string, component: Component): void`
  - `unregister(type: string): void`
  - `resolve(type: string): Component | undefined`
  - `list(): Array<{ type: string }>`
  - event `'nodePanels/changed'`

- [ ] **Step 1: 写失败单测**

```ts
// ai/app/src/plugins/__tests__/nodePanels.spec.ts
import { describe, it, expect, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { startPluginHost, stopPluginHost } from '@/plugins'

describe('nodePanels service', () => {
  afterEach(async () => {
    await stopPluginHost()
  })

  it('register 后 resolve 得到组件；unregister 后为 undefined', async () => {
    const host = await startPluginHost()
    const Comp = defineComponent({ name: 'ProbePanel', render: () => h('div') })
    host.nodePanels.register('probe-type', Comp)
    expect(host.nodePanels.resolve('probe-type')).toBe(Comp)
    host.nodePanels.unregister('probe-type')
    expect(host.nodePanels.resolve('probe-type')).toBeUndefined()
  })
})
```

- [ ] **Step 2: 跑测确认失败**

```bash
cd ai/app && pnpm exec vitest run src/plugins/__tests__/nodePanels.spec.ts
```

Expected: FAIL（`nodePanels` 不存在）

- [ ] **Step 3: 实现 Service（照 renderers 精简版，不做 priority 匹配）**

```ts
// types.ts — export 空即可，或 NodePanelEntry
// index.ts — Service 名 'nodePanels'，Map<string, Component>，register 时 markRaw(component)
```

- [ ] **Step 4: 挂到 `types.ts` / `host.ts` / `index.ts` 导出**

- [ ] **Step 5: 跑测通过**

```bash
cd ai/app && pnpm exec vitest run src/plugins/__tests__/nodePanels.spec.ts
```

Expected: PASS

- [ ] **Step 6:（可选）提交** — 仅当用户要求 commit 时执行

---

## Track A · Task A2: 迁入全部节点面板并删除旧 Map

**Files:**
- Create: `ai/app/src/plugins/plugins/node-panels/builtin.ts`
- Modify: `ai/app/src/plugins/plugins/node-panels/index.ts`（构造时装载 builtin）
- Modify: `ai/app/src/composables/useAgentNodePropertyPanel.ts`（只剩 resolve 封装 + labels）
- Modify: `ai/app/src/__tests__/useAgentNodePropertyPanel.spec.ts`
- Modify: 任何仍 `import { AGENT_NODE_TYPE_LABELS } from '@/composables/useAgentNodePropertyPanel'` 的文件（如 `WorkflowExecutionTimeline.vue`）— labels 可留在 composable 或迁到 `@/plugins`

**Interfaces:**
- Consumes: `host.nodePanels.register` / `resolve`
- Produces: `useAgentNodePropertyPanel().getPanelComponent` → `getPluginHost().nodePanels.resolve(t) ?? DefaultNodePanel`

- [ ] **Step 1: 把原 `registry` Map 的每一对迁到 `builtin.ts`**

格式：

```ts
import { markRaw, type Component } from 'vue'
import type { AgentNodeType } from '@/types/agentWorkflow'
import DefaultNodePanel from '@/components/.../DefaultNodePanel.vue'
// ... 与旧文件相同的 panel imports

/** 内置节点面板表（由 node-panels 插件 register） */
export const BUILTIN_NODE_PANELS: Array<[AgentNodeType, Component]> = [
  ['llm', markRaw(LlmNodePanel)],
  // ... 与旧 Map 完整一致
]
```

- [ ] **Step 2: Service 构造函数里 `for (const [t,c] of BUILTIN_NODE_PANELS) this.register(t,c)`**

- [ ] **Step 3: 瘦身 composable**

```ts
export function useAgentNodePropertyPanel() {
  function getPanelComponent(nodeType: string): Component {
    const host = getPluginHost()
    return host.nodePanels.resolve(nodeType) ?? DefaultNodePanel
  }
  function getNodeTypeLabel(nodeType: string): string {
    return AGENT_NODE_TYPE_LABELS[nodeType] ?? nodeType
  }
  return { getPanelComponent, getNodeTypeLabel }
}
```

注意：调用方须在 `ensurePluginHost()` 之后（应用已如此）；单测需 `startPluginHost`。

- [ ] **Step 4: 更新 `useAgentNodePropertyPanel.spec.ts`：beforeEach start host；覆盖全部 palette 类型仍 resolve 出组件**

- [ ] **Step 5: 跑测**

```bash
cd ai/app && pnpm exec vitest run src/__tests__/useAgentNodePropertyPanel.spec.ts src/plugins/__tests__/nodePanels.spec.ts
```

Expected: PASS

- [ ] **Step 6: 门禁 grep**

```bash
cd ai/app && rg "new Map<AgentNodeType" src/composables/useAgentNodePropertyPanel.ts
```

Expected: 无匹配（旧 Map 已删）

- [ ] **Step 7: 全量回归（本轨相关）**

```bash
cd ai/app && pnpm test
```

---

## Track B · Task B1: Palette 只读 `nodeTypes`

**Files:**
- Modify: `ai/app/src/components/agent-workflow/AgentWorkflowPalette.vue`
- Modify: `ai/app/src/composables/usePluginRegistry.ts`（确认只 `setDynamic`，UI 不二次拼 palette）
- Test: 扩展或新增 `ai/app/src/plugins/__tests__/nodeTypes.spec.ts` 消费路径说明；必要时组件测

**Interfaces:**
- Consumes: `getPluginHost().nodeTypes.listEnabled()` 或现有 `list()` + disabled 过滤（以 `node-types/index.ts` 已有 API 为准，禁止再发明一套）
- Produces: Palette 单一数据源

- [ ] **Step 1: 读清 `NodeTypesService` 现有 API**（`list` / `listEnabled` / `setDynamic`）

- [ ] **Step 2: 改 `AgentWorkflowPalette.vue`**

禁止：

```ts
...AGENT_PALETTE_ITEMS,
// + experts/tools 本地 map
```

改为：经 `@/plugins` 的 `serviceState` 或 composable 订阅 `nodeTypes/changed`，渲染 `host.nodeTypes` 列表。

- [ ] **Step 3: 确认 `usePluginRegistry` 在拉取 registry 后只调用 `host.nodeTypes.setDynamic([...])`，不把第二套数组直接喂给 Palette**

- [ ] **Step 4: 门禁 grep**

```bash
cd ai/app && rg "AGENT_PALETTE_ITEMS" src/components/agent-workflow/AgentWorkflowPalette.vue
```

Expected: 无匹配（或仅注释说明「已迁 Service」——优先无匹配）

- [ ] **Step 5: 跑 `nodeTypes` 单测 + 手动/已有 workflow 相关测**

```bash
cd ai/app && pnpm exec vitest run src/plugins/__tests__/nodeTypes.spec.ts
```

---

## Track B · Task B2: Canvas 槽位去手写双轨

**Files:**
- Modify: `ai/app/src/components/agent-workflow/AgentWorkflowCanvas.vue`

**Interfaces:**
- Consumes: `nodeTypes.list()`（含 dynamic tool/expert）
- Produces: 统一 `node-*` 槽或通用节点组件；未知类型兜底

- [ ] **Step 1: 现状确认** — 文件内 `v-for="item in AGENT_PALETTE_ITEMS"` + tool/expert 单独 slot

- [ ] **Step 2: 改为遍历 `nodeTypes` 全量列表生成槽位**（tool/expert 若已在 dynamic 层则不必手写）

- [ ] **Step 3: 门禁**

```bash
cd ai/app && rg "AGENT_PALETTE_ITEMS" src/components/agent-workflow/AgentWorkflowCanvas.vue
```

Expected: 无匹配

- [ ] **Step 4: 相关测试 / 类型检查**

```bash
cd ai/app && pnpm typecheck && pnpm exec vitest run src/plugins/__tests__/nodeTypes.spec.ts
```

---

## Track A · Task A3: `ShellNavService` + AiLayout 消费

**Depends:** Task A1 合入（`host`/`types` 模式稳定）

**Files:**
- Create: `ai/app/src/plugins/plugins/shell-nav/types.ts`
- Create: `ai/app/src/plugins/plugins/shell-nav/index.ts`
- Create: `ai/app/src/plugins/plugins/shell-nav/builtin.ts`
- Create: `ai/app/src/plugins/__tests__/shellNav.spec.ts`
- Modify: `ai/app/src/plugins/types.ts`、`host.ts`、`index.ts`
- Modify: `ai/app/src/components/AiLayout.vue`

**Interfaces:**
- Produces:

```ts
interface ShellNavItem {
  id: string
  path: string
  /** i18n key，如 layout.nav.chat；Layout 内 t(labelKey) */
  labelKey: string
  icon: string
  group: 'primary' | 'settings'
  /** settings 子组 */
  settingsGroup?: 'config' | 'integration' | 'ops'
  order: number
  /** 可选：active 前缀匹配 */
  activeMatch?: 'exact' | 'prefix'
}
```

- `register(item: ShellNavItem): void`
- `list(group?: 'primary' | 'settings'): ShellNavItem[]`（按 order 排序）

- [ ] **Step 1: 单测 register/list 排序与按 group 过滤**（先写失败测）

- [ ] **Step 2: 实现 Service + builtin（把 AiLayout 现有 primaryNav/settingsNav 迁入，label 改为 labelKey）**

- [ ] **Step 3: `AiLayout.vue` 删除本地数组，改为：**

```ts
const host = getPluginHost()
const primaryNav = computed(() =>
  host.shellNav.list('primary').map((i) => ({
    path: i.path,
    label: t(i.labelKey),
    icon: i.icon,
  })),
)
// settings 同理 + settingsGroup
```

注意：`getPluginHost()` 在 setup 时宿主已启动（`main.ts`）；若需响应启停可用 `serviceState`。

- [ ] **Step 4: 跑测 + 目测顶导/设置下拉项数量与迁移前一致**

- [ ] **Step 5: 门禁**

```bash
cd ai/app && rg "path: '/workflows'" src/components/AiLayout.vue
```

Expected: 无匹配（项已不在 Layout 内硬编码）

---

## Wave 1 合流验收（合并官 / Track A）

- [ ] `pnpm test` 全绿（`ai/app`）
- [ ] `pnpm typecheck` 通过
- [ ] grep 门禁：

```bash
cd ai/app
rg "new Map<AgentNodeType" src/composables || true
rg "AGENT_PALETTE_ITEMS" src/components/agent-workflow/AgentWorkflowPalette.vue src/components/agent-workflow/AgentWorkflowCanvas.vue || true
rg "primaryNav = computed" src/components/AiLayout.vue || true
```

- [ ] 更新 `ai/CLAUDE.md` 插件规则：补 `nodePanels` / `shellNav`
- [ ] 更新 `plugin-foundation-gap-60.md` 状态：Wave 1 ✅

**此时基座 ≈ 75%。通知 Track C 可开 Wave 2。**

---

# Wave 2 — 模块插件 + 路由贡献（P3 / P4）

## Track C · Task C1: `ShellRoutes` 契约与工厂

**Files:**
- Create: `ai/app/src/plugins/plugins/shell-routes/types.ts`
- Create: `ai/app/src/plugins/plugins/shell-routes/index.ts`
- Create: `ai/app/src/plugins/__tests__/shellRoutes.spec.ts`
- Modify: `ai/app/src/plugins/types.ts`、`host.ts`、`index.ts`
- Modify: `ai/app/src/router.ts` → 瘦身为工厂
- Modify: `ai/app/src/main.ts`（确保 `ensurePluginHost` **await 完成后再** `createAiRouter`）

**Interfaces:**

```ts
type ShellLayout = 'ai-layout' | 'bare' | 'public'

interface ShellRouteContribution {
  name: string
  path: string
  /** 静态 import 的组件或懒加载工厂——模块文件内定义，禁止字符串动态 path import */
  component: RouteComponent | (() => Promise<unknown>)
  layout: ShellLayout
  meta?: { public?: boolean }
  order?: number
}
```

- `register(route: ShellRouteContribution): void`
- `list(): ShellRouteContribution[]`
- `createAiRouter` 将 `layout:'ai-layout'` 的项收成 AiLayout children；`bare`/`public` 为顶层路由
- **宿主保留硬编码：** `login`、`auth-callback`（或由 `shell` 核心模块贡献，但鉴权 guard 仍在工厂内）

- [ ] **Step 1: 单测 — register 两条不同 layout，list 含两者且 order 稳定**

- [ ] **Step 2: 实现 Service**

- [ ] **Step 3: 改 `main.ts` 启动序**

```ts
await ensurePluginHost()
router = createAiRouter(currentRouteBase) // 内部读 host.shellRoutes.list()
```

（若当前是 `void ensurePluginHost()`，改为 await，避免路由先于贡献注册。）

- [ ] **Step 4: 先做「过渡」：一个 `plugins/plugins/shell-routes/builtin-from-legacy.ts` 把现有 `router.ts` 路由表原样 register，工厂读 list —— 行为零变化**

- [ ] **Step 5: 删除 `router.ts` 内联大数组；跑全量测 + 手动点开 chat/workflows/designer/login**

---

## Track C · Task C2: 拆功能模块插件（迁贡献，删 builtin-from-legacy）

**Files:**
- Create: `ai/app/src/plugins/modules/workflow/index.ts`
- Create: `ai/app/src/plugins/modules/rag/index.ts`
- Create: `ai/app/src/plugins/modules/chat/index.ts`
- Create: `ai/app/src/plugins/modules/settings/index.ts`
- Create: `ai/app/src/plugins/modules/ops/index.ts`
- Create: `ai/app/src/plugins/modules/plugins-center/index.ts`
- Modify: `host.ts` — `ctx.plugin(workflowModule)` 等
- Delete/empty: legacy 整表 builtin（迁完即删）

**模块贡献清单（分工表）**

| 模块插件 | routes（示意） | nav | panels |
|----------|----------------|-----|--------|
| `chat` | `/` chat；`/sidebar`；`/shared/:shareId` | primary chat | — |
| `workflow` | workflows/executions/designer/detail/templates | primary workflows；settings templates | **接管 nodePanels builtin 注册** |
| `rag` | `/rag`；`/debug/rag` | primary rag；settings ragDebug | — |
| `plugins-center` | `/plugins`；`/mcp` | primary plugins；settings mcp | — |
| `settings` | models/embedding/keys/memory/integration | settings 组 | — |
| `ops` | monitor/schedules/evaluation/debug/routing | primary monitor；settings ops | — |

- [ ] **Step 1: 按上表逐个模块 migrate（建议顺序：ops → rag → settings → plugins-center → chat → workflow）**  
  每迁一个模块：从 legacy builtin 删除对应项 → 模块内 register → 测该路由可进。

- [ ] **Step 2: workflow 模块接管 `BUILTIN_NODE_PANELS` 注册**（从 node-panels 构造函数挪到 module apply）

- [ ] **Step 3: 确认无遗漏路由**

```bash
cd ai/app && rg "name: '" src/plugins/modules src/plugins/plugins/shell-routes
# 对照原 router 名单
```

- [ ] **Step 4: 全量 `pnpm test` + `pnpm typecheck`**

---

## Track C · Task C3: P4 收尾与文档

**Files:**
- Modify: `ai/CLAUDE.md`
- Modify: `ai/docs/design/plugin-foundation-gap-60.md`（状态 100%）
- Modify: `ai/docs/design/plugin-architecture-principles.md`（壳层 Service 表）
- Modify: `docs/ai/app/architecture.md`（若有壳层描述）
- Optional: `probes` Service — **仅当 Wave 2 有余力**；否则记入 backlog，不阻塞关闭

- [ ] **Step 1: 文档与规则同步壳层 Service 名单**
- [ ] **Step 2: 最终门禁脚本（可放 `ai/app/scripts/check-plugin-dual-track.mjs` 或 CI 一步）**

检查：
- 无 `useAgentNodePropertyPanel` 内 Map
- Palette/Canvas 不直接依赖 `AGENT_PALETTE_ITEMS`
- AiLayout 无硬编码 path 列表
- `router.ts` 无整表 children 字面量（仅工厂）

- [ ] **Step 3: 宣布 M-Wave2 完成；ima-upload 进度**

---

## 任务索引（给排期用）

| ID | 轨道 | 名称 | 预估 | 并行 |
|----|------|------|------|------|
| A1 | A | NodePanelsService 骨架 | S | 先发 |
| A2 | A | 迁面板 + 删 Map | M | 接 A1 |
| B1 | B | Palette 单源 | S–M | ∥ A2 |
| B2 | B | Canvas 去双轨 | S | 接 B1 |
| A3 | A | ShellNav + Layout | S–M | 接 A1 合入后 |
| W1 | A | Wave1 合流验收 | S | 等 A2+B2+A3 |
| C1 | C | ShellRoutes 工厂 | M | 接 W1 |
| C2 | C | 六模块迁贡献 | L | 接 C1 |
| C3 | C | 文档/门禁 | S | 接 C2 |

S ≈ 0.5–1d · M ≈ 1–2d · L ≈ 3–5d（单人量级）

---

## Self-Review（计划自检）

| Spec 要求 | 对应 Task |
|-----------|-----------|
| nodePanels 真正插件面板 | A1, A2 |
| 去 Palette/Canvas 双轨 | B1, B2 |
| shellNav | A3 |
| shellRoutes + 模块 | C1, C2 |
| 文档/收尾 | W1, C3 |
| 不做 harness / 动态 import / 改 server | Global Constraints |
| 禁双轨 | 各 Task 门禁 grep |

无 TBD 占位；接口名前后一致：`nodePanels` / `shellNav` / `shellRoutes`。

---

## 执行方式（选一种）

计划已保存到 `ai/docs/superpowers/plans/2026-09-04-plugin-foundation-remaining-60.md`。

**1. Subagent-Driven（推荐）** — 每 Task 新开 subagent，Task 间审查  
**2. Inline Execution** — 本会话按 Task 推进，Wave 1 设检查点  

**并行开工建议：** 先派 **A1**；A1 合入后同时开 **A2∥B1**；A1 合入后开 **A3**；全部完成后进 C。
