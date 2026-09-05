# 核心计划：以 Cordis 为中心加载 Expert / Skill / Tool / MCP

- 状态：已落地（R0–R4）
- 日期：2026-09-04
- 范围：优先 `ai/app`；server Registry / pack 契约对齐说明；**不改 server 执行器为 Cordis**（本阶段）
- 前置基座：`plugin-foundation-complete.md`（壳层 + 能力 Service 已闭环）
- 实施计划：`../superpowers/plans/2026-09-04-cordis-centric-registry-loading.md`

---

## 1. 一句话目标

**以 Cordis 宿主为唯一前端能力总线**：原有 Expert / Skill / Tool / MCP 经「Pack 插件或 Registry Bridge」加载并 `register` 进既有 Service；**禁止**一项专家/一条 skill 做成一个 Cordis 插件。

---

## 2. 心智模型（必须统一）

| 概念 | 是什么 | 例子 |
|------|--------|------|
| **Cordis 插件（代码）** | 静态装载的 apply 单元 | `registry-bridge`、`pack.example-support`（可选）、`modules/workflow` |
| **能力数据** | 运行时写入 Service 的条目 | 某个 Expert JSON、某条 Tool、某份 Skill、某 MCP 声明 |
| **Pack** | 可分发的**数据包**（+ 可选静态 Cordis 适配器） | `server/config/plugins/packs/example.support` |
| **Bridge** | 把 Registry HTTP 快照灌进 Cordis 的**唯一入口插件** | 取代散落在 `usePluginRegistry` 里的灌数逻辑 |

```
错误：Expert A → Cordis 插件 A；Expert B → Cordis 插件 B
正确：Pack / Bridge 插件 → register 多条 Expert/Skill/Tool/MCP 数据进 Service
```

---

## 3. 目标架构

```
ensurePluginHost()
  ├─ 能力 Service（已有）
  │    chatTools / nodeTypes / renderers / skillDefs
  │    （可增：mcpDefs 元数据注册表，仅声明/健康，不直连进程）
  ├─ 壳层 Service（已有）
  │    nodePanels / shellNav / shellRoutes
  ├─ registryBridgePlugin          【新建 · 核心】
  │    load(snapshot | fetch)
  │      → chatTools.setOverlay(tools)
  │      → nodeTypes.setDynamic(experts+tools palette)
  │      → skillDefs.syncFromRegistry(skills)
  │      → mcpDefs.setOverlay(mcp)     【若新增】
  └─ （可选）builtinPackPlugins[]     【静态官方包】
       apply 内 register 本 pack 的 builtin 层数据
            （与 overlay 分层：builtin < registry overlay < local patch）

server（保持）
  PluginRegistry + packs + tenants overlay
  GET /api/ai/plugins → snapshot
  MCP 真实连接 / Expert 执行仍在 server
```

**前端 Cordis = 能力可见性与扩展点总线。**  
**Server Registry = 权威数据源与执行侧。**  
两边通过 snapshot 契约对齐，本阶段不把 server 改造成 Cordis 进程。

---

## 4. 与现状差距

| 项 | 现状 | 目标 |
|----|------|------|
| 灌数入口 | `usePluginRegistry.load()` 内直接调 Service | **仅** `registryBridge` 插件负责写入 |
| UI 取数 | 部分仍握一份 experts/tools ref | 优先读 Cordis Service / bridge 投影 |
| Pack | server 目录包；前端无 Cordis 形态 | 契约文档化；可选静态 pack 适配器 |
| MCP | server bridge；前端列表来自 snapshot | 元数据进 `mcpDefs`（或并入既有结构）；连接不进浏览器 |
| 一项一插件 | 未做（正确） | **明确列为非目标** |

---

## 5. 分层与优先级（数据）

与既有一致，Bridge 不得打乱：

```
builtin（代码 pack / 内置常量）
  < registry overlay（GET /plugins + 租户）
  < local patch（用户本地启停 / 本地覆盖）
```

Expert 进 palette：仍是 `nodeTypes` 动态层条目（type=`expert` + expertId），不是新 Service 一种。

---

## 6. 分阶段（核心里程碑）

### Phase R0 — 契约冻结（文档 + 类型）

- 定义 `RegistrySnapshot`（与现 API 对齐）与 `CordisIngest` 映射表  
- 写明 Pack manifest 字段 ↔ Service.register 的对应  
- 非目标清单签字（一项一插件、浏览器动态 import、server Cordis 化）

### Phase R1 — `registry-bridge` 插件（主交付）

- 新建 `src/plugins/plugins/registry-bridge/`  
- API：`ingest(snapshot)` / `refresh(tenantId?)`  
- `usePluginRegistry` **只负责 fetch + 调 bridge.refresh**，禁止再直接 `setOverlay`  
- 单测：ingest 后三层 Service 有数据；二次 refresh 覆盖 overlay  
- PluginCenter / Palette 行为不变

### Phase R2 — UI 只读 Cordis（去第二份状态）

- 工具/技能/节点列表尽量来自 Service 投影（`serviceState`）  
- `usePluginRegistry` 瘦身为「租户选择 + refresh 触发 + 少量 UI 仍需的 id 列表」  
- 门禁：业务组件禁止旁路写入 `chatTools`/`nodeTypes`/`skillDefs`

### Phase R3 — Pack 适配器（可选增强）

- 官方 pack → 静态 `pack.<id>` Cordis 插件，`apply` 写入 **builtin** 层  
- 市场/租户 pack 仍走 server → snapshot → bridge（数据）  
- 示例：`example.support` 对照表进文档

### Phase R4 — MCP 元数据 Service（可选）

- `mcpDefs`：id / transport / namespace / builtin；健康检查仍 composable  
- Runtime Tab 展示 bridge + mcpDefs 探针

---

## 7. 非目标（本核心计划明确不做）

1. 每个 Expert / Skill / MCP JSON = 一个 Cordis 插件文件  
2. 浏览器运行时按 URL 动态 `import` 第三方插件代码  
3. 本阶段将 `server/` 执行栈改为 Cordis Host  
4. 恢复已删除的 harness / DSH 运行时  
5. 破坏现有 GET `/plugins` 对外契约（只改前端消费路径）

---

## 8. 验收标准

| 项 | 证据 |
|----|------|
| Bridge 为唯一写入 overlay 入口 | grep：`setOverlay`/`setDynamic`/`syncFromRegistry` 仅出现在 bridge（+测试） |
| 一项一插件未出现 | 无 `experts/*.ts` Cordis 插件目录 |
| 行为回归 | PluginCenter / Palette / Chat 工具列表与迁前一致 |
| 文档闭环 | 本文 + 实施计划 + `plugin-foundation-complete` 交叉引用 |
| 测试 | bridge 单测 + 既有 plugin 相关测通过 |

---

## 9. 风险与对策

| 风险 | 对策 |
|------|------|
| Bridge 与 UI 双写短暂双轨 | R1 迁完立刻删 UI 直写；禁止过夜双轨 |
| Pack 静态插件与 registry 重复注册 | 严格 builtin vs overlay；同 id overlay 覆盖 |
| MCP 浏览器直连幻想 | 文档写死：连接在 server |
| 范围膨胀到 server Cordis | R0 非目标；另立项 |

---

## 附录 A — Snapshot → Cordis 映射

| `GET /plugins` 字段 | Cordis 写入 |
|---------------------|-------------|
| `tools[]` | `chatTools.setOverlay(registryToolsToDefs(tools))` |
| `experts[]`（runtime 含 workflow 或空） | `nodeTypes.setDynamic` 的 expert palette 项 |
| `tools[]`（palette） | `nodeTypes.setDynamic` 的 tool palette 项 |
| `skills[]` | `skillDefs.syncFromRegistry(skills)` |
| `mcpServers[]` | `mcpDefs.setOverlay`（R4 已落地；连接仍在 server） |

Pack 示例（`server/config/plugins/packs/example.support`）：`manifest.json` + `experts/` + `skills/` + `tools/` + `mcp/` → server 打进 Registry snapshot；前端 **不**为每个文件建 Cordis 插件。

### 附录 B — 官方 Pack 静态适配器（R3）

| server pack 路径 | 前端写入 |
|------------------|----------|
| `tools/kb-tools.json`（如 `kb__search`） | `chatTools.setBase`（追加到 builtin） |
| `skills/example.support-tone.*` | `skillDefs.setBase` |
| `mcp/example.external-kb.json` | `mcpDefs.setBase` |
| `experts/example.support.json` | **不**静态注入 palette；以 registry snapshot → bridge `setDynamic` 为准（默认 disabled 由 server 控制） |

Cordis 插件文件：仅 `ai/app/src/plugins/packs/example-support/index.ts` 一个适配器；须 `ctx.inject(['chatTools','skillDefs','mcpDefs'], …)`。

---

## 10. 建议执行顺序

**R0（0.5d）→ R1（1–2d）→ R2（1d）→ R3/R4 按需。**  
R1 是「以 Cordis 为中心」的最小可宣布完成点。

实施清单：[`../superpowers/plans/2026-09-04-cordis-centric-registry-loading.md`](../superpowers/plans/2026-09-04-cordis-centric-registry-loading.md)
