# 学习执行脚本

## 执行说明

按照以下脚本逐步执行学习任务。每个任务完成后，在 `[ ]` 中打勾 `[x]`。

## 阶段一：项目概述

### 任务 1.1：阅读项目文档

```bash
# 1. 阅读 CLAUDE.md
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/CLAUDE.md

# 2. 阅读 app README
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/README.md

# 3. 阅读 sdk README
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/sdk/README.md

# 4. 阅读 shared README (如果存在)
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/shared/README.md 2>/dev/null || echo "No README"
```

**学习笔记：**
```
在此记录你对项目文档的理解：
- 项目定位：
- 技术栈：
- 核心功能：
- 开发规则：
```

### 任务 1.2：了解项目结构

```bash
# 1. 查看根目录结构
ls -la /Users/yangdongnan/work/schema-platform/schema-form-ai/

# 2. 查看 app 目录结构
ls -la /Users/yangdongnan/work/schema-platform/schema-form-ai/app/

# 3. 查看 sdk 目录结构
ls -la /Users/yangdongnan/work/schema-platform/schema-form-ai/sdk/

# 4. 查看 shared 目录结构
ls -la /Users/yangdongnan/work/schema-platform/schema-form-ai/shared/

# 5. 查看 docs 目录结构
ls -la /Users/yangdongnan/work/schema-platform/schema-form-ai/docs/
```

**学习笔记：**
```
在此记录你对项目结构的理解：
- 子包结构：
- 目录组织：
- 文件命名：
```

### 任务 1.3：掌握技术栈

```bash
# 1. 查看 package.json 了解依赖
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/package.json

# 2. 查看 sdk package.json
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/sdk/package.json

# 3. 查看 shared package.json
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/shared/package.json
```

**学习笔记：**
```
在此记录你对技术栈的理解：
- Vue 3 特性：
- Pinia 优势：
- Vite 配置：
- 测试框架：
```

## 阶段二：入口和路由

### 任务 2.1：主入口

```bash
# 1. 阅读主入口
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/main.ts

# 2. 理解 qiankun 集成
grep -n "qiankun" /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/main.ts

# 3. 理解独立模式
grep -n "__POWERED_BY_QIANKUN__" /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/main.ts
```

**学习笔记：**
```
在此记录你对主入口的理解：
- qiankun 生命周期：
- 独立模式启动：
- Token 处理：
```

### 任务 2.2：Sidebar 入口

```bash
# 1. 阅读 Sidebar 入口
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/main-sidebar.ts

# 2. 理解 iframe 嵌入
grep -n "postMessage" /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/main-sidebar.ts
```

**学习笔记：**
```
在此记录你对 Sidebar 入口的理解：
- 独立入口设计：
- postMessage 通信：
- 生命周期：
```

### 任务 2.3：路由配置

```bash
# 1. 阅读路由配置
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/router.ts

# 2. 理解路由守卫
grep -n "beforeEach" /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/router.ts

# 3. 理解 SSO 认证
grep -n "SSO" /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/router.ts
```

**学习笔记：**
```
在此记录你对路由配置的理解：
- 路由结构：
- 路由守卫：
- SSO 认证：
```

### 任务 2.4：根组件

```bash
# 1. 阅读根组件
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/App.vue
```

**学习笔记：**
```
在此记录你对根组件的理解：
- 布局结构：
- 配置提供：
- 路由视图：
```

## 阶段三：状态管理

### 任务 3.1：主 Store

```bash
# 1. 阅读主 Store
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/stores/ai.ts

# 2. 理解 Store 组合
grep -n "use.*Store" /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/stores/ai.ts
```

**学习笔记：**
```
在此记录你对主 Store 的理解：
- Store 组合模式：
- 状态代理：
- Actions 组织：
```

### 任务 3.2：对话管理

```bash
# 1. 阅读对话管理 Store
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/stores/conversation.ts
```

**学习笔记：**
```
在此记录你对对话管理的理解：
- 消息模型：
- 对话持久化：
- 历史管理：
```

### 任务 3.3：流式连接

```bash
# 1. 阅读流式连接 Store
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/stores/stream.ts
```

**学习笔记：**
```
在此记录你对流式连接的理解：
- SSE 连接管理：
- 错误处理：
- 重试机制：
```

### 任务 3.4：Schema 状态

```bash
# 1. 阅读 Schema 状态 Store
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/stores/schema.ts
```

**学习笔记：**
```
在此记录你对 Schema 状态的理解：
- Schema 版本管理：
- Diff 机制：
- Undo 功能：
```

### 任务 3.5：其他 Store

```bash
# 1. 阅读 LLM Store
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/stores/llm.ts

# 2. 阅读 RAG Store
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/stores/rag.ts

# 3. 阅读聊天设置 Store
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/stores/chatSettings.ts

# 4. 阅读 HITL Store
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/stores/hitl.ts
```

**学习笔记：**
```
在此记录你对其他 Store 的理解：
- LLM 管理：
- RAG 搜索：
- 聊天设置：
- HITL 中断：
```

## 阶段四：核心组件

### 任务 4.1：页面组件

```bash
# 1. 阅读主对话页面
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/views/AiChatView.vue

# 2. 阅读侧边栏模式
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/views/AiSidebarView.vue

# 3. 阅读 RAG 知识库
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/views/RagKnowledgeBase.vue

# 4. 阅读监控页面
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/views/AiMonitorView.vue
```

**学习笔记：**
```
在此记录你对页面组件的理解：
- 主对话页面布局：
- 侧边栏模式：
- RAG 知识库：
- 监控页面：
```

### 任务 4.2：聊天组件

```bash
# 1. 阅读聊天面板
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/components/AiChatPanel.vue

# 2. 阅读消息组件
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/components/AiMessage.vue

# 3. 阅读输入组件
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/components/AiChatInput.vue

# 4. 阅读任务链
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/components/AiTaskChain.vue
```

**学习笔记：**
```
在此记录你对聊天组件的理解：
- 聊天面板功能：
- 消息组件设计：
- 输入组件交互：
- 任务链展示：
```

### 任务 4.3：预览组件

```bash
# 1. 阅读预览面板
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/components/AiPreviewPanel.vue

# 2. 阅读 Schema 预览
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/components/AiSchemaPreview.vue

# 3. 阅读 Flow 预览
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/components/AiFlowPreview.vue

# 4. 阅读 Diff 面板
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/components/SchemaDiffPanel.vue
```

**学习笔记：**
```
在此记录你对预览组件的理解：
- 预览面板功能：
- Schema 预览：
- Flow 预览：
- Diff 展示：
```

### 任务 4.4：对话组件

```bash
# 1. 阅读对话列表
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/components/AiConversationList.vue

# 2. 阅读聊天设置
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/components/AiChatSettings.vue

# 3. 阅读模型切换
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/components/AiModelSwitch.vue
```

**学习笔记：**
```
在此记录你对对话组件的理解：
- 对话列表功能：
- 聊天设置：
- 模型切换：
```

## 阶段五：通信机制

### 任务 5.1：Bridge 通信

```bash
# 1. 阅读 Bridge 通信
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/utils/bridge.ts

# 2. 理解事件类型
grep -n "interface.*Event" /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/utils/bridge.ts
```

**学习笔记：**
```
在此记录你对 Bridge 通信的理解：
- postMessage 机制：
- 事件类型定义：
- 双向通信：
```

### 任务 5.2：API 接口

```bash
# 1. 查看 API 目录
ls -la /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/api/

# 2. 阅读 AI API
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/api/aiApi.ts
```

**学习笔记：**
```
在此记录你对 API 接口的理解：
- API 组织：
- 请求格式：
- 响应格式：
- 错误处理：
```

### 任务 5.3：WebSocket 通信

```bash
# 1. 查找 WebSocket 相关代码
grep -r "WebSocket\|ws://" /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/ --include="*.ts" --include="*.vue"

# 2. 查看 socket 相关文件
find /Users/yangdongnan/work/schema-platform/schema-form-ai/ -name "*socket*" -o -name "*ws*"
```

**学习笔记：**
```
在此记录你对 WebSocket 通信的理解：
- 连接管理：
- 消息格式：
- 错误处理：
```

### 任务 5.4：SSE 通信

```bash
# 1. 查找 SSE 相关代码
grep -r "EventSource\|text/event-stream" /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/ --include="*.ts" --include="*.vue"
```

**学习笔记：**
```
在此记录你对 SSE 通信的理解：
- SSE 连接：
- 流式响应：
- 事件处理：
```

## 阶段六：类型定义

### 任务 6.1：应用类型

```bash
# 1. 阅读应用类型
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/types/index.ts

# 2. 查找其他类型文件
find /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/types/ -name "*.ts"
```

**学习笔记：**
```
在此记录你对应用类型的理解：
- AIMessage 类型：
- Widget 类型：
- FlowGraph 类型：
- ChatContext 类型：
```

### 任务 6.2：SDK 类型

```bash
# 1. 阅读 SDK 类型
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/sdk/src/types.ts
```

**学习笔记：**
```
在此记录你对 SDK 类型的理解：
- AgentConfig 类型：
- ToolDefinition 类型：
- AgentResult 类型：
- StreamEvent 类型：
```

### 任务 6.3：Shared 类型

```bash
# 1. 阅读 Shared 类型
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/shared/types.ts
```

**学习笔记：**
```
在此记录你对 Shared 类型的理解：
- WidgetAIMetadata 类型：
- FlowNodeAIMetadata 类型：
- AIMetadata 类型：
```

## 阶段七：SDK 模块

### 任务 7.1：Agent 基类

```bash
# 1. 阅读 Agent 基类
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/sdk/src/agent.ts
```

**学习笔记：**
```
在此记录你对 Agent 基类的理解：
- LLM 调用：
- 工具执行：
- 流式响应：
- 消息管理：
```

### 任务 7.2：工具系统

```bash
# 1. 阅读工具系统
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/sdk/src/tool.ts
```

**学习笔记：**
```
在此记录你对工具系统的理解：
- 工具注册：
- 工具执行：
- 工具构建器：
```

### 任务 7.3：Prompt 构建器

```bash
# 1. 阅读 Prompt 构建器
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/sdk/src/promptBuilder.ts
```

**学习笔记：**
```
在此记录你对 Prompt 构建器的理解：
- 区段组织：
- Prompt 构建：
- 使用方式：
```

### 任务 7.4：示例代码

```bash
# 1. 阅读 Schema Agent 示例
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/sdk/src/examples/schemaAgent.ts
```

**学习笔记：**
```
在此记录你对示例代码的理解：
- Agent 实现模式：
- 工具定义：
- 系统提示：
```

## 阶段八：Shared 模块

### 任务 8.1：Prompt 构建器

```bash
# 1. 阅读 Shared Prompt 构建器
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/shared/promptBuilder.ts
```

**学习笔记：**
```
在此记录你对 Shared Prompt 构建器的理解：
- Schema 上下文构建：
- Flow 上下文构建：
- 系统知识：
```

### 任务 8.2：运行时 Agent

```bash
# 1. 阅读运行时 Agent
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/shared/runtimeAgent.ts
```

**学习笔记：**
```
在此记录你对运行时 Agent 的理解：
- 智能指派：
- 条件评估：
- 异常检测：
- 审批建议：
```

### 任务 8.3：元数据

```bash
# 1. 阅读元数据
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/shared/metadata.json | head -100

# 2. 查看元数据结构
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/shared/metadata.json | jq '.widgets[0]' 2>/dev/null || echo "jq not available"
```

**学习笔记：**
```
在此记录你对元数据的理解：
- Widget 元数据结构：
- Flow 节点元数据：
- 系统类型：
```

### 任务 8.4：事件定义

```bash
# 1. 阅读事件定义
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/shared/events.ts
```

**学习笔记：**
```
在此记录你对事件定义的理解：
- 事件类型：
- 事件载荷：
- 事件处理：
```

## 阶段九：配置文件

### 任务 9.1：构建配置

```bash
# 1. 阅读 Vite 配置
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/vite.config.ts

# 2. 理解双入口配置
grep -n "input" /Users/yangdongnan/work/schema-platform/schema-form-ai/app/vite.config.ts

# 3. 理解代理配置
grep -n "proxy" /Users/yangdongnan/work/schema-platform/schema-form-ai/app/vite.config.ts
```

**学习笔记：**
```
在此记录你对构建配置的理解：
- 双入口配置：
- 代理配置：
- qiankun 插件：
```

### 任务 9.2：TypeScript 配置

```bash
# 1. 阅读 TS 配置
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/tsconfig.json

# 2. 阅读应用配置
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/tsconfig.app.json

# 3. 阅读 Node 配置
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/tsconfig.node.json
```

**学习笔记：**
```
在此记录你对 TypeScript 配置的理解：
- 编译选项：
- 路径别名：
- 类型检查：
```

### 任务 9.3：环境配置

```bash
# 1. 阅读开发环境
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/.env.development

# 2. 阅读生产环境
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/.env.production

# 3. 阅读示例环境
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/.env.example
```

**学习笔记：**
```
在此记录你对环境配置的理解：
- 环境变量：
- API 地址：
- 配置差异：
```

## 阶段十：测试和文档

### 任务 10.1：测试代码

```bash
# 1. 查看测试目录
ls -la /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/__tests__/

# 2. 阅读测试用例
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/app/src/__tests__/*.test.ts | head -100

# 3. 运行测试
cd /Users/yangdongnan/work/schema-platform/schema-form-ai/app && pnpm test --run 2>&1 | head -50
```

**学习笔记：**
```
在此记录你对测试代码的理解：
- 测试框架：
- 测试策略：
- 测试覆盖率：
```

### 任务 10.2：项目文档

```bash
# 1. 查看文档目录
ls -la /Users/yangdongnan/work/schema-platform/schema-form-ai/docs/

# 2. 阅读设计文档
cat /Users/yangdongnan/work/schema-platform/schema-form-ai/docs/*.md | head -200
```

**学习笔记：**
```
在此记录你对项目文档的理解：
- 设计决策：
- 架构演进：
- 最佳实践：
```

## 学习总结

### 完成情况

- [ ] 阶段一：项目概述
- [ ] 阶段二：入口和路由
- [ ] 阶段三：状态管理
- [ ] 阶段四：核心组件
- [ ] 阶段五：通信机制
- [ ] 阶段六：类型定义
- [ ] 阶段七：SDK 模块
- [ ] 阶段八：Shared 模块
- [ ] 阶段九：配置文件
- [ ] 阶段十：测试和文档

### 核心收获

```
在此记录你的核心收获：
1. 
2. 
3. 
```

### 问题和疑问

```
在此记录你的问题和疑问：
1. 
2. 
3. 
```

### 下一步计划

```
在此记录你的下一步计划：
1. 
2. 
3. 
```
