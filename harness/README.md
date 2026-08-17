# ai/harness — DSH Agent 运行时服务（方向 C POC）

基于 `@deepseek-ai/dsh@0.1.0-rc.6`（精确锁定）的独立 Node 服务：把 DSH Agent 暴露为 HTTP 会话 API，供平台侧消费。设计依据：`../docs/design/dsh-cordis-integration.md`。

## 架构

```
dsh --profile ai-harness            # DSH 启动器
└─ bundles: @deepseek-ai/dsh-base   # session/agent/tools/skill/goal/plan 全家桶（无浏览器 UI）
└─ 自写插件（静态装载）:
   ├─ runner-http           session API + SSE（走 ctx.agents）
   ├─ platform-tools        platform_echo / platform_workflow_invoke（workflow-as-tool）
   └─ trajectory-forward    platform.nodeTrace 投影（会话事件 -> AgentNodeTrace）
```

## 目录

- `dsh-home/profiles/ai-harness/` — profile 源码（package.json 内嵌 dsh.profile.bundles + cordis.patch.yml）
- `plugins/` — 三个自写插件（profile 以 `link:` 引用，即改即生效）
- `scripts/smoke.mjs` — 全链路验收（mock LLM 驱动）

## 运行

```bash
pnpm install                       # 根：dsh + 插件作者依赖
pnpm smoke                         # 全链路验收（mock LLM，无需任何真实 API key）
pnpm smoke:isolation               # 并发双会话隔离验收
pnpm smoke:budget                  # 租户配额 / 预算 / 票据鉴权验收
pnpm start                         # 真实启动（需 DeepSeek 凭据）
```

生产凭据：`DEEPSEEK_BASE_URL` / `DEEPSEEK_API_KEY`（或 `$DSH_HOME/.credentials.yaml`）。服务默认监听 `127.0.0.1:5310`，鉴权经 tenant-gateway 插件（见下）。

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/healthz` | 健康检查（含网关统计） |
| POST | `/session/start` | 创建持久化 Agent 会话 -> `{ sessionId, tenantId }`（租户配额） |
| POST | `/session/:id/message` | 提交用户消息，等待停稳 -> `{ text, reason, budget }`（预算断言） |
| POST | `/session/:id/events-ticket` | 签发 SSE 短时效票据 -> `{ ticket }` |
| GET | `/session/:id/events?ticket=N` | SSE 增量推送会话事件（票据鉴权） |
| GET | `/session/:id/trace` | platform.nodeTrace 投影快照（AgentNodeTrace） |

## 租户网关（tenant-gateway 插件）

- **鉴权（生产化）**：Bearer token -> tenantId，两级解析：
  1. `cordis.patch.yml` 的 `allowlist` 静态映射（开发/本地冒烟直通，不打网络）
  2. `verifyUrl` 内省端点（生产主路径，配置 `AI_HARNESS_VERIFY_URL` 或 config.verifyUrl）——
     复用 server `/api/ai/auth/introspect`（jwt.verify + refresh 拒 + 黑名单），响应 `{success,data:{tenantId}}`
- **内省缓存**：token -> tenantId 缓存（TTL = JWT exp 或 60s）；无效 token 负缓存 10s 防打爆内省端点；
  allowlist 命中的 token 不触发内省。
- **配额**：每租户活跃会话上限（默认 5，`AI_HARNESS_SESSIONS_PER_TENANT` 可覆盖），超出 429。
- **预算**：按会话双预算——token（usage 累加）与工作量（工具调用次数），前置断言已用量 >= 上限即 402 BUDGET_EXCEEDED；另按会话 **RMB**（DeepSeek V4-Flash 高峰价 0.003/0.009 RMB/1k，每日 `AI_HARNESS_DAILY_RMB_BUDGET` 默认 10 元）；`AI_HARNESS_BUDGET_TOKENS` / `AI_HARNESS_BUDGET_WORK_UNITS` 可覆盖。
- **SSE 票据**：`POST /session/:id/events-ticket`（Bearer）签发 5 分钟短时效票据，`GET /events?ticket=` 连接；每会话支持多票据并发订阅。

## 心智模型（铁律）

- 插件 = 静态代码（cordis.patch.yml 装载）；工具 = 数据（插件运行时 `ctx.tools.register` 注册）；workflow 永远是数据不是插件
- 轨迹 = 会话事件日志的投影（`sessionProjections` 纯函数折叠），协议类型见 `ai/app/src/types/harnessTrace.ts`
- `server/` 全程不动；正式接入需过设计文档 §5.4 门禁（多租户隔离 POC、部署形态确认）
