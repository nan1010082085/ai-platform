# Cordis 中心 Registry 加载 — 实施计划

> **状态:** ⛔ **已关闭**（2026-09-04）· 勿再执行  
> **关闭原因:** 能力已并入现行插件基座；用户侧说明改由 `docs/ai/` 维护。活跃计划仅保留 [workflow-fanin-and-palette](./2026-09-04-workflow-fanin-and-palette.md)。  
> **历史 Spec:** `ai/docs/design/cordis-centric-registry-loading.md`

**Goal:** （历史）前端以 Cordis 为能力总线；Expert/Skill/Tool/MCP 经 `registry-bridge` 写入 Service。

**Architecture:** Bridge 插件唯一负责 overlay 灌数；UI 只 fetch + refresh；builtin < overlay < patch 不变；MCP 连接留 server。

**Tech Stack:** Vue 3 + Cordis 4.0.1 + 现有 `GET /plugins`；仅改 `ai/app`（R0–R4 已实施）。

**Global Constraints**

- 业务只 `@/plugins`；禁止直接 `@deepseek-ai/cordis`
- 禁止每个 Expert/Skill/MCP 一个 Cordis 插件
- 禁止浏览器动态 import 任意包
- 禁双轨过夜；迁完删 UI 直写
- 禁止改 `server/`（本计划 R0–R2；R3 仅对照 server pack 路径写前端适配器）

---

## Phase R0 — 契约冻结

### Task R0.1: 映射表写入设计文档附录

**Files:**
- Modify: `ai/docs/design/cordis-centric-registry-loading.md`（附录）

- [x] **Step 1:** 附录列出 `RegistrySnapshot` 字段 → Service 方法

- [x] **Step 2:** 注明 Pack `manifest.json` + layers 与 server 现行为一致；前端 R3 接静态 pack 插件

---

## Phase R1 — registry-bridge（主交付）

### Task R1.1: Bridge Service + 插件

**Files:**
- Create: `ai/app/src/plugins/plugins/registry-bridge/`
- Create: `ai/app/src/plugins/__tests__/registryBridge.spec.ts`
- Modify: `ai/app/src/plugins/types.ts`、`host.ts`、`index.ts`

- [x] **Step 1–4:** ingest 实现 + host 装载 + 测通

### Task R1.2: usePluginRegistry 改为只调 Bridge

- [x] **Step 1:** `load()` 仅 `host.registryBridge.ingest(data)`
- [x] **Step 2:** 门禁 — composables/views/components 无 `setOverlay|setDynamic|syncFromRegistry` 调用
- [x] **Step 3:** plugin 相关 vitest 通过

---

## Phase R2 — UI 只读 Cordis

- [x] composable 从 `registryBridge.getSnapshot` / Service list 投影；订阅 `*/changed` 刷新
- [x] 保留 fetch/租户/错误态

---

## Phase R3 — Pack 静态适配器

- [x] `packs/example-support`：`inject` 后写入 `chatTools`/`skillDefs`/`mcpDefs` builtin
- [x] 文档附录 B；无动态 import；overlay 不抹掉 base

---

## Phase R4 — mcpDefs

- [x] `mcpDefs` Service + bridge.ingest 写入
- [x] Runtime 探针（mcpDefs + registryBridge + skillDefs）
- [x] 不在浏览器建 MCP 连接

---

## 完成定义

- [x] 设计文档落地  
- [x] R1 合入：bridge 唯一 overlay 写入  
- [x] grep 门禁通过（业务侧无直写）  
- [x] 相关测通过（`src/plugins/__tests__` 33）  
- [x] R2–R4 已实施  

证据：`pnpm exec vitest run src/plugins/__tests__`；`rg "setOverlay|setDynamic|syncFromRegistry" src/composables src/views src/components` 无匹配。
