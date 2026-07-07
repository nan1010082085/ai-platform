# 集成与 SDK

> 三能力平台（editor / flow / **ai**）人机交互统一 **JWT**（access + refresh，见 `platform-shared/authSession`）。  
> **AI 应用**作为开源 **应用能力小平台**，对外集成使用 **invoke 统一入口 + Key**。  
> 总览见 [platform.md](./platform.md)。

---

## 凭证怎么用

| 场景 | 凭证 | 说明 |
|------|------|------|
| editor / flow / ai 界面操作 | **JWT** `Authorization: Bearer` | 同一登录态，自动刷新 |
| 用户脚本 / 外部系统调工作流 | **用户平台 Key** `X-API-Key: sk_...` | 用户自己在 AI 应用创建，可调其有权限的 **所有** 已发布流 |
| 仅开放单条工作流 | **工作流 Key** `X-Workflow-Key: wf_...` | 发布时自动生成，设计器内复制 |

```http
POST /api/ai/workflows/invoke/{slug}
X-Tenant-Id: 000000
X-API-Key: sk_...              # 或 X-Workflow-Key: wf_...
Content-Type: application/json

{ "input": { ... }, "trigger": "api" }
```

查询执行：

```http
GET /api/ai/workflows/invoke/executions/{executionId}
```

（同样带 Key；用户平台 Key 场景下需与 invoke 鉴权规则一致，见 [platform.md](./platform.md) 演进清单。）

---

## 两个 npm 包

| 包 | 目录 | 用途 |
|---|---|---|
| `@schema-platform/workflow-client` | `ai/workflow-client/` | 调 **本平台** 已发布工作流（Key 鉴权） |
| `@ai-sdk` | `ai/sdk/` | **脱离本平台** 的轻量 Agent 框架 |

**ai-app 自身**不用这两个包；浏览器侧用 `agentWorkflowApi.ts` / `aiApi.ts` + JWT。

---

## `@schema-platform/workflow-client`

面向集成方（cron、中台、第三方）。构造参数以代码为准，目标形态：

```ts
// 用户平台 Key — 同一 key 调不同 slug
const client = new WorkflowClient({
  baseUrl: 'https://your-host',
  apiKey: process.env.MY_PLATFORM_KEY!,  // sk_...，待 SDK 扩展
  tenantId: '000000',
})

// 或：单工作流 Key
const client = new WorkflowClient({
  baseUrl: 'https://your-host',
  workflowKey: process.env.WORKFLOW_KEY!, // wf_...
})
```

当前实现仅 `workflowKey`；`apiKey` 与 invoke 认 `X-API-Key` 见 [platform.md](./platform.md) 演进清单。

详见 [workflow-client README](../workflow-client/README.md)。

---

## `@ai-sdk`

不连接 schema-platform server，自备 LLM API Key，用于独立 Agent 实验或二次开发。

详见 [ai/sdk/README.md](../sdk/README.md)。

---

## 已移除的路径

`/api/ai/open/*` 已在基线 1.0 删除。外部集成请使用 **`POST /api/ai/workflows/invoke/{slug}`**（见上文）。

---

## 相关文档

- [platform.md](./platform.md) — 三能力 + JWT + 双 Key + 开源小平台定位
- [agent-workflow.md](./agent-workflow.md) — 工作流编排
- [plugin.md](./plugin.md) — 插件中心
