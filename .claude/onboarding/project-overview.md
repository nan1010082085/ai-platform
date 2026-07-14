# 项目熟悉指南

## 第一步：了解项目整体架构

### 1.1 项目定位
ai 是 Schema Platform 的 AI 助手模块，负责：
- 智能对话界面
- 表单/流程生成
- 与 editor/flow 协作

### 1.2 技术栈
- **前端框架**: Vue 3 + TypeScript
- **状态管理**: Pinia
- **构建工具**: Vite
- **测试框架**: Vitest
- **通信方式**: WebSocket + SSE + postMessage

### 1.3 子包结构
```
ai/
├── app/        # 前端应用 (@ai-app)
└── shared/     # 共享逻辑 (@schema-platform/ai-shared)
```

## 第二步：熟悉核心代码

### 2.1 入口文件
- `app/src/main.ts` - 主入口（独立模式 + qiankun）
- `app/src/main-sidebar.ts` - Sidebar 入口（iframe 嵌入）

### 2.2 路由配置
- `app/src/router.ts` - 路由定义
  - `/` - 主对话页面
  - `/sidebar` - 侧边栏模式
  - `/rag` - RAG 知识库
  - `/monitor` - 监控页面

### 2.3 状态管理 (Stores)
- `app/src/stores/ai.ts` - 主 Store（协调所有子 Store）
- `app/src/stores/conversation.ts` - 对话管理
- `app/src/stores/stream.ts` - SSE 流式连接
- `app/src/stores/schema.ts` - Schema/Flow 状态
- `app/src/stores/llm.ts` - LLM Provider 管理
- `app/src/stores/rag.ts` - RAG 搜索
- `app/src/stores/chatSettings.ts` - 聊天设置
- `app/src/stores/hitl.ts` - Human-in-the-loop

### 2.4 核心组件
- `app/src/views/AiChatView.vue` - 主对话页面（三栏布局）
- `app/src/views/AiSidebarView.vue` - 侧边栏模式
- `app/src/components/AiChatPanel.vue` - 聊天面板
- `app/src/components/AiPreviewPanel.vue` - 预览面板
- `app/src/components/AiConversationList.vue` - 对话列表

### 2.5 通信机制
- `app/src/utils/bridge.ts` - postMessage 通信桥

## 第三步：理解核心功能

### 3.1 多轮对话
- 消息历史管理
- 上下文维护
- 对话状态持久化

### 3.2 流式响应
- SSE 连接管理
- 增量更新
- 错误处理和重试

### 3.3 意图识别
- 用户意图分析
- 实体提取
- 置信度评估

### 3.4 RAG 集成
- 知识库检索
- 上下文增强
- 结果排序

### 3.5 Tool Call
- 工具注册与管理
- 工具调用执行
- 结果处理

### 3.6 Schema/Flow 生成
- 表单 Schema 生成
- 流程图生成
- 增量更新和 Diff

## 第四步：熟悉开发流程

### 4.1 开发命令
```bash
# 启动开发服务器
cd app && pnpm dev

# 运行测试
cd app && pnpm test

# 构建
cd app && pnpm build

# 类型检查
cd app && npx vue-tsc --noEmit
```

### 4.2 代码规范
- TypeScript 类型完整
- ESLint 规则遵循
- 组件单一职责
- Store 模块化

### 4.3 测试策略
- 单元测试覆盖核心逻辑
- 集成测试覆盖关键流程
- Vitest 作为测试框架

## 第五步：了解项目依赖

### 5.1 核心依赖
- `vue` - 前端框架
- `pinia` - 状态管理
- `vue-router` - 路由管理
- `element-plus` - UI 组件库
- `openai` - OpenAI SDK

### 5.2 内部依赖
- `@schema-platform/platform-shared` - 平台公共组件
- `@schema-platform/flow-shared` - 流程共享逻辑

### 5.3 开发依赖
- `typescript` - 类型系统
- `vite` - 构建工具
- `vitest` - 测试框架
- `vue-tsc` - Vue 类型检查

## 第六步：熟悉项目配置

### 6.1 Vite 配置
- `app/vite.config.ts` - 构建配置
  - 双入口配置
  - 代理配置
  - qiankun 插件

### 6.2 TypeScript 配置
- `app/tsconfig.json` - TS 配置
- `app/tsconfig.app.json` - 应用配置
- `app/tsconfig.node.json` - Node 配置

### 6.3 环境配置
- `app/.env.development` - 开发环境
- `app/.env.production` - 生产环境

## 第七步：了解项目特点

### 7.1 双入口架构
- **主入口**: 独立运行 + qiankun 微前端
- **Sidebar 入口**: iframe 嵌入到 editor/flow

### 7.2 通信机制
- **Bridge**: postMessage 通信（AI ↔ editor/flow）
- **WebSocket**: 实时双向通信
- **SSE**: 流式响应

### 7.3 状态管理
- **主 Store**: 协调所有子 Store
- **子 Store**: 各功能模块独立管理
- **响应式**: Vue 3 Composition API

### 7.4 组件设计
- **单一职责**: 每个组件只做一件事
- **Props 向下**: 数据通过 props 传递
- **Events 向上**: 事件通过 emit 传递

## 第八步：熟悉常见任务

### 8.1 新增功能
1. 分析需求
2. 设计方案
3. 实现代码
4. 编写测试
5. 代码审查

### 8.2 Bug 修复
1. 复现问题
2. 定位原因
3. 实现修复
4. 编写测试
5. 验证修复

### 8.3 代码重构
1. 分析现状
2. 设计目标
3. 渐进重构
4. 测试验证
5. 文档更新

## 第九步：了解项目历史

### 9.1 版本演进
- v1.0: 基础对话功能
- v2.0: 意图识别、RAG 集成
- v2.1: Tool Call 支持
- v2.2: 多轮对话优化

### 9.2 技术决策
- 选择 Vue 3 + TypeScript
- 选择 Pinia 状态管理
- 选择 SSE 流式响应
- 选择 postMessage 通信

### 9.3 已知问题
- 性能优化空间
- 测试覆盖率待提升
- 文档待完善

## 第十步：开始贡献

### 10.1 选择任务
- 查看 Issue 列表
- 选择合适难度
- 了解任务背景

### 10.2 开发流程
1. Fork 项目
2. 创建功能分支
3. 实现功能
4. 编写测试
5. 提交 PR

### 10.3 代码审查
- 自我审查
- 同事审查
- 修复反馈
- 合并代码

## 学习资源

### 1. 官方文档
- [Vue 3 文档](https://vuejs.org/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Vite 文档](https://vitejs.dev/)
- [Vitest 文档](https://vitest.dev/)

### 2. 项目文档
- `CLAUDE.md` - 项目规则
- `README.md` - 项目说明
- `docs/` - 设计文档

### 3. 代码示例
- `app/src/components/` - 组件示例
- `app/src/stores/` - Store 示例

## 常见问题

### Q1: 如何启动项目？
A: `cd app && pnpm dev`

### Q2: 如何运行测试？
A: `cd app && pnpm test`

### Q3: 如何添加新组件？
A: 参考现有组件结构，在 `app/src/components/` 下创建

### Q4: 如何添加新 Store？
A: 参考现有 Store 结构，在 `app/src/stores/` 下创建

### Q5: 如何添加新 API？
A: 参考现有 API 结构，在 `app/src/api/` 下创建

## 下一步

完成项目熟悉后，可以：
1. 尝试运行项目
2. 阅读核心代码
3. 修复简单 Bug
4. 实现小功能
5. 参与代码审查
