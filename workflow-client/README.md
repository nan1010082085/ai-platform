# @schema-platform/workflow-client

Agent Workflow 的 **入口 URL + Workflow Key** TypeScript 客户端，供外部系统、脚本、定时任务调用已发布工作流。

> 统一调用模型：`POST /api/ai/workflows/invoke/{slug}` + 请求头 `X-Workflow-Key`。  
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

// 按 workflow ObjectId 执行
const byId = await client.executeById('507f1f77bcf86cd799439012', { trigger: 'api' })

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
| 启动执行 | POST | `/api/ai/workflows/invoke/{slugOrId}` | `X-Workflow-Key`, `X-Tenant-Id` |
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
