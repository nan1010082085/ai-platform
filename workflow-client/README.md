# @schema-platform/workflow-client

Agent Workflow **Open API** 的 TypeScript 客户端，供外部系统、定时任务、微服务调用。

## 安装

同仓开发（server / ai 子项目）：

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
  apiKey: process.env.SCHEMA_API_KEY!,
})

// 异步执行 + 轮询
const started = await client.executeBySlug('document-parse', {
  async: true,
  input: { fileUrl: 'https://example.com/a.pdf' },
  idempotencyKey: 'req-001',
})

const done = await client.waitForCompletion(started.executionId)
console.log(done.status, done.nodeRecords)

// 或 SSE 流
for await (const evt of client.streamExecution(started.executionId)) {
  if (evt.event === 'execution') console.log(evt.data)
  if (evt.event === 'done') break
}

// HITL 恢复
await client.resume(started.executionId, { approved: true })
```

## API

| 方法 | 说明 |
|---|---|
| `executeById(id, req)` | 按 workflow ID 执行 |
| `executeBySlug(slug, req)` | 按 slug 执行 |
| `getExecution(id)` | 查询执行状态 |
| `poll(id, opts)` | 轮询至终态 |
| `waitForCompletion(id, opts)` | 同 poll，可指定 until |
| `streamExecution(id, signal?)` | SSE 进度流 |
| `resume(id, input)` | HITL 恢复 |
| `cancel(id, reason?)` | 取消执行 |

类型与 `@schema-platform/ai-shared/agentWorkflow` 对齐。

详见 [workflow-open-api.md](../docs/design/workflow-open-api.md)。
