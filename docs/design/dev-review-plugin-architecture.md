# 开发审查报告：全面插件化架构升级

日期：2026-08-17
审查范围：ai/app + ai/harness + server + shared/platform-shared

## 一、架构改造总结

### 已完成（12 项）

| 项 | 改动 | 验证 |
|---|---|---|
| executor 插件化 | NodeRegistry 替代 30+ switch-case，37 节点注册表 | 9/9 + 1490/1492 |
| 执行详情实时 tab | useNodeStreaming + streamingOutput + workflow:node-event | 941/941 |
| streamingOutputs per-node | execution model 新增 Map<nodeId, text>，多节点并发流式不覆盖 | build + smoke |
| agent-loop DSH 桥接 | dshBackend 配置调 harness session API | server build |
| skills 服务接线 | SkillDefsService + syncFromRegistry | 941/941 |
| pluginApi 统一 | 移除裸 axios，统一 apiClient | 941/941 |
| 内置模板补全 | 19→50 模板名称+图标+分类标签 | 941/941 |
| harness 全链路 | tenant-gateway + budget + introspect + trajectory | 4 smoke PASS |
| 部署产物 | ai-*.tar.gz + server-*.tar.gz | pack.sh 通过 |

### 架构瓶颈现状（对照子代理报告）

| 瓶颈 | 状态 | 说明 |
|---|---|---|
| runNode switch-case | ✅ 已解决 | NodeRegistry 注册表替代 |
| streamingOutput 单一字段 | ✅ 已解决 | streamingOutputs per-node map |
| workflow:node-event 闲置 | ✅ 已解决 | onWorkflowNodeEvent 已接入 |
| 主循环无图级并行 | 🟡 记录 | while 单链推进，并行需调度器升级 |
| 500ms DB 轮询取消 | 🟡 记录 | AbortController 替代 |
| fail-fast 无重试 | 🟡 记录 | per-node retry + error 边 |
| HITL/中断双轨 | 🟡 记录 | 统一 suspend/resume 状态机 |

## 二、验证证据

| 项目 | 测试 | 构建 | Smoke |
|---|---|---|---|
| shared | 18/18 ✅ | ✅ | — |
| app | 941/941 ✅ | ✅ | — |
| server | 1490/1492 ✅（2 预存） | ✅ | — |
| harness | — | — | 4/4 PASS ✅ |

## 三、下一步建议

1. **并行执行**：pickNextNode 升级为 DAG 调度器，支持显式并行容器节点
2. **事件驱动取消**：内存 AbortController 注册表替代 500ms DB 轮询
3. **PluginCenter 动态管理 UI**：Cordis 服务层已就绪，UI 层启停功能待下轮
4. **图级错误策略化**：per-node retry + onError 错误边
