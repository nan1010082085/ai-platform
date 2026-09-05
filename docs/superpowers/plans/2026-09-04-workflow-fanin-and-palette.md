# Workflow Fan-in + Palette UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.  
> **权威详细规格：** 仓库 `docs` 仓 → [`docs/ai/design/workflow-fanin-palette-and-harness.md`](../../../../docs/ai/design/workflow-fanin-palette-and-harness.md)（若本地为 sibling：`../docs/` 视 monorepo 布局而定；本仓完整副本见下方 Spec 摘要）。

**Goal:** 交付显式 `merge` 合流节点（串行就绪汇聚）+ 精简节点面板（工具/专家二级选择），支撑漫剧类多源上下文；Harness 不在本计划范围。

**Architecture:** Executor 改为前驱就绪队列以支持 fan-in join；Palette 停止平铺 Registry 全量工具/专家；类型与校验在 shared，执行在 server，UI 在 ai/app。

**Tech Stack:** Vue 3 · Vue Flow · Koa · Vitest · `@schema-platform/platform-shared`

**Spec:** `docs/ai/design/workflow-fanin-palette-and-harness.md`（完整设计 + Task 列表 + Harness 方向附录）

## Global Constraints

- 中文用户可见文案无 Agent / RAG / MCP（见 `docs/ai/product/nav-and-kb-gaps.md`）
- workflow 仍是数据，不做成 Cordis 插件
- 禁止空 `catch`；图标只用已注册 `AppIcon`
- 跨仓：`shared` → `server` → `ai` / `docs`；前端仓禁止顺手改 server，契约先冻结
- Harness / 真并行 **不做**
- 用户未要求勿 commit

---

## 实施顺序（摘要）

| Wave | 内容 | 主仓 |
|------|------|------|
| W0 | 冻结 `MergeNodeOutput` / 调度契约 | docs + shared 草案 |
| W1 | 面板：停工具/专家平铺、最近使用、折叠 | **ai only** |
| W2 | merge 类型、校验、executor 就绪调度、面板、漫剧模板 | shared + server + ai |
| W3 | 回归、文档、changelog | docs + tests |

详细 checkbox Task 以 Spec 文档 **第六节** 为准，勿在本文件重复维护两份冲突列表。

## Harness

见 Spec **第三节**：仅设计方向，**不排期**。
