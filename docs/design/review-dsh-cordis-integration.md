# DSH/Cordis 合入开发审查报告

- 日期：2026-08
- 范围：`ai/` 仓库（app 前端适配层 + harness 服务 + 规则与设计文档）
- 结论：**合入成立，与设计无偏移**。M0-M6 v1 全部落地，规则符合性 A-G 全通过，审查中发现的 1 个 G 级缺陷已修复并复验。

## 1. 交付物总览

| 层 | 内容 |
|---|---|
| app 适配层 | `src/plugins/`（host/types/bridge/config + chatTools/nodeTypes/renderers 服务 + registry/skill 适配器），21 项插件测试 |
| app 集成 | usePluginRegistry/usePluginRuntime、api/harness/ 客户端（4 测试）、HarnessTraceView、PluginCenter 运行时 tab、vite 代理、路由 |
| harness 服务 | profile（dsh-base + 三插件）+ runner-http（5 端点）+ platform-tools + trajectory-forward + 双 smoke 脚本 |
| 契约 | `harnessTrace.ts` ↔ trajectory-forward zod schema（12/12 字段一致） |
| 规则 | `ai/CLAUDE.md` 插件体系规则 6 条 |
| 设计 | `ai/docs/design/dsh-cordis-integration.md`（含 §4.2 范围修正、§5.4 门禁状态、§5.7 心智模型、§5.8 轨迹接入） |

**验收证据**：app 全量回归 940/940（83 文件）；harness smoke 全链路 PASS；并发双会话隔离 PASS；typecheck 干净；EADDRINUSE 启动失败路径验证响亮报错。

## 2. 规则符合性（A-G）

| 项 | 结论 | 证据 |
|---|---|---|
| A 适配层唯一出口 | ✅ | 业务代码 0 处直接 import `@deepseek-ai/*`（grep 验证） |
| B 版本锁定 | ✅ | 全部精确版本无 `^`/`~`（app/harness/plugins 三处 package.json） |
| C 静态插件/动态数据 | ✅ | 浏览器侧无 loader 动态 import；workflow 无插件化；工具经 `setOverlay`/`register` 动态注册 |
| D 禁双轨 | ✅ | agentTools/agentNodes/RendererRegistry 三个旧文件删除；残留仅溯源注释（3 处过时注释已更新） |
| E server/ 隔离 | ✅ | `git status` server/ 零改动 |
| F 轨迹契约 | ✅ | zod ↔ TS 字段逐名比对 12/12 一致；nullable 语义对齐（恒存在 null） |
| G 质量 | ✅（1 缺陷已修） | 见 §3 |

## 3. 审查发现（按严重度，全部已修复）

### G-1（已修复）runner-http 监听失败 rejection 悬挂
- 现象：`listening` promise 在 listen 失败（如端口占用）时无人 await，直至 dispose 才结算；`once('error')` 在成功监听后会把后续 server 错误静默吞掉。
- 修复：`server.on('error')` 持久监听——未监听时 reject 使插件 fiber 装载失败（`dsh: fatal load failure: listen EADDRINUSE` 非零退出）；已监听后 `setImmediate throw` 拒绝静默。disposer 改为 `listening.then(...)` 交付。
- 复验：smoke PASS；占用 5310 后启动实测响亮失败。

### G-2（已修复）测试基础设施 vi.mock 模块缓存污染
- 现象：全局 setup 启动宿主 -> renderers 预设组件链把 `@vue-flow`/`marked` 等真实模块提前载入缓存 -> 124 个测试的 `vi.mock` 失效。
- 修复：宿主仅在需要渲染器的 spec 图内启动；setup.ts 还原无 diff。
- 复验：940/940。

### M-2（已修复）query token 放行全部路由（对抗审查 M2）
- 修复：query token 限定 GET events 路由；其余路由仅 Bearer。

### M-3（已修复）SSE 写竞态（对抗审查 M3）
- 修复：interval 写前检查 `res.writableEnded || res.destroyed`，销毁即清 timer。

### M-4（已修复）轨迹视图 callId 展示名不符实（对抗审查 M4）
- 修复：`lastEventFor` 删除，改用投影 `resultSeq`/`isError` 字段渲染。

### N-1..N-4（已修复）
- N1 layers.ts 注释语义滞后；N2 两处陈旧注释（runner 鉴权头/AiMessageContent）；N3 批量适配器替代逐条包装；N4 补 `smoke:isolation` script + EventSource 订阅单测（30/30）。

## 4. 待用户决策（不影响合入，立项门禁项）

1. 租户级隔离（auth→tenant 映射 + 预算）实现
2. 部署形态：C-1 独立服务（推荐）
3. `deploy/pack.sh` harness target（跨项目）

## 5. 下迭代建议

1. 智能体节点/HITL 映射立项后优先做（nodeTypes 动态层注册口已就绪）
2. gateway 化：SSE query token 通道换正式鉴权（平台 JWT）
3. harness 增加按会话 token 预算熔断（budget 插件落地）
