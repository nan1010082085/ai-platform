# AI 平台 — 未完成任务与进度

> 最后更新：**2026-07-08** · **全量任务索引**见 [open-platform-roadmap.md § 七](./open-platform-roadmap.md#七全量任务索引) · 可执行拆解见 [open-source-iteration.md](./open-source-iteration.md)

**已完成总览**：[ai-five-phase-iteration.md](./ai-five-phase-iteration.md) · [plugin.md](../plugin.md) · [sdk.md](../sdk.md) · [platform.md](../platform.md)

---

## 进度总览

| 域 | 进度 |
|----|------|
| 五项迭代 | **100%** |
| Chat / Workflow WS | **100%** |
| 插件中心 PLG-1～8 | **100%** |
| workflow-client（JWT） | **100%** |
| Chat v2 事件（thinker / quality_check） | **100%** |
| JWT 三能力统一 | **100%**（`initCapabilityPlatformAuth`） |
| **基线 1.0**（Open API / 节点 / pluginExpert） | **100%**（见 open-source-iteration §二） |
| Phase A — 平台凭证 | **100%**（X-API-Key + 用户 Key UI + workflow-client apiKey） |
| Phase B — 开源交付 | **100%**（README / docker-compose / env 清单） |
| Phase C — 质量与体验 | **100%**（Auth e2e + invoke 展示 + 401 refresh） |
| Phase D — 平台能力扩展 | **50%**（D-1 多租户 ✅、D-2 Key 审计 ✅、D-3 配额/限流 ⬜、D-4 插件市场 ⬜） |
| Phase E — 工作流模板与试用 | **100%**（试用按钮 + demo 流 + 扩模板库 E-T1～T5） |
| Phase F — 能力层细化调研 | **100%**（Expert/Skill/Tool/MCP/Prompt 全部调研完成） |
| Phase G — 模型扩展 | **86%**（G-1~G-6 ✅、G-7 openai-compatible Provider ⬜） |
| Phase H — 文档与基线收尾 | **50%**（H-1/H-3 ✅、H-2 内部文档清扫部分完成 ⬜、H-4 文档维护规程 ⬜） |
| Phase I — 可选技术债 | **100%**（v1 回退 + legacyAgentKey + 双 Key 示例） |

---

## 已完成总览（Phase A～I）

| 阶段 | 主题 | 优先级 | 任务 ID 范围 | 状态 |
|------|------|--------|----------------|------|
| **A** | 平台凭证（invoke + 用户 Key + UI） | **P0** | A-1～A-5 | ✅ |
| **B** | 开源交付（README / docker / env） | **P0** | B-1～B-4 | ✅ |
| **C** | 质量（e2e、invoke 展示、401 refresh） | **P1** | C-1～C-4 | ✅ |
| **D** | 运营扩展（租户、审计、配额、市场） | **P2** | D-1～D-4 | **50%**（D-1/D-2 ✅、D-3/D-4 ⬜） |
| **E** | 工作流模板与试用 + `demo-*` | **P1** | E-1～E-6、E-T1～E-T5 | ✅ |
| **F** | 能力层细化调研（Expert/Skill/Tool/MCP/Prompt） | **P0** | F.2 表 + F-P1～P4 + F.4 步骤 | ✅ |
| **G** | 模型扩展（BYOK + baseUrl + UI） | **P0** | G-1～G-7 | **86%**（G-1~G-6 ✅、G-7 ⬜） |
| **H** | 文档与基线收尾 | **P1** | H-1～H-4 | **50%**（H-1/H-3 ✅、H-2/H-4 ⬜） |
| **I** | 可选技术债（v1 回退、命名） | **P2** | I-1～I-3 | ✅ |

**排期示意**：见 [open-platform-roadmap.md § 五](./open-platform-roadmap.md#五推荐排期8-周示意)。

---

## 已完成清单（近期）

| ID | 说明 |
|----|------|
| PLG-1～4 | Skills、MCP factory、file pack、tenant Registry |
| PLG-5 | Registry label + `builtinTool()` 回退 |
| PLG-6 | `PUT /api/ai/plugins/local/:layer/:file` |
| PLG-7 | MCP transport 单测（stdio/inmemory/sse 校验） |
| PLG-8 | 根目录 `.github/workflows/plugin-validate.yml` |
| WF-3 | workflow-client 轮询式 `streamExecution` |
| AI-1/2 | `thinker_*` / `quality_check_*` WebSocket 事件 |
| AI-3 | `aiRuntimeRules` 规则实现 |
| AI-4 | `onConnectionChange` |
| JWT | `initCapabilityPlatformAuth` 三能力统一 |
| **BASE-1** | 删除 `/api/ai/open/*` 全栈 |
| **BASE-2** | 工作流节点收敛：`expert` / `agent-intent` / `tool` |
| **BASE-3** | Chat LangGraph 单路径 `pluginExpert` |
| **BASE-4** | 删除 `LEGACY_TOOL_ALIASES`、deprecated 事件 |
| **C-2** | Open API 删除 + 文档指向 invoke |
| **H-1** | `server/docs/api-reference.md` invoke 章节 |
| **H-3** | `server/docs/rag-architecture.md` 等 server 文档 |
| DOC | plugin.md / sdk.md / architecture.md 基线更新 |
| **A-1** | invoke 支持 `X-API-Key`（`POST /workflows/invoke/:slug` 用户 Key 与 Workflow Key 二选一） |
| **A-2** | `/api/keys` 按用户隔离（列表/删改默认 `createdBy === 当前用户`） |
| **A-3** | AI 应用「我的集成密钥」UI（`ApiKeyManagerView.vue`：创建、脱敏列表、禁用、删除） |
| **A-4** | `workflow-client` 支持 `apiKey`（与 `workflowKey` 二选一） |
| **A-5** | seed 角色 `apikey:*`（普通用户可管理自己的 Key） |
| **B-1** | `ai/README.md` 开源快速开始（最小部署：server + ai standalone） |
| **B-2** | 环境变量清单（JWT、LLM、MongoDB、embedding） |
| **B-3** | `docker-compose.ai.yml`（ai 小平台演示栈） |
| **B-4** | LICENSE + CONTRIBUTING |
| **C-1** | Auth e2e（SSO + refresh + Sidebar 长会话） |
| **C-3** | 工作流列表展示 invoke 信息（已发布流 URL + 脱敏 Key 汇总） |
| **C-4** | fetch 客户端 401 refresh（aiApi / agentWorkflowApi 对齐 axios 的 refresh 重试） |
| **D-1** | 多租户切换与 Key 隔离（UI 展示当前租户） |
| **D-2** | Key 使用审计（lastUsedAt 列表、按工作流统计） |
| **E-1** | 模板 Tab「试用」「在对话中体验」按钮（按 category 显隐） |
| **E-2** | seed `demo-*` 已发布工作流（`demo-intelligent-assistant` 等） |
| **E-3** | 试用 → 设计器 `?try=1&sample=...`（预填 sample input / 执行抽屉） |
| **E-4** | Chat 深链 `/?workflowId=demo-*`（AiChatSettings 预选工作流） |
| **E-5** | 扩 3～5 个模板图工厂（`ai/shared/agentWorkflow.ts` 5 个新模板） |
| **E-T1** | 模板 `contract-extract`（document 类：合同要点提取） |
| **E-T2** | 模板 `kb-faq`（assistant 类：知识库 FAQ） |
| **E-T3** | 模板 `http-notify`（integration 类：HTTP 调用 + 完成回调） |
| **E-T4** | 模板 `rag-ingest-qa`（assistant 类：索引 + 问答） |
| **E-T5** | 模板 `multi-doc-batch`（document 类：批处理占位） |
| **F-1** | 走读 Registry → Chat/Workflow 消费链（填 F.2「现状」列） |
| **F-P1** | promptBuilder 与 editor/flow 解耦结论 → `f-p-prompt-architecture.md` |
| **F-P2** | `prompts` DB 与 Plugin Skill 分工结论（Skill=指令，DB=运营文案） |
| **F-P3** | Prompt 层 Plugin Center Tab 结论 |
| **F-P4** | 模板携带 `recommendedSkills[]` 结论 |
| **F-registry** | 能力层调研总报告（`f-1-registry-survey.md`） |
| **G-1** | BYOK 归属结论 → `model-architecture.md` |
| **G-2** | `llmCache` / `LLMManager` 优先级调整（DB/用户配置优先于平台 env） |
| **G-3** | ModelConfig apiKey 脱敏（创建/更新一次性回显） |
| **G-4** | AI 应用「模型与连接」设置页（`ModelSettingsView.vue`） |
| **G-5** | Chat / Workflow 动态模型列表（替换 `CHAT_MODEL_OPTIONS` 硬编码） |
| **H-2** | 内部研发文档清扫（去除 editorAgent/open API 引用） |
| **H-4** | 变更时文档维护规程 |
| **I-1** | 移除 `AI_ENABLE_REQUIREMENT_ANALYSIS=false` v1 回退 |
| **I-2** | `legacyAgentKey` 文档化（`expert-extension-guide.md`） |

---

## 产品定位（鉴权）

- **主路径**：全部业务 API **JWT**（`authMiddleware`）
- **集成**：`POST /api/ai/workflows/invoke/{slug}` + **`X-Workflow-Key`**（`wf-...`）或 **`X-API-Key`**（`sk-...`）二选一
- **workflow-client**：JWT 或 Key（支持 `workflowKey` / `apiKey` 二选一）

---

## 剩余待办（F.2 调研表 P1-P2 项 + 部分完成项）

### F.2 调研表未完成项（16 项）

| 域 | 调研项 | 优先级 | 状态 |
|---|---|---|---|
| Expert | routing 路由调试 UI 或 CLI | P1 | ⬜ |
| Expert | Workflow expert 节点 vs Chat prompt 覆盖规则对齐 | P1 | ⬜ |
| Skill | 作者手册 | P1 | ✅ `docs/extend/skill-author-guide.md` |
| Skill | 拼装顺序与冲突规范 | P2 | ⬜ |
| Skill | 多语言 / locale | P2 | ⬜ |
| Tool | label/category CI 校验必填 | P1 | ⬜ |
| MCP | factoryModule example pack 扩充 | P1 | ⬜ |
| MCP | 租户隔离 UI | P2 | ⬜ |
| Prompt | Chat 空状态引导词配置化 | P2 | ⬜ |
| Prompt | Workflow LLM 节点变量文档 | P1 | ✅ `docs/extend/workflow-variables.md` |
| Workflow | 模板注册 RFC（插件 pack 带模板） | P1 | ✅ `docs/extend/workflow-template-rfc.md` |
| Workflow | 官方 demo 流 seed | P1 | ⬜ |
| RAG | 与 Tool/MCP 边界扩展文档 | P1 | ⬜ |
| 插件 | Pack spec v1 + 签名 | P2 | ⬜ |
| 插件 | Plugin Center 写能力评估 | P1 | ✅ `docs/product/plugin-write-eval.md` |
| 可观测 | 插件级 metrics | P2 | ⬜ |

### 部分完成项（4 项）

| ID | 说明 | 实际状态 |
|---|---|---|
| D-3 | 配额/限流 | 仅全局 IP 限流（300 req/60s），无按 Key/租户配额 |
| D-4 | 插件市场模板 | 仅 schema 定义，无路由、无 UI |
| G-6 | Ollama / vLLM / 私有网关文档 | ✅ `docs/extend/custom-models.md`（Ollama/vLLM/DeepSeek 双路径配置） |
| G-7 | openai-compatible 通用 Provider | 无独立 provider 类型，openai 可变通 |
| H-2 | 内部研发文档清扫 | ARCHITECTURE_PLAN.md 等仅加 disclaimer，正文仍引用旧架构 |
| H-4 | 文档维护规程 | 未实现 |
| I-3 | sdk / workflow-client 双 Key 示例 | 未实现 |

---

## 明确不做

| 项 | 原因 |
|----|------|
| Chat HTTP SSE | 已删除 |
| Shell 改菜单 | 范围外 |
| 恢复 `/api/ai/open/*` | 基线 1.0 已删除，统一 invoke |
| 单独一级「模板预览」侧栏 | 与模板 Tab 重复（见 Phase E E.1） |
