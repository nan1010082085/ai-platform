# 专家 Agent 完整学习计划

## 学习目标

通过系统学习，全面掌握 schema-form-ai 项目的：
1. 项目架构和设计思想
2. 核心代码和实现细节
3. 开发流程和最佳实践
4. 常见问题和解决方案

## 学习阶段

### 阶段一：项目概述 (1小时)

#### 1.1 阅读项目文档
- [ ] 阅读 `CLAUDE.md` - 项目规则
- [ ] 阅读 `app/README.md` - 应用说明
- [ ] 阅读 `sdk/README.md` - SDK 说明
- [ ] 阅读 `shared/README.md` - 共享模块说明

#### 1.2 了解项目结构
- [ ] 查看根目录结构
- [ ] 查看 app/ 目录结构
- [ ] 查看 sdk/ 目录结构
- [ ] 查看 shared/ 目录结构
- [ ] 查看 docs/ 目录结构

#### 1.3 掌握技术栈
- [ ] 了解 Vue 3 + TypeScript
- [ ] 了解 Pinia 状态管理
- [ ] 了解 Vite 构建工具
- [ ] 了解 Vitest 测试框架

### 阶段二：入口和路由 (1小时)

#### 2.1 主入口
- [ ] 阅读 `app/src/main.ts` - 主入口
- [ ] 理解 qiankun 微前端集成
- [ ] 理解独立模式启动

#### 2.2 Sidebar 入口
- [ ] 阅读 `app/src/main-sidebar.ts` - Sidebar 入口
- [ ] 理解 iframe 嵌入方式
- [ ] 理解 postMessage 通信

#### 2.3 路由配置
- [ ] 阅读 `app/src/router.ts` - 路由配置
- [ ] 理解路由守卫
- [ ] 理解 SSO 认证

#### 2.4 根组件
- [ ] 阅读 `app/src/App.vue` - 根组件
- [ ] 理解布局结构
- [ ] 理解配置提供

### 阶段三：状态管理 (2小时)

#### 3.1 主 Store
- [ ] 阅读 `app/src/stores/ai.ts` - 主 Store
- [ ] 理解 Store 组合模式
- [ ] 理解状态代理

#### 3.2 对话管理
- [ ] 阅读 `app/src/stores/conversation.ts` - 对话管理
- [ ] 理解消息模型
- [ ] 理解对话持久化

#### 3.3 流式连接
- [ ] 阅读 `app/src/stores/stream.ts` - 流式连接
- [ ] 理解 SSE 连接管理
- [ ] 理解错误处理和重试

#### 3.4 Schema 状态
- [ ] 阅读 `app/src/stores/schema.ts` - Schema 状态
- [ ] 理解 Schema 版本管理
- [ ] 理解 Diff 和 Undo

#### 3.5 其他 Store
- [ ] 阅读 `app/src/stores/llm.ts` - LLM 管理
- [ ] 阅读 `app/src/stores/rag.ts` - RAG 搜索
- [ ] 阅读 `app/src/stores/chatSettings.ts` - 聊天设置
- [ ] 阅读 `app/src/stores/hitl.ts` - HITL 中断

### 阶段四：核心组件 (3小时)

#### 4.1 页面组件
- [ ] 阅读 `app/src/views/AiChatView.vue` - 主对话页面
- [ ] 阅读 `app/src/views/AiSidebarView.vue` - 侧边栏模式
- [ ] 阅读 `app/src/views/RagKnowledgeBase.vue` - RAG 知识库
- [ ] 阅读 `app/src/views/AiMonitorView.vue` - 监控页面

#### 4.2 聊天组件
- [ ] 阅读 `app/src/components/AiChatPanel.vue` - 聊天面板
- [ ] 阅读 `app/src/components/AiMessage.vue` - 消息组件
- [ ] 阅读 `app/src/components/AiChatInput.vue` - 输入组件
- [ ] 阅读 `app/src/components/AiTaskChain.vue` - 任务链

#### 4.3 预览组件
- [ ] 阅读 `app/src/components/AiPreviewPanel.vue` - 预览面板
- [ ] 阅读 `app/src/components/AiSchemaPreview.vue` - Schema 预览
- [ ] 阅读 `app/src/components/AiFlowPreview.vue` - Flow 预览
- [ ] 阅读 `app/src/components/SchemaDiffPanel.vue` - Diff 面板

#### 4.4 对话组件
- [ ] 阅读 `app/src/components/AiConversationList.vue` - 对话列表
- [ ] 阅读 `app/src/components/AiChatSettings.vue` - 聊天设置
- [ ] 阅读 `app/src/components/AiModelSwitch.vue` - 模型切换

### 阶段五：通信机制 (1.5小时)

#### 5.1 Bridge 通信
- [ ] 阅读 `app/src/utils/bridge.ts` - postMessage 通信
- [ ] 理解事件类型定义
- [ ] 理解双向通信机制

#### 5.2 API 接口
- [ ] 查看 `app/src/api/` 目录
- [ ] 阅读 `app/src/api/aiApi.ts` - AI API
- [ ] 理解请求和响应格式
- [ ] 理解错误处理

#### 5.3 WebSocket 通信
- [ ] 查找 WebSocket 相关代码
- [ ] 理解连接管理
- [ ] 理解消息格式

#### 5.4 SSE 通信
- [ ] 查找 SSE 相关代码
- [ ] 理解流式响应处理
- [ ] 理解事件类型

### 阶段六：类型定义 (1小时)

#### 6.1 应用类型
- [ ] 阅读 `app/src/types/index.ts` - 类型定义
- [ ] 理解 AIMessage 类型
- [ ] 理解 Widget 类型
- [ ] 理解 FlowGraph 类型

#### 6.2 SDK 类型
- [ ] 阅读 `sdk/src/types.ts` - SDK 类型
- [ ] 理解 AgentConfig 类型
- [ ] 理解 ToolDefinition 类型
- [ ] 理解 AgentResult 类型

#### 6.3 Shared 类型
- [ ] 阅读 `shared/types.ts` - Shared 类型
- [ ] 理解 WidgetAIMetadata 类型
- [ ] 理解 FlowNodeAIMetadata 类型

### 阶段七：SDK 模块 (1.5小时)

#### 7.1 Agent 基类
- [ ] 阅读 `sdk/src/agent.ts` - Agent 基类
- [ ] 理解 LLM 调用
- [ ] 理解工具执行
- [ ] 理解流式响应

#### 7.2 工具系统
- [ ] 阅读 `sdk/src/tool.ts` - 工具系统
- [ ] 理解工具注册
- [ ] 理解工具执行
- [ ] 理解工具构建器

#### 7.3 Prompt 构建器
- [ ] 阅读 `sdk/src/promptBuilder.ts` - Prompt 构建器
- [ ] 理解区段组织
- [ ] 理解 Prompt 构建

#### 7.4 示例代码
- [ ] 阅读 `sdk/src/examples/schemaAgent.ts` - Schema Agent
- [ ] 理解 Agent 实现模式

### 阶段八：Shared 模块 (1小时)

#### 8.1 Prompt 构建器
- [ ] 阅读 `shared/promptBuilder.ts` - Prompt 构建器
- [ ] 理解 Schema 上下文构建
- [ ] 理解 Flow 上下文构建

#### 8.2 运行时 Agent
- [ ] 阅读 `shared/runtimeAgent.ts` - 运行时 Agent
- [ ] 理解智能指派
- [ ] 理解条件评估
- [ ] 理解异常检测

#### 8.3 元数据
- [ ] 阅读 `shared/metadata.json` - 元数据
- [ ] 理解 Widget 元数据
- [ ] 理解 Flow 节点元数据

#### 8.4 事件定义
- [ ] 阅读 `shared/events.ts` - 事件定义
- [ ] 理解事件类型
- [ ] 理解事件载荷

### 阶段九：配置文件 (0.5小时)

#### 9.1 构建配置
- [ ] 阅读 `app/vite.config.ts` - Vite 配置
- [ ] 理解双入口配置
- [ ] 理解代理配置

#### 9.2 TypeScript 配置
- [ ] 阅读 `app/tsconfig.json` - TS 配置
- [ ] 阅读 `app/tsconfig.app.json` - 应用配置
- [ ] 阅读 `app/tsconfig.node.json` - Node 配置

#### 9.3 环境配置
- [ ] 阅读 `app/.env.development` - 开发环境
- [ ] 阅读 `app/.env.production` - 生产环境

### 阶段十：测试和文档 (1小时)

#### 10.1 测试代码
- [ ] 查看 `app/src/__tests__/` 目录
- [ ] 阅读测试用例
- [ ] 理解测试策略

#### 10.2 项目文档
- [ ] 阅读 `docs/` 目录下的文档
- [ ] 理解设计决策
- [ ] 理解架构演进

## 学习方法

### 1. 阅读代码
- 逐行阅读，理解每一行的作用
- 注意注释，理解设计意图
- 记录疑问，稍后解决

### 2. 运行代码
- 启动项目，观察运行效果
- 修改代码，观察变化
- 调试代码，理解执行流程

### 3. 记录笔记
- 记录重要概念
- 记录设计思想
- 记录问题和解决方案

### 4. 总结归纳
- 每个阶段结束后总结
- 整理知识体系
- 形成自己的理解

## 学习检查点

### 阶段一检查点
- [ ] 能够说出项目是什么
- [ ] 能够列出子包结构
- [ ] 能够说出技术栈

### 阶段二检查点
- [ ] 能够解释双入口架构
- [ ] 能够描述路由结构
- [ ] 能够说明认证流程

### 阶段三检查点
- [ ] 能够画出 Store 关系图
- [ ] 能够解释状态流转
- [ ] 能够说明数据持久化

### 阶段四检查点
- [ ] 能够列出核心组件
- [ ] 能够描述组件职责
- [ ] 能够说明组件通信

### 阶段五检查点
- [ ] 能够解释三种通信方式
- [ ] 能够描述消息格式
- [ ] 能够说明错误处理

### 阶段六检查点
- [ ] 能够列出核心类型
- [ ] 能够解释类型关系
- [ ] 能够使用类型定义

### 阶段七检查点
- [ ] 能够解释 Agent 架构
- [ ] 能够描述工具系统
- [ ] 能够说明 Prompt 构建

### 阶段八检查点
- [ ] 能够解释 Shared 模块作用
- [ ] 能够描述运行时 Agent
- [ ] 能够说明元数据结构

### 阶段九检查点
- [ ] 能够解释构建配置
- [ ] 能够描述环境配置
- [ ] 能够说明 TypeScript 配置

### 阶段十检查点
- [ ] 能够运行测试
- [ ] 能够阅读文档
- [ ] 能够总结学习成果

## 学习成果

完成学习后，专家 Agent 应该能够：

1. **独立启动和运行项目**
2. **理解核心代码和架构**
3. **解释设计决策和权衡**
4. **识别改进点和优化空间**
5. **解决常见问题和 Bug**
6. **实现新功能和重构**
7. **编写测试和文档**
8. **指导其他开发者**

## 学习时间

总计约 **12 小时**，可以分散在 3-5 天内完成。

## 下一步

完成学习后，可以：
1. 选择一个简单任务开始贡献
2. 参与代码审查
3. 分享学习心得
4. 指导其他开发者
