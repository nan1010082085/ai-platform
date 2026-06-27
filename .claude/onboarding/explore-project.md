# 项目探索清单

## 探索任务

请按照以下清单系统地探索项目，每个任务完成后打勾：

### 第一阶段：项目结构 [ ]

- [ ] 查看项目根目录结构
- [ ] 查看 app/ 目录结构
- [ ] 查看 sdk/ 目录结构
- [ ] 查看 shared/ 目录结构
- [ ] 查看 docs/ 目录结构

### 第二阶段：入口文件 [ ]

- [ ] 阅读 `app/src/main.ts` 主入口
- [ ] 阅读 `app/src/main-sidebar.ts` Sidebar 入口
- [ ] 阅读 `app/src/App.vue` 根组件
- [ ] 阅读 `app/src/router.ts` 路由配置
- [ ] 理解双入口架构

### 第三阶段：状态管理 [ ]

- [ ] 阅读 `app/src/stores/ai.ts` 主 Store
- [ ] 阅读 `app/src/stores/conversation.ts` 对话管理
- [ ] 阅读 `app/src/stores/stream.ts` 流式连接
- [ ] 阅读 `app/src/stores/schema.ts` Schema 状态
- [ ] 阅读 `app/src/stores/rag.ts` RAG 搜索
- [ ] 理解 Store 之间的关系

### 第四阶段：核心组件 [ ]

- [ ] 阅读 `app/src/views/AiChatView.vue` 主对话页面
- [ ] 阅读 `app/src/views/AiSidebarView.vue` 侧边栏模式
- [ ] 阅读 `app/src/components/AiChatPanel.vue` 聊天面板
- [ ] 阅读 `app/src/components/AiPreviewPanel.vue` 预览面板
- [ ] 阅读 `app/src/components/AiMessage.vue` 消息组件
- [ ] 理解组件之间的数据流

### 第五阶段：通信机制 [ ]

- [ ] 阅读 `app/src/utils/bridge.ts` postMessage 通信
- [ ] 查找 WebSocket 相关代码
- [ ] 查找 SSE 相关代码
- [ ] 理解 AI 与 editor/flow 的通信方式

### 第六阶段：API 接口 [ ]

- [ ] 查看 `app/src/api/` 目录
- [ ] 阅读 API 接口定义
- [ ] 理解请求和响应格式
- [ ] 了解错误处理机制

### 第七阶段：类型定义 [ ]

- [ ] 查看 `app/src/types/` 目录
- [ ] 阅读核心类型定义
- [ ] 理解 Widget、FlowGraph 等类型
- [ ] 了解类型之间的关系

### 第八阶段：SDK 模块 [ ]

- [ ] 阅读 `sdk/src/agent.ts` Agent 基类
- [ ] 阅读 `sdk/src/tool.ts` 工具系统
- [ ] 阅读 `sdk/src/promptBuilder.ts` Prompt 构建器
- [ ] 阅读 `sdk/src/types.ts` 类型定义
- [ ] 理解 SDK 的设计思路

### 第九阶段：Shared 模块 [ ]

- [ ] 阅读 `shared/promptBuilder.ts` Prompt 构建器
- [ ] 阅读 `shared/runtimeAgent.ts` 运行时 Agent
- [ ] 阅读 `shared/types.ts` 类型定义
- [ ] 阅读 `shared/events.ts` 事件定义
- [ ] 理解 Shared 模块的作用

### 第十阶段：配置文件 [ ]

- [ ] 阅读 `app/vite.config.ts` Vite 配置
- [ ] 阅读 `app/tsconfig.json` TypeScript 配置
- [ ] 阅读 `app/package.json` 依赖配置
- [ ] 阅读 `.env.*` 环境配置
- [ ] 理解构建和部署流程

## 探索笔记

### 项目架构理解

```
在此记录你对项目架构的理解：
- 整体架构
- 模块关系
- 数据流
- 通信方式
```

### 核心功能理解

```
在此记录你对核心功能的理解：
- 多轮对话
- 流式响应
- 意图识别
- RAG 集成
- Tool Call
```

### 技术选型理解

```
在此记录你对技术选型的理解：
- 为什么选择 Vue 3
- 为什么选择 Pinia
- 为什么选择 SSE
- 为什么选择 postMessage
```

### 代码质量评估

```
在此记录你对代码质量的评估：
- 优点
- 改进点
- 技术债务
- 优化建议
```

## 探索问题

在探索过程中，记录你的问题：

### 架构问题
1. ?
2. ?
3. ?

### 实现问题
1. ?
2. ?
3. ?

### 设计问题
1. ?
2. ?
3. ?

## 探索总结

### 掌握程度

- [ ] 能够独立启动项目
- [ ] 能够理解核心代码
- [ ] 能够修改简单功能
- [ ] 能够添加新功能
- [ ] 能够修复 Bug

### 下一步计划

1. ?
2. ?
3. ?

### 学习重点

1. ?
2. ?
3. ?
