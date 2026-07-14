# AI 平台 — 未完成任务与进度

> 最后更新：**2026-07-14** · **全量任务索引**见 [open-platform-roadmap.md § 七](./open-platform-roadmap.md#七全量任务索引) · 可执行拆解见 [open-source-iteration.md](./open-source-iteration.md) · **LangGraph→Workflow 对话节点**见 [langgraph-workflow-nodes-roadmap.md](./langgraph-workflow-nodes-roadmap.md)

**已完成总览**：[ai-five-phase-iteration.md](./ai-five-phase-iteration.md) · [plugin.md](../plugin.md) · [platform.md](../platform.md)

---

## 进度总览

| 域 | 进度 |
|----|------|
| 五项迭代 | **100%** |
| Chat / Workflow WS | **100%** |
| 插件中心 PLG-1～8 | **100%** |
| Chat v2 事件（thinker / quality_check） | **100%** |
| JWT 三能力统一 | **100%** |
| **基线 1.0**（Open API / 节点 / pluginExpert） | **100%** |
| Phase A — 平台凭证 | **100%** |
| Phase B — 开源交付 | **100%** |
| Phase C — 质量与体验 | **100%** |
| Phase D — 平台能力扩展 | **50%**（D-3 配额 ⬜、D-4 插件市场 ⬜） |
| Phase E — 工作流模板与试用 | **100%** |
| Phase F — 能力层细化调研 | **100%** |
| Phase G — 模型扩展 | **100%**（含 Provider/Model 两级结构） |
| Phase H — 文档与基线收尾 | **50%**（H-2/H-4 ⬜） |
| Phase I — 可选技术债 | **100%** |
| **Phase J** — LangGraph 对话节点白盒化 | **100%** |
| **Phase K** — Provider/Model 两级结构 | **100%** |
| **Phase L** — 消息组件化重构 | **进行中** |

---

## Phase J — LangGraph 对话节点白盒化 ✅

| ID | 任务 | 状态 |
|----|------|------|
| J-0 | 共享运行时抽取（`server/src/ai/runtime/*`） | ✅ |
| J-1 | `intent-router`、`summarizer` 全栈 | ✅ |
| J-2 | `requirement-analyzer` + `hitl` 增强 | ✅ |
| J-3 | `task-planner`、`task-chain`、`collaboration-router` | ✅ |
| J-4 | 官方模板 + `demo-chat-parity` seed + 文档 | ✅ |

**产出**：
- 5 个 runtime 纯函数模块
- 6 个新节点类型（AgentNodeType + Palette + Panels + Executor）
- 4 个新事件类型
- 2 个官方模板（chat-parity-assistant、requirement-gated-build）
- 1194 测试通过

---

## Phase K — Provider/Model 两级结构 ✅

| ID | 任务 | 状态 |
|----|------|------|
| K-1 | Provider + Model Schema（server/src/models/） | ✅ |
| K-2 | seedProvidersAndModels()（DeepSeek/Mimo/Ollama） | ✅ |
| K-3 | llmCache.ts 支持两级查询 | ✅ |
| K-4 | providerRoutes.ts + aiModelRoutes.ts API | ✅ |
| K-5 | ai/shared/providerModel.ts 类型定义 | ✅ |
| K-6 | providerApi.ts + modelApi.ts 前端 API 客户端 | ✅ |
| K-7 | ModelSettingsView.vue 重构为两级管理 UI | ✅ |

**产出**：
- 供应商 Schema（DeepSeek/Mimo/Ollama/OpenAI/Anthropic/Custom）
- 模型 Schema（关联供应商，参数独立配置）
- 前端左右分栏 UI（供应商列表 + 模型列表）
- 测试连接、快速添加预设、设为默认

---

## Phase L — 消息组件化重构 🔄

| ID | 任务 | 状态 |
|----|------|------|
| L-1 | RendererRegistry.ts 渲染器注册表 | 🔄 |
| L-2 | 独立渲染器（Text/Code/Thinking/ToolCall/Image/Requirement/Document） | 🔄 |
| L-3 | AiMessageContent.vue 调度器 | 🔄 |
| L-4 | AiMessageActionBar.vue 操作栏 | 🔄 |
| L-5 | AiMessage.vue 主组件瘦身 | 🔄 |

**目标**：新增预览类型只需新建 Renderer + 注册，不改主组件

---

## Phase M — Chat 预览增强 ✅

| ID | 任务 | 状态 |
|----|------|------|
| M-1 | 用户图片内联显示 | ✅ |
| M-2 | PDF.js 渲染预览 | ✅ |
| M-3 | Excel 上传 + 预览 | ✅ |

**产出**：
- PdfPreviewCard.vue
- ExcelPreviewCard.vue
- DocumentAttachmentCard.vue 图片内联增强

---

## 剩余待办

### Phase D — 平台能力扩展（P2）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| D-3 | 配额/限流 | 按 Key/租户配额，非仅全局 IP 限流 | ⬜ |
| D-4 | 插件市场模板 | 在线浏览/安装插件模板 | ⬜ |

### Phase G — 模型扩展（P2）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| G-7 | openai-compatible 通用 Provider | 支持任意 OpenAI 兼容 API | ⬜ |

### Phase N — 功能补全（P2，按需）

> 审查发现的缺失功能，按优先级排序

| ID | 功能 | 说明 | 优先级 | 状态 |
|----|------|------|--------|------|
| N-1 | RAG 文档上传入口 | 当前需先上传到 editor/flow，RAG 无独立上传 | P2 | ⬜ |
| N-2 | 嵌入模型配置 UI | 使用 SiliconFlow BGE-M3，无可视化配置 | P2 | ⬜ |
| N-3 | 插件在线编辑 | 当前需 Git 或 CLI，无 Web 编辑器 | P2 | ⬜ |
| N-4 | 消息音频预览 | 不支持音频文件上传/播放 | P3 | ⬜ |
| N-5 | 消息视频预览 | 不支持视频文件上传/播放 | P3 | ⬜ |
| N-6 | 消息 3D 模型预览 | 不支持 3D 模型预览 | P3 | ⬜ |

### Phase O — 能力层细化（P1-P2，按需）

> 调研未完成项

| ID | 域 | 调研项 | 优先级 | 状态 |
|----|---|---|---|---|
| O-1 | Expert | routing 路由调试 UI 或 CLI | P1 | ⬜ |
| O-2 | Expert | Workflow expert 节点 vs Chat prompt 覆盖规则对齐 | P1 | ⬜ |
| O-3 | Skill | 拼装顺序与冲突规范 | P2 | ⬜ |
| O-4 | Skill | 多语言 / locale | P2 | ⬜ |
| O-5 | Tool | label/category CI 校验必填 | P1 | ⬜ |
| O-6 | MCP | factoryModule example pack 扩充 | P1 | ⬜ |
| O-7 | MCP | 租户隔离 UI | P2 | ⬜ |
| O-8 | Prompt | Chat 空状态引导词配置化 | P2 | ⬜ |
| O-9 | Workflow | 官方 demo 流 seed | P1 | ⬜ |
| O-10 | RAG | 与 Tool/MCP 边界扩展文档 | P1 | ⬜ |
| O-11 | 插件 | Pack spec v1 + 签名 | P2 | ⬜ |
| O-12 | 可观测 | 插件级 metrics | P2 | ⬜ |

### Phase H — 文档收尾（P1）

| ID | 任务 | 说明 | 状态 |
|----|------|------|------|
| H-2 | 内部研发文档清扫 | ARCHITECTURE_PLAN.md 等去除旧架构引用 | ⬜ |
| H-4 | 文档维护规程 | 变更时文档同步更新规范 | ⬜ |

---

## 明确不做

| 项 | 原因 |
|----|------|
| Chat HTTP SSE | 已删除 |
| Shell 改菜单 | 范围外 |
| 恢复 `/api/ai/open/*` | 基线 1.0 已删除，统一 invoke |
| 单独一级「模板预览」侧栏 | 与模板 Tab 重复 |
| `@ai-sdk` 包 | 无消费者，已删除 |
| `@schema-platform/workflow-client` 包 | 仅为 REST API 包装器，已删除 |

---

## 迭代日志

### 2026-07-14

**Phase J 完成** — LangGraph 对话节点白盒化
- 5 个 runtime 纯函数模块（intentRouter/requirementAnalyzer/taskPlanner/summarizer/collaborationRouter）
- 6 个新节点类型注册（AgentNodeType + Palette + Panels + Executor）
- 4 个新事件类型（route_decided/summary_stream/requirement_analyzed/task_step_complete）
- 2 个官方模板（chat-parity-assistant、requirement-gated-build）
- demo-chat-parity seed
- 文档更新

**Phase K 完成** — Provider/Model 两级结构
- Provider + Model Schema（server/src/models/）
- seedProvidersAndModels()（DeepSeek/Mimo/Ollama）
- llmCache.ts 两级查询
- providerRoutes.ts + aiModelRoutes.ts API
- 前端 ModelSettingsView.vue 重构为左右分栏 UI

**Phase M 完成** — Chat 预览增强
- 用户图片内联显示
- PDF.js 渲染预览（PdfPreviewCard.vue）
- Excel 上传 + 预览（ExcelPreviewCard.vue）

**包清理**
- 删除 `ai/sdk/`（@ai-sdk，无消费者）
- 删除 `ai/workflow-client/`（@schema-platform/workflow-client，REST API 包装器）
- 更新所有文档引用

**Phase L 启动** — 消息组件化重构
- RendererRegistry.ts 渲染器注册表设计
- 独立 Renderer 提取（Text/Code/Thinking/ToolCall/Image/Requirement/Document）
- AiMessageContent.vue 调度器
- AiMessage.vue 主组件瘦身

### 2026-07-13

**Phase J 启动** — LangGraph 对话节点白盒化
- J-0: 共享运行时抽取开始

### 2026-07-09

**方向调整**
- shell 归档删除，不再维护
- 共享包聚合到 shared/ 目录
- AI 项目开源 SaaS 平台化
- editor / flow 独立配套迭代

### 2026-07-08

**Phase A～I 全量迭代完成**
- 平台凭证（invoke + 用户 Key + UI）
- 开源交付（README / docker-compose / env 清单）
- 质量与体验（Auth e2e + invoke 展示 + 401 refresh）
- 工作流模板与试用（7 个官方模板 + demo seed）
- 能力层调研（Expert/Skill/Tool/MCP/Prompt）
- 模型扩展（BYOK + llmCache + ModelSettingsView）
- 技术债清理（v1 回退 + legacyAgentKey + 双 Key 示例）

### 2026-06-28

**AI 项目基础迁移**
- 从 monorepo 迁移至独立目录
- 项目级 CLAUDE.md 创建
- qiankun 模式 loading 修复
- mount() 使用 getToken 动态获取 token
- 部署到生产环境

---

## 产品定位（鉴权）

- **主路径**：全部业务 API **JWT**（`authMiddleware`）
- **集成**：`POST /api/ai/workflows/invoke/{slug}` + **`X-Workflow-Key`**（`wf-...`）或 **`X-API-Key`**（`sk-...`）二选一
- 外部系统直接调用 REST API，无需额外 SDK
