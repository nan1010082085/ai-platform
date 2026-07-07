# AI 平台 — 未完成任务与进度

> 最后更新：**2026-07-07** · **全量任务索引**见 [open-platform-roadmap.md § 七](./open-platform-roadmap.md#七全量任务索引) · 可执行拆解见 [open-source-iteration.md](./open-source-iteration.md)

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
| 文档对齐基线 1.0 | **部分**（H-1 ✅，H-2 待做） |

---

## 进行中 / 下一迭代（按优先级）

| 阶段 | 主题 | 优先级 | 任务 ID 范围 |
|------|------|--------|----------------|
| **A** | 平台凭证（invoke + 用户 Key + UI） | **P0** | A-1～A-5 |
| **G** | 模型扩展（BYOK + baseUrl + UI） | **P0** | G-1～G-7 |
| **F** | 能力层细化调研（Expert/Skill/Tool/MCP/Prompt） | **P0** | F.2 表 + F-P1～P4 + F.4 步骤 |
| **B** | 开源交付（README / docker / env） | **P0** | B-1～B-4 |
| **E** | 工作流模板与试用 + `demo-*` | **P1** | E-1～E-6、E-T1～E-T5 |
| **C** | 质量（e2e、invoke 展示、401 refresh） | **P1** | C-1、C-3、C-4（C-2 ✅） |
| **H** | 文档与基线收尾 | **P1** | H-1～H-4 |
| **D** | 运营扩展（租户、审计、配额、市场） | **P2** | D-1～D-4 |
| **I** | 可选技术债（v1 回退、命名） | **P2** | I-1～I-3 |

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
| DOC | plugin.md / sdk.md / architecture.md 基线更新 |

---

## 产品定位（鉴权）

- **主路径**：全部业务 API **JWT**（`authMiddleware`）
- **集成**：`POST /api/ai/workflows/invoke/{slug}` + **`X-Workflow-Key`**（`wf-...`）；**Phase A** 后增加 **`X-API-Key`**（`sk-...`）二选一
- **workflow-client**：JWT 或 Key（A-4 后支持 `apiKey`）

---

## 明确不做

| 项 | 原因 |
|----|------|
| Chat HTTP SSE | 已删除 |
| Shell 改菜单 | 范围外 |
| 恢复 `/api/ai/open/*` | 基线 1.0 已删除，统一 invoke |
| 单独一级「模板预览」侧栏 | 与模板 Tab 重复（见 Phase E E.1） |
