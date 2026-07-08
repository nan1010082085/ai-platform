# AI 文档

`@ai-app` — **开源应用能力小平台**（Agent 编排、RAG、插件、对话、对外集成），与 editor / flow 共用 JWT，并通过 Sidebar 为设计器提供 AI 助手。

**必读**：[能力平台定位](./platform.md) — 三能力一体、JWT 通用、凭证模型、小平台边界。

## 快速开始

```bash
pnpm dev:ai                          # 启动开发服务器（端口 5300）
pnpm --filter @ai-app build          # 构建前端
cd ai/shared && pnpm build           # 构建 ai-shared（跨仓消费时需要）
```

## 包结构

| 包 | 目录 | 说明 |
|---|---|---|
| `@ai-app` | `ai/app/` | Vue 3 微前端：Chat、RAG、监控、工作流设计器 |
| `@ai-sdk` | `ai/sdk/` | 独立 Agent 框架（无 LangGraph） |
| `@schema-platform/ai-shared` | `ai/shared/` | 跨端类型、事件、Prompt、工作流域模型 |
| `@schema-platform/workflow-client` | `ai/workflow-client/` | Open Workflow API 客户端（外部系统集成） |

**SDK 选型**：[sdk.md](./sdk.md) — 集成凭证与 `workflow-client` / `@ai-sdk`

## 外部集成

- [集成与 SDK](./sdk.md) — invoke 入口、用户平台 Key、工作流 Key
- WebSocket 流式 API (Socket.IO)
- MCP 协议（插件中心配置）
- `@schema-platform/workflow-client`
- `@ai-sdk`（独立 Agent，不依赖本平台 server）

## 文档目录

### 产品与迭代

- **[开源小平台总路线图](./product/open-platform-roadmap.md)** — Phase A～I、**§七全量任务索引**、排期
- **[开源迭代计划](./product/open-source-iteration.md)** — 基线 1.0 回归、各 Phase 可执行拆解与状态
- **[能力平台定位](./platform.md)** — editor / flow / ai 一体、JWT、双 Key
- [未完成任务与进度](./product/backlog.md) — **进度入口**（进行中 Phase 一览）
- [五项迭代计划与进度](./product/ai-five-phase-iteration.md) — 历史：术语 / Skills / 导航 / Workflow WS
- [Workflow 术语表](./product/workflow-terminology.md) — 入口节点 vs 调用通道

### 插件中心

- **[插件中心（独立文档）](./plugin.md)** — 架构、配置、生产清单、CLI、待办
- [plugin-registry.md](./plugin-registry.md) / [plugin-roadmap.md](./plugin-roadmap.md) — 迁移指针

### 架构总览

- [架构总览](./architecture.md) — 双引擎 + **基线 1.0**（pluginExpert、expert/tool 节点、invoke-only）

### Chat LangGraph

- [Agent 系统](./agent.md) — 5 种专家 Agent、执行流程、协作机制
- [事件协议](./events.md) — v1/v2 事件类型、WebSocket 传输、HITL

### Agent Workflow

- [工作流编排](./agent-workflow.md) — 节点参考、模板、执行引擎、REST API、设计器 UI

### 工具与协议

- [工具系统](./tool.md) — MCP 与 LangGraph 工具、注册表、扩展
- [MCP 协议](./mcp.md) — 5 个 MCP Server、Bridge 架构

### 共享包

- [ai-shared API](./ai-shared.md) — 类型、导出、工具名、Prompt 构建器

### 运维

- [环境变量清单](./environment-variables.md) — 全部环境变量说明、最小配置示例

### 产品设计（线框 & 交互流）

- [设计文档索引](./design/README.md) — 页面线框、Mermaid 交互流
- [信息架构与布局](./design/overview.md) — 导航、嵌入模式、Store 关系
- [AI 对话设计](./design/chat.md) — Chat / 侧边栏 / LangGraph vs Workflow
- [Agent 编排设计](./design/workflows.md) — 设计器、执行监控、Webhook
- [Workflow 开放 API](./design/workflow-open-api.md) — **已收敛至 invoke**（历史设计稿指针）
- [RAG 知识库设计](./design/rag.md) — 索引管理、检索测试、Chat 内联 RAG
- [运行时架构](./design/runtime.md) — LangGraph / Workflow Executor / RAG 执行图
