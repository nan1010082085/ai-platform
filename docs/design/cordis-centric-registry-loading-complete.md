# Cordis 中心 Registry 加载 — 完成说明

- 日期：2026-09-04
- Spec：`cordis-centric-registry-loading.md`
- Plan：`../superpowers/plans/2026-09-04-cordis-centric-registry-loading.md`（COMPLETED）

## 落地要点

1. **`registryBridge`**：`ingest(snapshot)` 唯一负责 overlay → `chatTools` / `nodeTypes` / `skillDefs` / `mcpDefs`
2. **`usePluginRegistry`**：只 fetch + `ingest`；UI ref 为 Cordis 投影缓存
3. **`mcpDefs`**：MCP 元数据分层；连接仍在 server
4. **`packs/example-support`**：官方 pack → builtin（须 Cordis `inject`）
5. **Runtime**：探针含 bridge / mcpDefs / skillDefs

## 非目标（仍成立）

- 一项 Expert/Skill/MCP = 一个 Cordis 插件
- 浏览器动态 import / server Cordis 化 / harness 回归
