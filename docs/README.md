# AI 文档

`@ai-app` — AI 对话式 Schema/Flow 生成微应用 + Agent Workflow 可视化编排

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

## 外部集成

参见 [平台集成指南](../../docs/integration-guide.md#三ai智能助手)：

- qiankun 微前端接入
- WebSocket 流式 API (Socket.IO)
- MCP 协议（5 个 MCP Server）
- Agent Workflow REST API + Webhook
- SDK 独立使用
- 事件协议（30+ 事件类型）

## 文档目录

### 架构总览

- [架构总览](./architecture.md) — 双引擎架构（Chat LangGraph + Agent Workflow）、分层、API 概览

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
