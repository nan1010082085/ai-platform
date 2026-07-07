# Agent Workflow 开放 API

> Workflow DAG **独立于 Chat**，供外部系统、定时任务、微服务通过 API Key 触发。执行引擎与 Chat 内「选择 workflow」相同。

## 鉴权

任选其一：

```http
X-API-Key: sk_live_xxx
```

```http
Authorization: Bearer sk_live_xxx
```

API Key 需包含权限 `workflow:execute`（管理员角色 seed 已包含；新建 Key 需在 permissions 中勾选）。

## 端点

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/ai/open/workflows/:id/execute` | 按 ID 执行已发布 workflow |
| POST | `/api/ai/open/workflows/by-slug/:slug/execute` | 按 slug 执行 |
| GET | `/api/ai/open/workflow-executions/:id` | 查询执行状态 |
| GET | `/api/ai/open/workflow-executions/:id/stream` | SSE 进度流 |
| POST | `/api/ai/open/workflow-executions/:id/resume` | HITL 恢复 |
| POST | `/api/ai/open/workflow-executions/:id/cancel` | 取消执行 |

### 执行请求

支持 query `async=true`、`version=yyyymmddhhmmss`（历史版本快照）。

```http
POST /api/ai/open/workflows/by-slug/document-parse/execute?async=true
X-API-Key: sk_live_xxx
Idempotency-Key: req-20260707-001
Content-Type: application/json

{
  "input": {
    "fileUrl": "https://example.com/a.pdf",
    "options": { "chunkSize": 800 }
  }
}
```

`async=true` 时响应精简为轮询地址：

```json
{
  "success": true,
  "data": {
    "executionId": "6789...",
    "status": "running",
    "pollUrl": "/api/ai/open/workflow-executions/6789...",
    "streamUrl": "/api/ai/open/workflow-executions/6789.../stream"
  }
}
```

## Workflow slug

- 创建 workflow 时自动从 `name` 生成 slug（租户内唯一）
- `PUT /api/ai/workflows/:id` 可设置 `{ "slug": "my-flow" }`
- 首次发布时若尚无 slug 会自动补全
- Open API **仅执行 `status=published` 且含 `publishedGraph` 的 workflow**

## 输入约定

与 Chat workflow 一致，见 [agent-workflow.md](./agent-workflow.md)：

- 根级 `input` 映射到 `$input` 模板
- `document-parse` 节点支持 `documentId` / `stream` / `inputField` / `api`
- Webhook 触发时 `input.body` / `input.query` 自动注入

## 完成回调

Workflow 级配置（JWT API `PUT /api/ai/workflows/:id`）：

```json
{
  "onCompleteWebhook": {
    "url": "https://example.com/hooks/workflow-done",
    "secret": "optional-hmac-secret"
  }
}
```

单次 Open API 执行可覆盖：

```json
{
  "input": { "message": "..." },
  "callbackUrl": "https://example.com/hooks/once",
  "callbackSecret": "optional-hmac-secret"
}
```

终态（`success` / `error` / `cancelled`）时服务端 POST 回调体，含 `executionId`、`status`、`nodeRecords` 等；若配置了 `secret`，附带 `X-Webhook-Signature: sha256=<hex>`。

OpenAPI 规范：`server/openapi/workflow-open.yaml`

## 错误码

| HTTP | code | 含义 |
|---|---|---|
| 401 | `invalid_api_key` | Key 无效或过期 |
| 403 | `workflow_forbidden` | Key 无 `workflow:execute` |
| 404 | `workflow_not_found` | id/slug 不存在或未发布 |
| 409 | `execution_not_waiting` | resume 时非 waiting 状态 |
| 409 | `idempotency_conflict` | 相同 Idempotency-Key 但请求体不同 |
| 422 | `invalid_input` | 参数或 slug 格式错误 |

## 其他触发方式

平台 JWT（设计器内测试）：

```http
POST /api/ai/workflows/:id/execute
Authorization: Bearer <access_token>
```

Webhook（HMAC，已发布 workflow）：

```http
POST /api/ai/webhooks/your-path
X-Webhook-Signature: sha256=<hex>
```

## 实现跟踪

Phase 2–4 已实现。后续增强见 [plugin-roadmap.md](../plugin-roadmap.md)。
