# @schema-platform/workflow-client

Agent Workflow 的 TypeScript 客户端，供外部系统、脚本、定时任务调用已发布工作流。

> 统一调用模型：`POST /api/ai/workflows/invoke/{slug}` + 认证头。
>
> 认证二选一：
> - `X-Workflow-Key` — 工作流发布时生成的调用密钥
> - `X-API-Key` — 平台 API Key（`sk-...` 前缀）
>
> 平台内 UI / 设计器测试仍用 JWT，见 `agentWorkflowApi.ts`。

## 安装

同仓开发：

```json
{
  "dependencies": {
    "@schema-platform/workflow-client": "file:../workflow-client"
  }
}
```

## 用法

### 使用 Workflow Key

```ts
import { WorkflowClient } from '@schema-platform/workflow-client'

const client = new WorkflowClient({
  baseUrl: 'https://your-platform.example.com',
  workflowKey: process.env.WORKFLOW_KEY!, // 发布工作流时获得
  tenantId: '000000', // 可选
})

// 按 slug 执行（推荐）
const started = await client.executeBySlug('document-parse', {
  input: { message: 'hello' },
  trigger: 'api',
})
```

### 使用平台 API Key

```ts
import { WorkflowClient } from '@schema-platform/workflow-client'

const client = new WorkflowClient({
  baseUrl: 'https://your-platform.example.com',
  apiKey: process.env.PLATFORM_API_KEY!, // sk-... 前缀
})

const started = await client.executeBySlug('document-parse', {
  input: { message: 'hello' },
})
```

> `workflowKey` 与 `apiKey` 二选一，同时提供时构造函数抛错。

### 等待与流式输出

```ts
// 轮询至终态
const done = await client.waitForCompletion(started.id)

// 轮询式进度流
for await (const evt of client.streamExecution(started.id)) {
  if (evt.event === 'execution') console.log(evt.data)
  if (evt.event === 'done') break
}
```

## HTTP 约定

| 操作 | 方法 | 路径 | 请求头 |
|---|---|---|---|
| 启动执行 | POST | `/api/ai/workflows/invoke/{slugOrId}` | (`X-Workflow-Key` 或 `X-API-Key`), `X-Tenant-Id` |
| 查询执行 | GET | `/api/ai/workflows/invoke/executions/{executionId}` | 同上 |

## API

| 方法 | 说明 |
|---|---|
| `executeBySlug(slug, req)` | 按 slug 启动已发布工作流 |
| `executeById(id, req)` | 按 ObjectId 启动 |
| `getExecution(id)` | 查询执行状态 |
| `poll(id, opts)` | 轮询至终态 |
| `waitForCompletion(id, opts)` | 同 poll |
| `streamExecution(id, opts)` | 轮询模拟进度流 |

详见 [sdk.md](../docs/sdk.md)、[agent-workflow.md](../docs/agent-workflow.md)。
