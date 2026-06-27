# SSE 到 Stream 重命名变更记录

## 变更时间
2026-06-27

## 变更概述

将代码中的 `SSE*` 命名重命名为 `Stream*`，以准确反映实际使用的 WebSocket (Socket.IO) 通信方式。

## 变更文件

### 1. 类型定义 (`app/src/types/index.ts`)

**变更：**
- 添加 `StreamEvent` 接口（原 `SSEEvent`）
- 保留 `SSEEvent` 作为向后兼容别名（标记为 `@deprecated`）

```typescript
export interface StreamEvent {
  type: StreamEventType
  // ...
}

/** @deprecated 使用 StreamEvent 替代 */
export type SSEEvent = StreamEvent
```

### 2. 流式 Store (`app/src/stores/stream.ts`)

**变更：**
- 导入 `StreamEvent` 替代 `SSEEvent`
- 更新函数参数类型
- 更新类型断言

### 3. AI Store (`app/src/stores/ai.ts`)

**变更：**
- 导入 `StreamEvent` 替代 `SSEEvent`
- 更新 `handleStreamEvent` 函数参数类型
- 添加 `streamStatus` 计算属性
- 保留 `sseStatus` 作为向后兼容别名

### 4. API 客户端 (`app/src/api/aiApi.ts`)

**变更：**
- 导入 `StreamEvent` 替代 `SSEEvent`
- 更新 `chat` 和 `resumeInterrupt` 函数返回类型
- 更新注释中的 SSE 引用

### 5. 聊天面板组件 (`app/src/components/AiChatPanel.vue`)

**变更：**
- 导入 `StreamConnectionStatus` 替代 `SSEConnectionStatus`
- 添加 `streamStatus` prop
- 保留 `sseStatus` prop 作为向后兼容
- 添加计算属性 `currentStreamStatus` 处理向后兼容
- 更新模板中的状态引用

### 6. 聊天视图 (`app/src/views/AiChatView.vue`)

**变更：**
- 从 store 解构 `streamStatus` 替代 `sseStatus`
- 更新 prop 传递

### 7. 测试文件

**变更：**
- `aiApi.spec.ts`:
  - 导入 `StreamEvent` 替代 `SSEEvent`
  - 重命名 `mockSSEResponse` 为 `mockStreamResponse`
  - 重命名 `mockSSERawChunks` 为 `mockStreamRawChunks`
  - 更新测试描述

- `aiStore.spec.ts` 和 `multiTurnIteration.spec.ts`:
  - 更新注释中的 SSE 引用

## 向后兼容性

所有变更都保持向后兼容：

1. **类型别名：** `SSEEvent` 和 `SSEConnectionStatus` 保留为 `@deprecated` 别名
2. **Store 别名：** `useSSEStore` 保留为 `useStreamStore` 的别名
3. **Prop 别名：** `sseStatus` prop 保留，通过计算属性处理优先级

## 验证

- ✅ TypeScript 编译通过
- ✅ 所有类型定义正确
- ✅ 向后兼容性保持
- ✅ 注释更新完成

## 后续建议

1. 在后续版本中移除 `@deprecated` 别名
2. 更新其他子项目（editor、flow）中的相关引用
3. 更新 API 文档
