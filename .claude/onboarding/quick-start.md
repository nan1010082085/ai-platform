# 快速入门指南

## 5 分钟快速了解项目

### 1. 项目是什么？

schema-form-ai 是一个 **AI 对话助手**，用于：
- 与用户对话，理解需求
- 自动生成表单 Schema
- 自动生成流程图
- 与 editor/flow 协作

### 2. 核心架构

```
┌─────────────────────────────────────────────────────────┐
│                    AI 对话界面                           │
│  ┌─────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 对话列表 │  │   聊天面板   │  │   预览面板   │         │
│  └─────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    状态管理 (Pinia)                      │
│  ┌─────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 对话管理 │  │   流式连接   │  │  Schema 状态 │         │
│  └─────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    通信层                                │
│  ┌─────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │WebSocket │  │     SSE     │  │ postMessage │         │
│  └─────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### 3. 双入口设计

**主入口** (独立运行)
- 完整的三栏布局
- 支持所有功能
- 可独立访问

**Sidebar 入口** (嵌入运行)
- 轻量级单栏布局
- 嵌入到 editor/flow
- 通过 iframe 通信

### 4. 核心文件

| 文件 | 作用 |
|------|------|
| `app/src/main.ts` | 主入口 |
| `app/src/main-sidebar.ts` | Sidebar 入口 |
| `app/src/stores/ai.ts` | 主 Store |
| `app/src/views/AiChatView.vue` | 主对话页面 |
| `app/src/utils/bridge.ts` | 通信桥 |

### 5. 核心功能

**多轮对话**
- 消息历史管理
- 上下文维护
- 对话持久化

**流式响应**
- SSE 实时推送
- 增量更新
- 错误重试

**意图识别**
- 分析用户需求
- 提取关键信息
- 评估置信度

**RAG 集成**
- 知识库检索
- 上下文增强
- 结果排序

**Tool Call**
- 工具注册
- 调用执行
- 结果处理

## 10 分钟快速上手

### 1. 启动项目

```bash
# 进入项目目录
cd schema-form-ai/app

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:5300

### 2. 查看核心代码

```bash
# 查看主 Store
cat app/src/stores/ai.ts

# 查看主对话页面
cat app/src/views/AiChatView.vue

# 查看通信桥
cat app/src/utils/bridge.ts
```

### 3. 运行测试

```bash
# 运行所有测试
cd app && pnpm test

# 运行特定测试
cd app && pnpm test -- --grep "test name"
```

### 4. 构建项目

```bash
# 构建
cd app && pnpm build

# 类型检查
cd app && npx vue-tsc --noEmit
```

## 30 分钟深入理解

### 1. 状态管理

```typescript
// 主 Store 协调所有子 Store
export const useAiStore = defineStore('ai', () => {
  const conversationStore = useConversationStore()
  const streamStore = useStreamStore()
  const schemaStore = useSchemaStore()
  // ...
})
```

### 2. 流式响应

```typescript
// SSE 连接管理
const eventSource = new EventSource(url)
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // 处理增量更新
}
```

### 3. 通信机制

```typescript
// postMessage 通信
window.parent.postMessage({
  type: 'ai:ready',
  payload: {}
}, '*')

// 监听消息
window.addEventListener('message', (event) => {
  if (event.data.type === 'ai:set-context') {
    // 处理上下文
  }
})
```

### 4. 组件结构

```vue
<script setup lang="ts">
// Props
interface Props {
  messages: AIMessage[]
  loading: boolean
}
const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  send: [message: string]
  stop: []
}>()
</script>

<template>
  <div>
    <!-- 组件内容 -->
  </div>
</template>
```

## 常见任务

### 1. 添加新组件

```bash
# 创建组件文件
touch app/src/components/MyComponent.vue

# 编写组件代码
# 参考现有组件结构

# 在需要的地方引入
import MyComponent from '@/components/MyComponent.vue'
```

### 2. 添加新 Store

```bash
# 创建 Store 文件
touch app/src/stores/myStore.ts

# 编写 Store 代码
# 参考现有 Store 结构

# 在需要的地方引入
import { useMyStore } from '@/stores/myStore'
```

### 3. 添加新 API

```bash
# 创建 API 文件
touch app/src/api/myApi.ts

# 编写 API 代码
# 参考现有 API 结构

# 在需要的地方引入
import { myApi } from '@/api/myApi'
```

### 4. 添加新类型

```bash
# 在 types/index.ts 中添加类型
export interface MyType {
  // 类型定义
}
```

## 调试技巧

### 1. 使用 Vue DevTools

- 安装 Vue DevTools 浏览器扩展
- 查看组件树
- 查看 Pinia 状态
- 查看事件

### 2. 使用 Console

```typescript
// 开发环境日志
if (import.meta.env.DEV) {
  console.log('[AI Dev]', data)
}

// 错误日志
console.error('[AI Error]', error)
```

### 3. 使用 Network

- 查看 API 请求
- 查看 WebSocket 连接
- 查看 SSE 连接
- 分析性能

### 4. 使用断点

```typescript
// 设置断点
debugger

// 条件断点
if (condition) {
  debugger
}
```

## 学习资源

### 1. 项目文档

- `CLAUDE.md` - 项目规则
- `README.md` - 项目说明
- `docs/` - 设计文档

### 2. 官方文档

- [Vue 3](https://vuejs.org/)
- [Pinia](https://pinia.vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Vitest](https://vitest.dev/)

### 3. 代码示例

- `sdk/src/examples/` - SDK 示例
- `app/src/components/` - 组件示例
- `app/src/stores/` - Store 示例

## 下一步

完成快速入门后，可以：

1. **深入学习** - 阅读核心代码
2. **动手实践** - 修复简单 Bug
3. **参与贡献** - 实现小功能
4. **持续提升** - 学习新技术

## 常见问题

### Q: 启动失败怎么办？
A: 检查 Node.js 版本，运行 `pnpm install` 安装依赖

### Q: 类型错误怎么办？
A: 运行 `npx vue-tsc --noEmit` 检查类型错误

### Q: 测试失败怎么办？
A: 查看测试日志，检查测试环境

### Q: 如何调试？
A: 使用 Vue DevTools 和 Console 日志
