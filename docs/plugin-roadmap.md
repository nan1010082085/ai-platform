# 插件中心路线图

> 配置：`server/config/plugins/{mcp,tools,experts,skills}/` 分文件目录 + 可选 `plugins/local/`、`plugins/tenants/{id}/`。

## 一、已完成

### 插件中心核心

| 项 | 状态 |
|---|---|
| 四层 Registry（Expert / Skill / Tool / MCP） | ✅ |
| 分目录配置 + legacy 单文件兼容 | ✅ |
| MCP bridge（inmemory / stdio / sse） | ✅ |
| `runRegisteredExpert` + Chat `pluginExpert` 节点 | ✅ |
| `GET /api/ai/plugins` | ✅ |
| 设计器 Palette / ToolNodePanel 动态加载 | ✅ |
| http 工具执行器 | ✅ |
| 配置热重载（SIGHUP + `plugins/local/` 监听） | ✅ |
| `pnpm plugin:validate` / `plugin:pack` / `plugin:install` | ✅ |
| 租户 overlay（`AI_PLUGIN_TENANT_ID` + `plugins/tenants/`） | ✅ |
| Registry `argsHint`；`agentTools.ts` 保留 label/category 回退 | ✅ |
| 管理 UI（AI `/plugins` 只读浏览） | ✅ |
| CI 门禁 `server/.github/workflows/ai-tests.yml` | ✅ |
| stdio MCP 集成测试 | ✅ |

### Agent Workflow 对外开放

| Phase | 内容 | 状态 |
|---|---|---|
| 2 | API Key + `workflow:execute` + Open 路由 | ✅ |
| 3 | slug、`?version=`、Idempotency-Key | ✅ |
| 4 | async、SSE、callback、OpenAPI 3.1 | ✅ |
| 5 | `@schema-platform/workflow-client` SDK | ✅ |
| 设计器 | slug + onCompleteWebhook UI | ✅ |
| 文档 | `workflow-open-api.md`、`api-reference.md` | ✅ |

**质量基线（2026-07-07）**：server build ✅ · `plugin:validate` ✅ · AI 单测 **350/350** · workflow-client **4/4** · ai-app **346/346**

---

## 二、待完成

### P1 生态

| 项 | 说明 | 优先级 |
|---|---|---|
| **自定义 inmemory MCP** | 插件包携带 TS factory 的加载约定 | 中 |
| **Skill `file` 目录** | pack/install 规范携带 `.md` + manifest `file` 引用 | 低 |

### P2 架构深化

| 项 | 说明 |
|---|---|
| **按请求 tenant 加载 Registry** | 当前 overlay 依赖 `AI_PLUGIN_TENANT_ID` 环境变量，适合专租户部署 |
| **agentTools 进一步瘦身** | 可迁 label/category 至 Registry 或 i18n |

### P3 质量

| 项 | 说明 |
|---|---|
| **SSE MCP 端到端测试** | 已有 stdio fixture + sse 参数校验 |
| **CI 远端验证** | standalone server 仓需 GitHub Packages 或 monorepo checkout |

### 预存（非插件/Open API 范围）

- Chat v2 `thinker_*` / `quality_check_*` 图节点
- `server/src/routes/aiRuntime.ts` 智能推荐 TODO

---

## 三、Open API 速查

| 方法 | 路径 | 鉴权 |
|---|---|---|
| POST | `/api/ai/open/workflows/:id/execute` | API Key |
| POST | `/api/ai/open/workflows/by-slug/:slug/execute` | API Key |
| GET | `/api/ai/open/workflow-executions/:id` | API Key |
| GET | `/api/ai/open/workflow-executions/:id/stream` | API Key（SSE） |
| POST | `.../resume` / `.../cancel` | API Key |

详见 [workflow-open-api.md](./design/workflow-open-api.md)、`server/openapi/workflow-open.yaml`。

---

## 四、CLI 速查

```bash
cd server
pnpm plugin:validate
pnpm plugin:pack --dir config/plugins/packs/example.support --out dist/example.support.tgz
pnpm plugin:install --file dist/example.support.tgz [--tenant acme]
kill -HUP $(pgrep -f "dist/index.js")   # 热重载 Registry
```

外部调用 SDK：`ai/workflow-client/`（`@schema-platform/workflow-client`）。
