# AI 项目开发工具集

## 代码分析工具

### 1. 项目结构分析
```bash
# 查看项目结构
find . -type f -name "*.ts" -o -name "*.vue" | head -50

# 查看依赖关系
cat package.json | jq '.dependencies'

# 查看 store 结构
ls -la app/src/stores/
```

### 2. 代码质量检查
```bash
# TypeScript 类型检查
cd app && npx vue-tsc --noEmit

# ESLint 检查
cd app && npx eslint src/

# 运行测试
cd app && pnpm test
```

### 3. 组件分析
```bash
# 查看组件依赖
grep -r "import.*from.*@/components" app/src/

# 查看 store 使用
grep -r "useAiStore\|useConversationStore" app/src/

# 查看 API 调用
grep -r "import.*from.*@/api" app/src/
```

## 开发工具

### 1. 快速创建组件
```typescript
// 创建 Vue 组件模板
const componentTemplate = `
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

// 状态
// const state = ref()

// 方法
// function handleAction() {}
</script>

<template>
  <div>
    <!-- 组件内容 -->
  </div>
</template>

<style module>
/* 样式 */
</style>
`
```

### 2. 快速创建 Store
```typescript
// 创建 Pinia Store 模板
const storeTemplate = `
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useMyStore = defineStore('my', () => {
  // 状态
  const state = ref()

  // 计算属性
  const getter = computed(() => {
    return state.value
  })

  // Actions
  function action() {
    // 实现
  }

  return {
    state,
    getter,
    action,
  }
})
`
```

### 3. 快速创建 API
```typescript
// 创建 API 模板
const apiTemplate = `
import { request } from './request'

export interface MyApiParams {
  // 参数类型
}

export interface MyApiResult {
  // 返回类型
}

export async function myApi(params: MyApiParams): Promise<MyApiResult> {
  return request('/api/endpoint', {
    method: 'POST',
    data: params,
  })
}
`
```

## 测试工具

### 1. 单元测试模板
```typescript
// Vitest 测试模板
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

describe('Component', () => {
  it('should render correctly', () => {
    const wrapper = mount(Component, {
      props: {
        // props
      },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('should handle events', async () => {
    const wrapper = mount(Component)
    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('event')).toBeTruthy()
  })
})
```

### 2. Store 测试模板
```typescript
// Store 测试模板
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMyStore } from '../stores/my'

describe('MyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should have correct initial state', () => {
    const store = useMyStore()
    expect(store.state).toBeNull()
  })

  it('should handle actions', async () => {
    const store = useMyStore()
    await store.action()
    expect(store.state).toBeDefined()
  })
})
```

## 调试工具

### 1. 日志工具
```typescript
// 开发环境日志
export function devLog(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.log('[AI Dev]', ...args)
  }
}

// 错误日志
export function errorLog(error: Error, context?: string) {
  console.error(`[AI Error]${context ? ` ${context}` : ''}`, error)
}
```

### 2. 性能监控
```typescript
// 性能测量
export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  const start = performance.now()
  const result = fn()

  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start
      console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`)
    })
  }

  const duration = performance.now() - start
  console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`)
  return result
}
```

## 文档工具

### 1. 组件文档模板
```markdown
# ComponentName

## 描述
组件描述

## Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| prop1 | string | '' | 描述 |
| prop2 | number | 0 | 描述 |

## Events
| Event | Payload | Description |
|-------|---------|-------------|
| event1 | string | 描述 |
| event2 | void | 描述 |

## Slots
| Slot | Props | Description |
|------|-------|-------------|
| default | - | 描述 |

## 使用示例
\`\`\`vue
<ComponentName prop1="value" @event1="handler" />
\`\`\`
```

### 2. API 文档模板
```markdown
# API Name

## 描述
API 描述

## 请求
- **URL**: `/api/endpoint`
- **Method**: `POST`
- **Content-Type**: `application/json`

### 参数
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| param1 | string | 是 | 描述 |
| param2 | number | 否 | 描述 |

### 请求示例
\`\`\`json
{
  "param1": "value",
  "param2": 123
}
\`\`\`

## 响应
### 成功响应
\`\`\`json
{
  "code": 0,
  "data": {},
  "message": "success"
}
\`\`\`

### 错误响应
\`\`\`json
{
  "code": -1,
  "message": "error message"
}
\`\`\`
```

## 常用代码片段

### 1. SSE 连接处理
```typescript
// SSE 连接
const eventSource = new EventSource(url)

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // 处理数据
}

eventSource.onerror = (error) => {
  console.error('SSE Error:', error)
  eventSource.close()
}

// 关闭连接
eventSource.close()
```

### 2. WebSocket 连接处理
```typescript
// WebSocket 连接
const ws = new WebSocket(url)

ws.onopen = () => {
  console.log('WebSocket connected')
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // 处理数据
}

ws.onerror = (error) => {
  console.error('WebSocket Error:', error)
}

ws.onclose = () => {
  console.log('WebSocket closed')
}

// 发送消息
ws.send(JSON.stringify({ type: 'message', data: 'hello' }))
```

### 3. postMessage 通信
```typescript
// 发送消息到父窗口
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

## 问题排查

### 1. 常见问题
- **类型错误**: 检查 TypeScript 类型定义
- **状态不更新**: 检查 Pinia store 的响应式
- **组件不渲染**: 检查 props 和 events
- **API 调用失败**: 检查网络请求和错误处理

### 2. 调试技巧
- 使用 Vue DevTools 查看组件状态
- 使用 Network 面板查看 API 请求
- 使用 Console 查看日志和错误
- 使用断点调试复杂逻辑

### 3. 性能优化
- 使用 `computed` 缓存计算结果
- 使用 `watch` 监听状态变化
- 使用 `shallowRef` 优化大对象
- 使用 `v-memo` 优化列表渲染
