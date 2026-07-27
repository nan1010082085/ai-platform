# Schema Platform AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D%2020-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.0-brightgreen.svg)](https://vuejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-green.svg)](https://www.mongodb.com/)

**表单/流程垂直场景的 AI 应用平台** — 对话 Agent、可视化工作流编排、RAG 知识库、评测体系、插件中心。

> 不是通用 AI 平台（Dify/n8n 的赛道），而是"表单/流程 + AI"垂直场景的最佳选择。

**[文档](./docs)** | **[贡献指南](./CONTRIBUTING.md)** | **[更新日志](./CHANGELOG.md)** | **[安全](./SECURITY.md)**

---

## 核心能力

### 🤖 AI Chat（LangGraph 多专家）

多专家对话 Agent，支持需求分析、任务规划、工具调用。通过插件中心配置专家，无需改代码扩展新领域。

- LangGraph StateGraph 架构（10 节点 + 条件路由）
- 专家匹配 + 多意图链 + 协作路由
- 流式输出 + 思考链展示
- HITL 中断/恢复（`request_user_input` 工具触发暂停，用户反馈后继续）

### 🔧 Agent Workflow（可视化 DAG 编排）

n8n 风格可视化工作流编辑器，**32 种节点类型**：

| 类别 | 节点 |
|------|------|
| **触发器** | 手动触发、Webhook 触发、定时触发（cron） |
| **AI 节点** | LLM、Agent Loop（自主循环）、Agent Team（多 Agent 协作）、意图路由、需求分析、任务规划、任务链、协作路由、摘要 |
| **文档处理** | 文档解析、视觉分析、音频转录、视频分析、图片生成、视频生成、PPT 生成 |
| **逻辑控制** | 条件分支（if）、多路分支（switch）、变量赋值、代码执行（JS 沙箱） |
| **人工介入** | HITL 人工审批（暂停→确认→继续） |
| **垂直场景** | 审批建议、流程交互、合规检查、模块组装、表单查询、异常检测、图表生成 |

发布后通过 REST API 或 Webhook 调用，支持多版本管理。

### 📚 RAG 知识库

- 向量检索 + 关键词 fallback + **Rerank 重排**（BGE-Reranker）
- **Hybrid 混合检索**（语义 + 关键词加权融合）
- **检索调试视图**（三路对比：语义/Rerank 后/Hybrid，命中片段高亮）
- 文档上传 + 自动索引 + 分段策略
- 默认 embedding：SiliconFlow 托管 BGE-M3

### 📊 评测体系

离线评测 workflow 质量，量化"改了 prompt/换了模型"是好是坏：

- **数据集管理**（CRUD + CSV 导入）
- **评测运行**（选目标 workflow + 数据集 + 评判方式）
- **结果对比**（两版本横向对比：通过率/耗时/token/LLM 评分）
- 评判方式：关键词命中 / 正则匹配 / LLM-as-judge

### 🔌 插件中心

JSON 配置 Experts、Skills、Tools、MCP servers。热重载，CLI 打包安装。

### 🔗 外部集成

```bash
curl -X POST http://localhost:3001/api/ai/workflows/invoke/your-slug \
  -H "X-Workflow-Key: wf_your_key" \
  -H "Content-Type: application/json" \
  -d '{"input": "your data"}'
```

---

## 31 个行业模板

按 10 个分类覆盖主流业务场景：

| 分类 | 模板 |
|------|------|
| **通用** | 智能助手问答、需求门控构建、智能建议、行动方案 |
| **文档** | 文档摘要、文档图片识别、Excel 报表、多文档对比、结构化提取 |
| **助手** | 图文生成、PPT 生成、图片分析、多模态图文、视频营销 |
| **客服** | 工单分流、知识库问答、情感升级 |
| **审计** | 内容合规、合同风险标注、FAQ 质量检查 |
| **HR** | 简历筛选 |
| **财务** | 报销单审核 |
| **运营** | 客户反馈分析 |
| **集成** | HTTP 通知、Webhook 批量派发 |
| **批处理** | 多文档批处理、RAG 摄入 QA |

---

## 架构

```
浏览器 (port 5300)
  └─ ai/app (Vue 3 SPA)
       ├─ REST API ──→ server (Koa, port 3001)
       └─ WebSocket ──→ server (Socket.IO)
                           ├─ MongoDB（schema/conversation/workflow/embedding/telemetry）
                           ├─ BullMQ + Redis（workflow 执行队列，自动重试）
                           ├─ LLM（DeepSeek/OpenAI/Anthropic/自定义）
                           ├─ RAG（BGE-M3 embedding + rerank + hybrid）
                           └─ 追踪（span-based telemetry → MongoDB）
```

### 关键架构决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 执行引擎 | BullMQ 队列 + Worker | 进程崩溃不丢执行，自动重试，并发可控 |
| 向量存储 | MongoDB cosine（默认）+ Qdrant（可选） | 小规模零依赖，大规模可升级 |
| 渠道部署 | ChannelAdapter（Web/飞书/钉钉） | 抽象接口，一个 workflow 多渠道 |
| 连接器 | Connector 框架（HTTP/Database） | 注册表模式，可扩展 |
| 模板管理 | DB 存储 + CRUD API + UI | 用户可自建模板，不依赖代码发版 |

---

## Quick Start

### 前置条件

- Node.js >= 20
- pnpm >= 9
- MongoDB 8（本地或 Docker）
- LLM API key（DeepSeek 推荐）

### 安装

```bash
git clone https://github.com/schema-platform/schema-platform.git
cd schema-platform

# 构建共享包（必须）
cd shared/platform-shared && pnpm install && pnpm build && cd ../..

# 安装 server
cd server && pnpm install && cd ..

# 安装 AI 前端
cd ai/app && pnpm install && cd ../..
```

### 配置

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，至少设置：

```env
MONGODB_URI=mongodb://formgrid:formgrid@localhost:27017/formgrid
JWT_SECRET=<random-hex-32-bytes>
DEEPSEEK_API_KEY=<your-api-key>
```

### 启动

```bash
# 终端 1：Server
cd server && pnpm dev

# 终端 2：AI 前端
cd ai/app && pnpm dev
```

打开 `http://localhost:5300`。

### Docker Compose（一键启动）

```bash
cp ai/.env.example ai/.env
# 编辑 ai/.env 设置 DEEPSEEK_API_KEY 和 JWT_SECRET
docker compose -f ai/docker-compose.ai.yml up -d
```

---

## 环境变量

### 必需

| 变量 | 说明 |
|------|------|
| `MONGODB_URI` | MongoDB 连接字符串 |
| `JWT_SECRET` | JWT 签名密钥（生产必须，开发自动 fallback） |
| `DEEPSEEK_API_KEY` | DeepSeek API key |

### LLM Provider

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OPENAI_API_KEY` | -- | OpenAI API key |
| `OPENAI_BASE_URL` | -- | 自定义 OpenAI 兼容端点 |
| `ANTHROPIC_API_KEY` | -- | Anthropic API key |
| `DEFAULT_LLM` | -- | 默认 provider key |

### Embedding / RAG

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `EMBEDDING_API_KEY` | -- | Embedding API key |
| `EMBEDDING_MODEL` | `BAAI/bge-m3` | Embedding 模型 |
| `SILICONFLOW_API_KEY` | -- | SiliconFlow key（rerank 复用） |

### 执行引擎

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REDIS_URL` | `redis://localhost:6379` | Redis（BullMQ 队列，可选，无则降级） |
| `AI_MAX_TOOL_ITERATIONS` | `3` | 工具迭代上限 |
| `AI_CHECKPOINT_TTL_DAYS` | `7` | checkpoint 自动过期天数 |
| `AI_MONTHLY_TOKEN_BUDGET` | -- | 月度 token 预算（超限预警） |

### 监控告警

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `AI_ALERT_WEBHOOK_URL` | -- | 告警 webhook URL |
| `AI_ALERT_ERROR_RATE_THRESHOLD` | `10` | 错误率阈值（%） |
| `AI_ALERT_SLOW_THRESHOLD_MS` | `10000` | 慢操作阈值（ms） |

### 向量存储

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VECTOR_STORE` | `mongodb` | 向量存储后端（`mongodb` 或 `qdrant`） |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant 地址 |

---

## 测试

```bash
# 前端测试
cd ai/app && pnpm test        # 687 tests

# 后端测试
cd server && pnpm test         # 500+ tests

# 类型检查
cd ai/app && pnpm typecheck
cd server && npx tsc --noEmit
```

---

## 部署

```bash
# 打包
bash deploy/pack.sh --target ai

# 部署到服务器
bash deploy/deploy.sh --target ai <VERSION>

# 全量部署（server + 所有前端）
bash deploy/deploy.sh --target all <VERSION>
```

详见 [deploy/deploy.sh](../deploy/deploy.sh) 和 [deploy/ecosystem.config.cjs](../deploy/ecosystem.config.cjs)。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Element Plus + Pinia + Socket.IO |
| 后端 | Koa.js + TypeScript + Mongoose + LangGraph + BullMQ + Socket.IO |
| AI | LangGraph StateGraph + OpenAI 兼容 API + MCP 协议 |
| 存储 | MongoDB 8 + Redis（可选）+ Qdrant（可选） |
| 构建 | Vite + TypeScript |
| 部署 | PM2 + nginx + rsync |

---

## 文档

| 文档 | 内容 |
|------|------|
| [架构](./docs/architecture.md) | 双引擎架构、系统概览 |
| [全链路架构](./docs/product/full-chain-architecture-2026-07-24.md) | Chat → LangGraph → LLM → 31 模板完整链路 |
| [LangGraph 优化](./docs/product/langgraph-optimization-2026-07-24.md) | 12 项优化分析 + 路线图 |
| [提示词优化](./docs/product/prompt-optimization-2026-07-24.md) | 温度策略 + 提示词规范 |
| [垂直领域分析](./docs/product/vertical-domain-analysis-2026-07-24.md) | 表单/流程 + AI 差异化场景 |
| [Agent Workflow](./docs/agent-workflow.md) | 可视化工作流编排指南 |
| [事件协议](./docs/events.md) | WebSocket 事件类型 |
| [插件中心](./docs/plugin.md) | 插件架构与配置 |

---

## 贡献

欢迎贡献！详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## License

MIT License - 详见 [LICENSE](./LICENSE)。

**Made with ❤️ by the Schema Platform Team**
