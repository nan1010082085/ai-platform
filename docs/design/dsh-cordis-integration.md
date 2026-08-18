# ai/app × DeepSeek Harness 融合设计（方向 A + C）

- 状态：草案（待评审）
- 日期：2026-08-15
- 范围：`ai/app`（前端）内可执行部分 + 涉及 `server/` / 独立服务的跨项目立项说明
- 决策记录：方向 A（Cordis 客户端插件运行时）与方向 C（DSH 作为 agent 运行时）并行推进；本方案先落地 A，C 走立项门禁

---

## 1. 背景与目标

ai/app 的插件体系目前是**元数据目录**：`PluginCenterView` / `usePluginRegistry` / `pluginApi` 从服务端 registry 拉取 experts / skills / tools / mcpServers，按租户 overlay 展示。前端没有插件运行时、依赖注入与生命周期管理，扩展点散落在静态常量（`constants/agentTools.ts`、`agentNodes.ts`）与各自为政的 composables 中。

DeepSeek Harness（DSH）的插件系统基于 **Cordis 4**（`@deepseek-ai/cordis`）：`Context` / `Service` / `Fiber` 依赖注入容器，配置驱动加载（bundles + 分层 patch），dispose 自动清理，开发期 HMR。

**目标**：

1. **方向 A（客户端基建）**：用 Cordis 把 ai/app 的插件中心从"目录展示"升级为"可配置、可插拔、有生命周期的插件容器"，统一所有前端扩展点。
2. **方向 C（运行时能力）**：将 DSH 作为 agent 运行时接入，让 ai/app 复用 goal / plan / subagent / skill / workflow 等成熟 agent 基建，减少自研 agent loop。

**非目标**：直接把 `dsh web` GUI iframe 嵌给 SaaS 租户（认证、多租户、运维成本不划算，不纳入）；方向 B（skill 格式对齐）作为 C 的前置项顺带完成。

---

## 2. 现状盘点

### 2.1 ai/app

| 维度 | 现状 |
|---|---|
| 技术栈 | Vue 3 + TS + Pinia + Element Plus，iframe/qiankun 嵌入 editor/flow |
| 插件体系 | 服务端 registry 快照：experts / skills / tools / mcpServers，租户 overlay（`X-Tenant-Id`），本地层写（`PluginLocalLayer = mcp\|tools\|experts\|skills`） |
| 扩展点 | 静态常量 `agentTools.ts` / `agentNodes.ts`、消息渲染器、附件处理、MCP 健康检查等散落实现 |
| agent 执行 | 前端调 `executeWorkflow` / `continueExecution` / `resumeExecution`（`api/agentWorkflowApi.ts`），agent loop 在 server 侧 |
| 约束 | 禁止修改 `server/`；全局状态用 Pinia；API 聚合在 `src/api/`；组合式 API 优先 |

### 2.2 DSH / Cordis

| 维度 | 现状 |
|---|---|
| 版本 | `@deepseek-ai/dsh` 0.1.0-rc.6（rc 阶段），`@deepseek-ai/cordis` 4.0.1，MIT |
| 插件框架 | Cordis：DI 容器 + Service 生命周期 + 配置驱动 loader + include/HMR/timer 插件 |
| 配置模型 | 分层 patch：内置 bundle → profile `cordis.patch.yml` → home patch → `--patch` 覆盖 |
| 运行时形态 | `dsh --profile web`（浏览器 GUI + API proxy）、`dsh --profile headless "job"`（一次性任务） |
| 生态 | skill（SKILL.md）、subagent、goal、plan、workflow、jobs、tools 系列包 |

### 2.3 关键发现（已验证）

1. **语义同构**：DSH 的"内置 bundle + 分层 patch"与 ai/app 现有"内置常量 + 服务端 registry + 租户 overlay + 本地层写"概念一一对应，迁移是升级而非重写。
2. **浏览器可用**：`@deepseek-ai/cordis` lib 无 `node:` 顶层导入、无 process/Buffer 依赖（core 约 60KB），依赖仅 cosmokit + standard-schema；DSH 自己的 Web 前端（`dsh-client-ui-*`）即浏览器内跑 Cordis，可行性基本确认。POC 仍需验证细节（见 M0）。
3. **配置格式差异**：DSH 用 YAML（`cordis.patch.yml`），前端侧直接用服务端下发的 JSON 即可，无需引入 YAML 解析（dev 场景除外）。

---

## 3. 目标架构

```mermaid
graph TB
  subgraph 浏览器["ai/app（浏览器）"]
    UI[Pinia / 组件 / Composables]
    HOST["Cordis 宿主<br/>src/plugins/host.ts"]
    ADAPT["插件适配层<br/>src/plugins/"]
    P1[tool 插件] -.service.-> HOST
    P2[渲染器插件] -.service.-> HOST
    P3[节点类型插件] -.service.-> HOST
    UI --> ADAPT
    ADAPT --> HOST
    CFG["配置层：内置 bundle<br/>+ registry overlay<br/>+ 本地 patch"]
    HOST --> CFG
  end
  subgraph server["server/（Koa + MongoDB，ai/app 不可改）"]
    REG[插件 registry API<br/>experts/skills/tools/mcp]
    WF[agent workflow 执行]
  end
  subgraph dshsvc["DSH 运行时（方向 C，独立立项）"]
    DSH[DSH profile<br/>web / headless]
  end
  UI -->|api/ 聚合| REG
  UI -->|api/ 聚合| WF
  UI -. 方向 C .->|session API| DSH
```

**分层原则**：

- Pinia 管 UI 状态；Cordis 管能力注册与生命周期，二者不互相替代。
- 业务代码只依赖 `src/plugins/` 适配层导出的类型与 API，**禁止直接 import `@deepseek-ai/cordis`**（版本隔离与可替换性）。
- API 调用仍聚合在 `src/api/`；插件通过注入的 client service 访问。

---

## 4. 方向 A：Cordis 客户端插件运行时

### 4.1 目录结构

```
src/plugins/
├── host.ts                 # 根 Context 单例 + 启动/重启（含 HMR dispose）
├── types.ts                # declare module '@deepseek-ai/cordis' 扩展点类型
├── registry-adapter.ts     # PluginRegistrySnapshot → 配置层/patch 映射
├── config/
│   ├── builtin.ts          # 内置 bundle 配置（对应现有常量）
│   └── layers.ts           # 分层合并：builtin → overlay → local patch
└── plugins/                # 具体插件（Service）
    ├── chat-tools/         # 聊天工具注册（agentTools）
    ├── node-types/         # workflow 节点类型（agentNodes / toolNodeTypes / expertNodeTypes）
    ├── renderers/          # markdown/ppt/pdf 消息渲染器
    ├── attachments/        # 附件处理
    ├── mcp-health/         # MCP 健康检查
    └── model-providers/    # 模型供应商适配
```

### 4.2 扩展点契约（第一批）

| 扩展点 | 现状 | 目标 Service | 状态 |
|---|---|---|---|
| 聊天工具 | `constants/agentTools.ts` 静态表 | `chatTools`：注册/查询/分类（base/overlay/patch 三层） | ✅ M0/M1 |
| workflow 节点类型 | `agentNodes.ts` 等常量 | `nodeTypes`：注册 palette 项与默认数据（动态层 = M6 智能体节点注册口） | ✅ M2 |
| 消息渲染器 | `RendererRegistry.ts` 模块单例 | `renderers`：按 priority 匹配分发 | ✅ M2 |
| 附件处理 | `useChatAttachments.ts` | **不迁移**：UI 状态 composable（i18n/toast/单视图消费），非注册表型扩展点，保持组合式 API 是本项目分层规范 | 评估后排除 |
| MCP 健康检查 | `useMcpHealth.ts` | **不迁移**：同上，探针结果 UI 状态，非注册表 | 评估后排除 |
| 模型供应商 | `useModelCenter.ts` / `constants/modelProviderMeta.ts` | `modelProviders`：供应商元数据注册表（M4+ 按需评估） | 待评估 |

迁移原则：只迁移**注册表型**扩展点（多源注册、优先级、生命周期）；UI 状态管理留在 Pinia/组合式 API。每个迁移即"现有实现 → Cordis Service"，行为不变、测试保留。

### 4.3 配置层映射

| ai/app 现有 | Cordis 层 | 说明 |
|---|---|---|
| `constants/*` 内置工具/节点 | builtin bundle patch | 随代码打包，不可关闭 |
| 服务端 registry（`fetchPluginRegistry`） | overlay 层 | 运行时从服务端拉取，租户维度合并 |
| `PluginLocalLayer` 本地写（`pluginApi`） | user patch 层 | localStorage 持久化 |
| dev 调试注入 | `--patch` 等价物 | dev-only 注入点 |

合并顺序与优先级与 DSH 一致：builtin < overlay < user patch。`registry-adapter.ts` 负责把 `PluginRegistrySnapshot` 转换成 overlay 配置，保持 `pluginApi.ts` 接口不变，前端 UI（`PluginCenterView`）先不动。

### 4.4 Vite 与 HMR

- Cordis core 直接作为依赖引入（`pnpm add @deepseek-ai/cordis`，**精确锁版本**）。
- 不用 `cordis-plugin-loader` 的运行时动态 import（浏览器无法按任意路径加载）；配置层指向**已静态注册的插件映射表**，loader 语义（树管理、分组）在 `host.ts` 适配层实现。
- dev HMR：`import.meta.hot` 下 `ctx.fiber.dispose()` 后重建对应 fiber，验证通过后再评估 `cordis-plugin-hmr`。
- 构建产物增量预估：cordis + cosmokit 约 75KB（gzip 前），可接受；通过分包与按需加载控制。

### 4.5 测试策略

- POC 单测：浏览器（jsdom）环境跑 `Context` + 插件启动/停止/dispose，验证无监听器泄漏。
- 每个迁移扩展点保持原有 spec 通过（适配后逐条回归）。
- 新增：配置层合并单测（builtin/overlay/patch 优先级）、registry-adapter 快照测试。

---

## 5. 方向 C：DSH 作为 agent 运行时（跨项目立项）

### 5.1 部署形态选项

| 选项 | 说明 | 评价 |
|---|---|---|
| **C-1 独立 DSH 服务（推荐）** | 新部署目标：Node 服务跑 DSH profile（web 模式提供 API proxy），ai/app 通过 `src/api/harness/` 对接 | ai/app 边界内可做前端部分；server/ 不动 |
| C-2 server/ 内嵌 DSH runtime | 在 `server/` 里以依赖方式引入 DSH | **违反项目隔离规则**，需 server 项目组立项，本方案只描述不改动 |
| C-3 前端直连租户 DSH 实例 | 每租户一个 DSH 进程 | 运维与鉴权复杂度高，仅内部工具可选 |

### 5.2 职责边界

| 层 | 职责 | 归属 |
|---|---|---|
| ai/app | `api/harness/` 聚合 session/消息接口、会话 UI 适配（流式、附件、工具轨迹） | 本仓可执行 |
| DSH 服务 | agent loop、tools、subagent、goal、plan、skill | 独立部署目标，rc 版本锁定 |
| server/ | 现有 agent workflow、registry、租户体系 | 保持不动；是否迁移其能力到 DSH 由用户决策 |

### 5.3 关键设计问题（立项评审清单）

1. **多租户隔离**：DSH profile 是单工作区模型。方案：会话级隔离（每租户每会话独立 DSH session）+ 网关鉴权，profile 共享只读；需验证 DSH session API 的隔离边界。
2. **鉴权链路**：ai/app 现有 token 体系如何映射到 DSH 服务的访问控制（API proxy 层还是独立网关）。
3. **与现有 agent workflow 共存**：新会话可路由到 DSH（灰度），存量 workflow 会话继续走 server；长期评估能力迁移，禁止一刀切替换。
4. **rc 版本风险**：0.1.x rc 的 API 不稳定。对策：接口适配层（`api/harness/`）吸收变更；版本升级策略为"锁定 + 评估 changelog 再升"。
5. **深度集成收益点**：goal（长任务）、plan-mode（设计确认流）、subagent（并行分解）、skill（SKILL.md 复用）与 ai/app 的 Schema/Flow 生成场景天然契合，立项时以这四者为验收能力。

### 5.4 门禁条件（方向 C 正式开发前必须满足）

实施状态（2026-08-18，M6 轮更新）：

- [x] **会话级隔离 POC 通过**：`harness/scripts/smoke-isolation.mjs` 实测单进程并发双会话——SSE 帧归属正确（异会话帧即失败）、轨迹投影各自独立、并发下工具路径正常、优雅退出
- [x] **租户级隔离 v1 落地**：`tenant-gateway` 插件——Bearer→tenant 解析（allowlist POC / verifyUrl 内省）、每租户会话配额（429）、按会话 token+工作量双预算（402 BUDGET_EXCEEDED）、SSE 短时效票据（多票据并发订阅）；`smoke-budget.mjs` 验收通过
- [x] **租户鉴权生产化**：server 新增 `POST /api/ai/auth/introspect`（复用 jwt.verify + refresh 拒 + 黑名单，`tokenIntrospect.spec` 5/5）；harness tenant-gateway 接入 verifyUrl（`AI_HARNESS_VERIFY_URL`，内省缓存 TTL=JWT exp/60s + 负缓存 10s，allowlist 直通不打扰内省）；deploy.sh 生产启动注入内省端点；`smoke-introspect.mjs` 验收通过（tenantId 解析/缓存/allowlist 直通/401/全链路）
- [x] **部署形态确认（已确认 C-1）**：`ai/harness` 独立部署，DSH profile + pm2 管理，端口 5310；deploy 脚本已就绪（`pack.sh --target harness` + `deploy.sh --target harness`）
- [x] **部署脚本 harness target**：`deploy/pack.sh --target harness`（stage_harness 打包，实测产物 `harness-*.tar.gz` 53M 含完整运行时依赖）+ `deploy/deploy.sh --target harness`（pnpm install + pm2 `ai-harness` 进程，DSH_HOME 指向 dsh-home）
- [x] **SSE 正式票据鉴权**：`POST /events-ticket`（Bearer）签发 5 分钟短时效票据，`GET /events?ticket=` 连接；每会话多票据并发订阅；query token 明文通道已移除
- [x] **智能体节点/HITL 映射（前端就绪）**：autonomous-agent 节点类型已注册（palette + NodeData 字段 + HITL store 扩展）；nodeTypes 动态层注册口已就绪；节点执行需 server 侧 executor 配合（跨项目立项项），契约见 §5.6 agent-as-node

### 5.5 harness 服务形态（落地为 `ai/harness` 新子包）

DSH 原生即 Host/Client 分离：`dsh-api-gateway` 在 Host 侧提供 `ctx.typertGateway`（HTTP `/api` RPC），浏览器/客户端经 `ctx.remote` 调用；agent 栈可编程（`ctx.agents` 创建持久化 Agent、提交用户消息、等待停稳）。因此独立服务是设计内用法，不是 hack。

- **位置**：`ai/harness/`（ai 项目第四个子包：app / sdk / shared / harness），Node 服务，新部署目标；`server/` 不动。
- **组成**：DSH base bundle（裁掉浏览器 UI 插件）+ 自写 Cordis 插件：
  | 插件 | 职责 |
  |---|---|
  | `auth` | 校验平台 JWT，映射租户/用户身份 |
  | `tenant-sessions` | 租户会话生命周期与隔离边界 |
  | `workflow-tools` | 把已发布 workflow 注册为 DSH 工具（workflow-as-tool） |
  | `platform-tools` | Schema/Flow 领域工具（与 ai/app 客户端 Cordis 工具插件同框架，可近乎原样复用） |
  | `budget` | 按会话 token 预算与熔断 |
  | `trajectory-forward` | 会话轨迹投影转发：把 DSH 会话事件折叠为平台轨迹读模型，推送前端（§5.8） |
- **与 ai/app 的关系**：客户端方向 A 写的 Cordis 工具插件与 harness 侧共享同一框架与类型，仅入口不同（浏览器 vs Node）。

### 5.6 与现有 workflow 的关系：双向桥接，而非整体重构

DSH 的世界观里 workflow 是智能体调用的**工具**（`dsh-tool-workflow`：扇出编排脚本）；ai/app 的世界观里 workflow 引擎是**编排者**（expert/tool 是节点）。两者通过双向桥接融合，不互相取代：

```
智能体世界（DSH harness）            工作流世界（ai/app + server）
  Agent ──调用──> [workflow 工具] <──注册── 已发布 workflow
  [自主智能体节点] <──执行── workflow 引擎（设计器/模板/评测/排程保留）
```

- **workflow-as-tool**：每个已发布 workflow 注册为 DSH 工具，智能体可调用确定性流水线。
- **agent-as-node**：设计器新增"自主智能体节点"，后端为 DSH one-shot subagent（限定工具集、预算、超时）；continuable subagent + interrupt 与现有 HITL（`stores/hitl.ts`）语义对齐——等待人工审批的节点即一个挂起的 continuable subagent。
- **被替换的只有实现层**：server 侧 agent loop（expert 执行、工具分发）可渐进迁移到 DSH 栈；设计器、workflow 定义格式、模板、评测（EvaluationView）、排程（ScheduleView）全部保留。
- **不退化为单黑盒智能体的产品理由**：模板市场、可评测、可排程、可审计、成本可控、租户可编排是 SaaS 差异化；单智能体无法保证以上任何一项。
- **远期选项（双运行时）**：同一 workflow 定义支持两种执行——确定性引擎，或编译为智能体的 plan + 工具集由 agent 驱动遍历；评测视图可对比两种执行结果后再决定推广策略。

### 5.7 心智模型与常见误解

依赖方向与单元划分（校准记录）：

| 误解 | 正确模型 |
|---|---|
| DSH 是被 agents 使用的 server | harness **运行** agents；平台组件（ai/app、server/）是 harness 的客户端；agent 在进程内消费 Cordis 服务 |
| 每个 workflow 是一个 Cordis 插件 | 插件是**静态代码**，workflow 是**运行时数据**；一个 `workflow-tools` 插件动态注册 N 个工具（每 workflow id 一个） |
| 每个暴露的 workflow id 是一个智能体 | workflow id 映射为**工具**（确定性宏技能）；智能体是少数决策循环，工具可成百上千；"按单元成智能体"落在 expert persona（agent 配置）上 |

一句话：**智能体里可以有 workflow 工具，workflow 里可以有智能体节点**；插件（代码）静态加载，工具（数据）动态注册，agent（决策循环）少量存在。

### 5.8 轨迹接入 workflow 日志（trajectory -> execution log）

DSH 的 Trajectory 是**会话事件日志**的投影渲染：按轮次组织的 user/assistant/tool 记录，含 token 用量、TTFT/解码时长、嵌套子工具、流式帧、压缩记录。`dsh-session-projection` 提供 `ctx.sessionProjections`：领域插件注册纯函数折叠单元（`{ key, schema, init, apply, view, stateVersion }`），框架在已提交事件流上驱动，载体（api-proxy）以 `session/projection` 帧推送快照与增量。

**接入设计**：

1. **协议类型落点（M0 已核实）**：本仓实际无 `ai/shared` 子包，AI 共享层在 `shared/platform-shared/ai`（跨项目）。M0 将 `AgentNodeTrace` 暂放 `ai/app/src/types/harnessTrace.ts`（当前唯一消费者）；正式化时迁入 `shared/platform-shared/ai`，属跨项目改动需立项确认。
2. **harness 侧**：`trajectory-forward` 插件注册投影单元 `platform.nodeTrace`，把会话事件折叠为 `AgentNodeTrace`；经 SSE / projection 帧推送前端。
3. **前端落点**：agent 节点的执行详情（`AgentExecutionDetailView` / `WorkflowExecutionTimeline` / `AiStepCard`）新增"轨迹"页签，按同一事件 schema 渲染；实时更新走投影帧。
4. **事件映射**：

| DSH 会话事件 | workflow 日志条目 |
|---|---|
| turn / end | 轮次分组边界 |
| tool 调用（含取消/失败） | 工具步骤卡片（name、args 摘要、结果摘要、耗时、token） |
| subagent start / end | 嵌套折叠时间线（子轨迹） |
| workflow run-start / run-end | 嵌套 workflow 边界标记 |
| token-meter 用量 | 节点/轮次成本字段 |
| compaction（压缩） | "上下文压缩"标记行 |

5. **收益外溢**：同一事件 schema 可反哺非 agent 节点（server 工作流引擎若采用同 schema，全链路统一可观测）--跨项目可选项。
6. **POC 路径**：投影帧直连前端（不动 server/）；正式期再评估是否由 server 持久化轨迹副本。

---

## 6. 分阶段路线图

| 里程碑 | 内容 | 产出/验收 | 预计 |
|---|---|---|---|
| **M0 POC** | 浏览器内跑 Cordis Context + 2-3 个插件（chat 工具注册、渲染器），验证 Vite 打包与 dispose | demo 分支 + 验证报告 | 1-2 天 |
| **M1 基建** | `src/plugins/host.ts`、类型扩展、`registry-adapter.ts`、版本锁定、单测骨架 | 适配层就绪，业务零改动 | 2-3 天 |
| **M2 扩展点迁移** | 第一批迁移：chatTools / nodeTypes / renderers（§4.2 表），逐一回归 `__tests__` | 常量路径改为插件注册，UI 行为不变 | 3-5 天 |
| **M3 配置分层** | overlay（registry）+ user patch（localStorage）+ PluginCenter 只读展示插件树 | 租户 overlay 在插件层生效 | 2-3 天 |
| **M4 格式对齐（方向 B）** | skills 采用 SKILL.md 元数据结构；`PluginRegistrySnapshot` 与 bundle manifest 对齐 | 一份 skill 双端可用 | 2-3 天 |
| **M5 方向 C 立项** | 完成 §5.4 门禁；`ai/harness` 最小 POC（DSH Host + JWT + 单租户会话 + 1 个平台工具，§5.5） | POC 跑通可编程 agent 会话与并发 | 按评审 |
| **M6 方向 C 接入** | `api/harness/` 前端聚合 + HarnessTraceView（轨迹渲染）+ dev 代理（v1 已交付）；设计器"自主智能体节点"与 HITL 映射依赖 server/ 配合，注册口（nodeTypes 动态层）已就绪，列立项后项 | v1：api 客户端 4 测试 + 轨迹视图 + 940 回归；立项后：智能体节点/HITL | 立项后 |

实施状态（2026-08-18）：M0 ✅ · M1 ✅ · M2 ✅（§4.2 范围修正：attachments/mcpHealth 评估后排除）· M3 ✅（运行时 tab，patch 层 UI 简化为只读可见）· M4 ✅ · M5 门禁清单 ✅（三项决策已全部确认：部署形态 C-1、智能体节点前端就绪、PluginCenter 启停升级完成）· M6 v1 ✅。

---

## 7. 风险与对策

| 风险 | 等级 | 对策 |
|---|---|---|
| `@deepseek-ai/*` rc 版本 API 漂移 | 高 | 精确锁版本；适配层吸收变更；升级走 changelog 评审 |
| Cordis 浏览器端边缘行为（loader/HMR/事件循环） | 中 | M0 POC 先行验证；不用动态 import loader，映射表替代 |
| 迁移期双轨（常量 + 插件）并存造成混乱 | 中 | 每个扩展点"迁移完即删除旧常量"，禁止长期双轨 |
| 方向 C 多租户隔离不可行 | 中 | M5 门禁提前验证，不可行则降级为内部工具形态 |
| 团队对 Cordis 心智模型成本 | 低 | M0 demo + 适配层封装业务无感；文档 §8 术语表 |

---

## 8. 术语表

- **Context / Fiber**：Cordis 根容器 / 插件生命周期句柄，dispose 自动清理其注册的一切资源。
- **Service**：挂在 Context 上的能力服务，通过 `inject` 声明依赖。
- **bundle / patch**：插件组合包 / 配置补丁层，按序叠加。
- **registry overlay**：服务端下发的插件元数据层，等价 DSH 的用户 patch 层语义。

## 9. 开放问题（已决策 2026-08-18）

1. **✅ 部署形态**：确认 C-1 独立服务（ai/harness 独立部署，pm2 管理，端口 5310）。
2. **✅ 智能体节点/HITL**：前端先做 autonomous-agent 节点注册口 + HITL store 扩展；server 侧 executor 改造列立项后项。
3. **✅ PluginCenter 启停**：已升级为可启停插件树（chatTools/nodeTypes/renderers 各 Service 增加 enable/disable + localStorage 持久化 + PluginCenterView toggle switch）。

## 10. 账号级每日 RMB 额度（10 元/日，双闸）

背景：线上用真实 key 提供默认服务（deepseek + mimo），需防止成本失控。语义：**账号级共享**（所有租户共用真实 key 的日花费 ≤ 10 RMB）。

### 主闸（server/，已实施）

- **账本** `DailyCostMeter`（MongoDB）：`{dateKey(Asia/Shanghai 自然日), provider, costInRmb}`，唯一索引 `{dateKey, provider}`，`$inc` 原子累加。
- **计量口径（v1 保守估计）**：输入 ≈ 字符/4，输出 = maxTokens；计价 **三级解析** `resolvePrice(provider, model, now)`——**切换模型自动切换计费**（deepseek-v4-flash 高峰 0.003/0.009、deepseek-v4-pro 高峰 0.009/0.027 RMB/1k，模型级精确匹配，未知模型回落 provider 默认）；**峰谷分时**（高峰每日 09:00-14:00 Asia/Shanghai）按 `daily_cost_pricing_mode`（默认 `conservative` 恒取高峰宁多勿漏；`actual` 按当前时刻取价低峰减半）；其余 provider 原美元 ×7.2 折算占位待核对；全部可经 systemConfig `daily_cost_prices` 热更新覆盖。
- **记账点**：`getLLM()`（唯一咽喉）返回的模型经 `wrapModelForCostMeter` 包裹（Proxy 递归覆盖 stream/invoke/bindTools），每次调用前置 `assertDailyBudget` + 预估记账——不受模型缓存影响。
- **断流语义**：配额命中 fail-closed（429 `DAILY_QUOTA_EXCEEDED`，expose）；计量故障 fail-open（放行 + 记日志）。
- **计量范围（精确判别，用户自带 key 豁免）**：`decideMetered()` 判定——userConfig（用户显式自带 key）→ 不计量；env 来源（LLMManager/env fallback，即 .env 配置文件的平台 key）→ 计量；DB 来源 → 解析 key === env key **或** Provider 记录 `keyOwner==='platform'` → 计量，`keyOwner==='tenant'` 且 key ≠ env key（租户自带 key）→ 不计量。Provider 新增 `keyOwner`（默认 platform，向后兼容；create/update 可显式传 tenant）。
- **用户 key 安全**：静态 AES-256-CBC + PBKDF2（save hook 自动加密，`CREDENTIAL_SECRET`）；响应层 `maskApiKey` 掩码；errorHandler 对 sk-/tp-/Bearer 做日志与响应双重脱敏；迁移脚本 `pnpm migrate:provider-keys` 加密 legacy 明文 key + 回填 keyOwner。
- **配置热更新**：`daily_cost_limit_rmb`(10) / `daily_cost_soft_threshold_rmb`(8) / `daily_cost_rmb_per_usd`(7.2) / `daily_cost_prices`，走 getSystemConfig（60s TTL）。
- **观察**：`GET /ai/cost-meter`（dateKey/totalRmb/limitRmb/remainingRmb/perProvider）；前端 errorCodes 已映射 `DAILY_QUOTA_EXCEEDED` 友好文案。

### 副闸（ai/harness，已实施）

`tenant-gateway` 增加每日 RMB 预算（`AI_HARNESS_DAILY_RMB_BUDGET`，默认 10）：按会话 token 估算（usage 缺失按字符/4）→ 单价 × 汇率 → `dailyRmbBySession` 跨会话日累计，`assertBudget` 前置拒绝（402 BUDGET_EXCEEDED，RMB）。防 harness 共享真实 key 时的第二道防线；与主闸同口径、独立进程记账（进程重启清零，需与主闸对账时再上报 server 账本）。

### 已知边界（如实记录）

- v1 为保守估计（输出按 maxTokens），宁多勿漏；后续可升级为流式 usage 精确记账（stream_options include_usage + 末块核算）。
- 副闸为进程内存账本，跨进程需对账（生产若 harness 独立部署，建议接入主闸上报接口）。
- 现有 provider `trackUsage`（非 stream 路径）与主闸计量并存但互不干扰，主闸为权威断流。
