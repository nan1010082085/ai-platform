# AI 项目开发专家 - 快速参考

## 项目结构

```
schema-form-ai/
├── app/                    # 前端应用 (Vue 3 + TypeScript)
│   ├── src/
│   │   ├── api/           # API 接口
│   │   ├── components/    # Vue 组件
│   │   ├── composables/   # 组合式 API
│   │   ├── stores/        # Pinia stores
│   │   ├── views/         # 页面视图
│   │   └── utils/         # 工具函数
│   └── ...
├── sdk/                    # Agent SDK
├── shared/                 # 共享逻辑
└── docs/                   # 文档
```

## 核心文件

### Stores
- `app/src/stores/ai.ts` - 主 Store（协调所有子 Store）
- `app/src/stores/conversation.ts` - 对话管理
- `app/src/stores/stream.ts` - SSE 流式连接
- `app/src/stores/schema.ts` - Schema/Flow 状态

### Views
- `app/src/views/AiChatView.vue` - 主对话页面（三栏布局）
- `app/src/views/AiSidebarView.vue` - 侧边栏模式（iframe 嵌入）

### Utils
- `app/src/utils/bridge.ts` - postMessage 通信桥

## 常用命令

```bash
# 开发
cd app && pnpm dev              # 启动开发服务器 (端口 5300)
cd app && pnpm build            # 构建
cd app && pnpm test             # 运行测试

# SDK
cd sdk && pnpm build            # 编译 SDK
cd sdk && pnpm test             # 运行 SDK 测试

# Shared
cd shared && pnpm build         # 编译 Shared
```

## 通信机制

### Bridge 事件 (postMessage)

**AI → 宿主:**
- `ai:preview-schema` - 请求预览 Schema
- `ai:preview-flow` - 请求预览 Flow
- `ai:published` - 通知发布完成
- `ai:open-in-editor` - 请求在编辑器中打开

**宿主 → AI:**
- `ai:set-context` - 设置上下文
- `ai:current-schema` - 传入当前 Schema
- `ai:current-flow` - 传入当前 Flow

### WebSocket
- 连接: `ws://localhost:3001`
- 事件: `chat:send`, `ai:apply`, `ai:published`

## 状态管理

### AI Store 主要状态
```typescript
// 消息
messages: AIMessage[]
loading: boolean
currentSchema: Widget[] | null
currentFlow: FlowGraph | null
activeAgent: AgentType

// 对话
conversations: Conversation[]
currentConversationId: string | null

// 流式
sseStatus: SSEStatus
retryCount: number

// RAG
ragSearchResults: RagSearchResult[]
ragContext: RagSearchResult[]
```

### Agent 类型
```typescript
type AgentType = 'auto' | 'editor' | 'flow'
```

## 类型定义

### 核心类型 (app/src/types/)
- `AIMessage` - AI 消息
- `Widget` - 表单组件
- `FlowGraph` - 流程图
- `ChatContext` - 聊天上下文
- `MentionReference` - @引用

### SDK 类型 (sdk/src/types.ts)
- `AgentConfig` - Agent 配置
- `ToolDefinition` - 工具定义
- `Message` - 消息
- `AgentResult` - Agent 结果
- `StreamEvent` - 流式事件

## 开发模式

### 1. 新增组件
```vue
<script setup lang="ts">
// Props
interface Props {
  // 定义 props
}
const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  // 定义 events
}>()
</script>

<template>
  <div>
    <!-- 内容 -->
  </div>
</template>

<style module>
/* 样式 */
</style>
```

### 2. 新增 Store
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useMyStore = defineStore('my', () => {
  const state = ref()
  const getter = computed(() => state.value)
  
  function action() {
    // 实现
  }

  return { state, getter, action }
})
```

### 3. 新增 API
```typescript
import { request } from './request'

export async function myApi(params: MyParams): Promise<MyResult> {
  return request('/api/endpoint', {
    method: 'POST',
    data: params,
  })
}
```

## 测试模式

### 单元测试
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

describe('Component', () => {
  it('should render', () => {
    const wrapper = mount(Component)
    expect(wrapper.exists()).toBe(true)
  })
})
```

### Store 测试
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

describe('Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should work', () => {
    const store = useMyStore()
    expect(store.state).toBeDefined()
  })
})
```

## 常见问题

### 1. 类型错误
- 检查 TypeScript 类型定义
- 确保 import 路径正确
- 使用 `vue-tsc --noEmit` 检查

### 2. 状态不更新
- 检查 Pinia store 的响应式
- 确保使用 `ref()` 或 `reactive()`
- 检查 computed 依赖

### 3. 组件不渲染
- 检查 props 传递
- 检查 events 监听
- 使用 Vue DevTools 调试

### 4. API 调用失败
- 检查网络请求
- 检查错误处理
- 查看 Console 日志

## 性能优化

### 1. 组件优化
- 使用 `computed` 缓存计算
- 使用 `watch` 监听变化
- 使用 `shallowRef` 优化大对象

### 2. 列表优化
- 使用 `v-memo` 优化渲染
- 使用虚拟滚动
- 分页加载

### 3. 状态优化
- 合理拆分 store
- 避免深层嵌套
- 使用 `storeToRefs` 解构

## 代码规范

### 1. 命名规范
- 组件: PascalCase (`AiChatPanel`)
- Store: camelCase (`useAiStore`)
- API: camelCase (`sendMessage`)
- 类型: PascalCase (`AIMessage`)

### 2. 文件组织
- 组件: `components/AiChatPanel.vue`
- Store: `stores/ai.ts`
- API: `api/aiApi.ts`
- 类型: `types/index.ts`

### 3. 注释规范
- 组件: 顶部注释说明用途
- 函数: JSDoc 注释
- 复杂逻辑: 行内注释

## 工具推荐

### 开发工具
- VS Code + Volar
- Vue DevTools
- TypeScript Vue Plugin

### 调试工具
- Console 日志
- Network 面板
- Performance 面板

### 测试工具
- Vitest
- Vue Test Utils
- Playwright (E2E)
