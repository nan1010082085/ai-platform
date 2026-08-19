# AI App Harness / 轨迹评级修复 — 实施计划（交 Claude）

> **状态:** 开放 · 决策已锁定  
> **范围:** 仅 `ai/app`（禁止改 `server/`、`harness/`）  
> **证据:** 走查 Canvas `ai-app-code-uiux-2026-08-19`  
> **设计:** `docs/design/dsh-cordis-integration.md` §5.6 / §5.8 / §9

**Goal:** 消掉 2026-08-19 走查 P0；Harness 对话 + 聊天内轨迹可演示；目标 **A-**（无开放 P0），再冲 **A**。

**Agent 执行:** 按 Task 顺序 T1→T8；每 Task 自带测试/验收；用户未要求时不要 `git commit`。

## 已锁定决策

| 项 | 决定 |
|----|------|
| T6 HITL agent | **隔离（下架正式路径）**，不接线 |
| 产品方向 | **保留** `autonomous-agent` 节点与类型契约，真接线另立 **M7**（前置：server executor + harness interrupt API） |
| 传统 HITL | **唯一正式路径**（`pendingInterrupt` + Chat 卡 + `ExecutionHITLDialog`） |

## Global Constraints

- 业务禁止 `import @deepseek-ai/*`；只用 `@/plugins` / `@/api/harness`
- 图标只用 `AppIcon` + 已注册名（`loading`、`chat-line-round`）
- 禁止空 `catch`；`chatMode=server` 不得回退
- Harness 事件权威：`assistant/message`、`turn/end`（见 `schema-platform/harness/plugins/runner-http`）

## Progress

| Task | Wave | Pri | 标题 | 状态 |
|------|------|-----|------|------|
| T1 | A | P0 | Harness SSE→StreamEvent + 消费 outcome | `- [x]` |
| T2 | A | P0 | harness finally 收尾 loading/status | `- [x]` |
| T3 | A | P0 | 暴露 harnessSessionId；stop 清 SSE | `- [x]` |
| T4 | B | P0 | 轨迹绑真实 session；无会话禁用 | `- [x]` |
| T5 | B | P0 | TracePanel Loading/图标/错误态 | `- [x]` |
| T6 | C | P1 | HITL agent **隔离**（已决策） | `- [x]` |
| T7 | C | P1 | PluginRuntime 去 log + 启停 listAll | `- [x]` |
| T8 | C | P2 | UX：语言按钮 / harness 菜单 / interrupt i18n | `- [x]` |

---

## Wave A — Harness 流可演示

### T1: SSE 映射 + 消费 outcome

**Files:** `app/src/stores/stream.ts`；新增/扩 `app/src/stores/__tests__/stream.harness.spec.ts`

**映射:**

| Harness | StreamEvent |
|---------|-------------|
| `assistant/message` | `{ type: 'content', content: text }`（从 `data.message.content` 抽 text blocks） |
| `turn/end` | `{ type: 'done' }` 并结束等待 |

- `sendHarnessMessage` 返回后：若尚无 `turn/end`，用 `outcome.text` 补推 `content` 并结束等待
- 超时：设 `error`，勿静默成功
- 测试：映射正确；Promise 在 `turn/end` 后 <1s 结束（勿空等 30s）

### T2: finally 收尾 loading / status

**Files:** `app/src/stores/stream.ts`（`executeHarnessStream`）

- `try/finally`：`loading=false`、`streamStatus='idle'`、退订 SSE；若 message 仍 `streaming` → `received`
- 测试：成功/失败后 `loading===false` 且 status 非 streaming

### T3: 暴露 sessionId + stop 清 SSE

**Files:** `app/src/stores/stream.ts`

- 导出 `harnessSessionId: Ref<string \| null>`（创建会话时写入）
- `stopGeneration` / `cancelCurrent` 必须退订 harness EventSource 并 resolve 等待
- 测试：stop 后 unsubscribe 调用一次

---

## Wave B — 轨迹可演示

### T4: 真实 session 绑定

**Files:** `app/src/components/AiChatPanel.vue`

- 删除 `startTracking('current-session')` 与硬编码 `session-id`
- 使用 `useStreamStore().harnessSessionId`
- 无 session：轨迹按钮 disabled + tooltip「当前无 Harness 会话」
- 有 session：`startTracking(id)`，`:session-id` 绑真实值

### T5: TracePanel UI 修复

**Files:** `AgentTracePanel.vue`；`useAgentTrace.ts`；必要时 `AiChatPanel` 传 `:error`

- Loading：`AppIcon name="loading"`，删除 `el-icon` / 未导入 `Loading`
- `chat-line-square` → `chat-line-round`
- 增加 `error` 态（非空态冒充）；`useAgentTrace` 禁止 `.catch(() => {})`
- 删未用 import

**Wave A+B 验收:**

1. server 模式发消息/停止无回归  
2. harness 可达时：有回复、loading 结束、停止有效  
3. 有 session 开轨迹：非占位 id；加载不崩；失败可见  

---

## Wave C — 冲 A

### T6: HITL agent 隔离（已决策 · 不接线）

**意图:** 传统 HITL 唯一正式路径；agent API 保留为 POC 契约，不参与正式状态、不画 UI、不接 SSE。

**Files:**

- `app/src/stores/hitl.ts`（主改）
- 可选：拆 `app/src/stores/hitl.agent.poc.ts`
- `app/src/stores/index.ts`（勿把 POC 当正式能力推销）
- 单测：明确「agent API 无生产调用方 / hasPendingInterrupt 不含 agent」
- 节点 `autonomous-agent`：**保留** palette（产品占位）；勿删字段

**必须做:**

1. 文件头写明：`@poc` — 待 M7（server executor + harness interrupt）再接线；禁止 Chat 消费  
2. `hasPendingInterrupt` **仅** `pendingInterrupt !== null`（去掉 OR agent 队列）  
3. `register/approve/reject/clear*AgentInterrupt`：保留实现但标注 POC；或移到 `hitl.agent.poc.ts`，`hitl.ts` 不再 export 给业务  
4. 全仓确认：无 Chat / stream 调用 agent API；`AiChatPanel` 仍只绑 `store.pendingInterrupt`  
5. 单测：`hasPendingInterrupt` 在仅有 agent 队列时为 `false`；传统 `setInterrupt` 仍为 `true`  
6. **禁止:** 接 SSE、Chat 新卡片、`sendHarnessMessage('approved')` 假恢复  

**M7 接线前置（本 Task 不做，只写注释/计划指针）:**

- server：`autonomous-agent` executor + 中断事件（nodeId/sessionId/subagentId）  
- harness：continue + interrupt HTTP  
- 前端：执行详情优先接线，再考虑 Chat  

### T7: PluginRuntime 清理

**Files:** `usePluginRuntime.ts`；`PluginCenterView.vue`

- 删除 debug `console.log`
- 启停列表用含禁用项的数据源（禁用后仍可见可再开）
- 文案：「仅本机 UI 过滤，不影响服务端工具」

### T8: UX 边角

**Files:** `AiLayout.vue`；`AiChatPanel.vue`（可选 `ConversationDrawer`）

- 语言切换：勿用 `chat-dot-round`；用文字「中/EN」或已注册语言相关图标  
- 设置 ops 组加 `/debug/harness`「Harness 轨迹」  
- interrupt placeholder 走 `t()`  
- 可选：抽屉去掉空 catch + loading  

---

## 不做清单

- 不改 `server/`、`harness/`  
- 不接线 agent HITL、不做假 approve  
- 不删 `autonomous-agent` 节点类型（除非用户另令）  
- 不顺手升级 `@deepseek-ai/*`  

## 交接手顺（给 Claude）

1. 读本文件 + `app/src/stores/stream.ts` + `hitl.ts`  
2. 按 T1→T8 实施；每 Task 跑相关 vitest  
3. Wave A+B 做人工验收三条  
4. 更新本文件 Progress 勾选  
5. 需要提交时再 commit（用户未说则不要 commit）  
