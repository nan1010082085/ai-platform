# @ai-sdk

独立可复用的 Agent SDK，与 LangGraph 解耦，可独立使用。

## 特性

- **BaseAgent 基类**：LLM 调用、工具执行、流式响应、消息历史管理
- **ExpertAgent 框架**：专家级 Agent，支持意图识别、RAG、多轮对话
- **ToolRegistry**：工具注册与管理，支持 OpenAI 格式转换
- **PromptBuilder**：结构化 prompt 构建
- **AgentValidator**：Agent 测试和验证框架
- **多 LLM 支持**：DeepSeek / OpenAI / 自定义提供商
- **流式响应**：支持 SSE 流式输出
- **TypeScript**：完整的类型支持

## 安装

```bash
pnpm add @ai-sdk
```

## 快速开始

### 1. 创建自定义 Agent

```typescript
import { BaseAgent, buildTool, PromptBuilder } from '@ai-sdk'

// 定义工具
const searchTool = buildTool()
  .name('search')
  .description('搜索数据')
  .parameters(b =>
    b.string('query', '搜索关键词', { required: true })
      .number('limit', '返回数量', { default: 10 })
  )
  .execute(async (params) => {
    // 实现搜索逻辑
    return { results: [] }
  })
  .build()

// 创建 Agent
class MyAgent extends BaseAgent {
  constructor() {
    const systemPrompt = new PromptBuilder()
      .role('你是一个数据查询专家')
      .rules([
        '返回结构化 JSON 数据',
        '限制单次查询数量',
      ])
      .tools([searchTool])
      .build()

    super({
      name: 'MyAgent',
      description: '数据查询 Agent',
      systemPrompt,
      llm: {
        provider: 'deepseek',
        model: 'deepseek-v4-pro',
      },
      tools: [searchTool],
    })
  }
}
```

### 2. 执行 Agent

```typescript
const agent = new MyAgent()

// 非流式执行
const result = await agent.execute('帮我搜索用户数据', {
  conversationId: 'conv-123',
  userId: 'user-456',
  variables: {},
})

console.log(result.content)       // Agent 响应
console.log(result.toolCalls)     // 工具调用记录
console.log(result.usage)         // Token 使用统计

// 流式执行
for await (const event of agent.executeStream('搜索订单', context)) {
  switch (event.type) {
    case 'text_delta':
      process.stdout.write(event.delta!)
      break
    case 'tool_call_start':
      console.log(`\n[调用工具] ${event.toolCall!.name}`)
      break
    case 'tool_call_end':
      console.log(`[工具结果]`, event.toolCall!.result)
      break
    case 'done':
      console.log('\n[完成]', event.result!.usage)
      break
  }
}
```

### 3. 使用 SchemaAgent 示例

```typescript
import { SchemaAgent } from '@ai-sdk'

const agent = new SchemaAgent({
  llm: {
    provider: 'deepseek',
    model: 'deepseek-v4-pro',
    apiKey: process.env.DEEPSEEK_API_KEY,
  },
})

const result = await agent.generate('创建一个用户注册表单', {
  conversationId: 'conv-123',
  variables: {},
})

console.log(result.content)
```

### 4. 使用 Expert Agent 框架

```typescript
import { ExpertAgent, createExpertAgentConfig } from '@ai-sdk'
import type { IntentRecognitionResult, RAGContext, ConversationState } from '@ai-sdk'

class MyExpertAgent extends ExpertAgent {
  constructor() {
    const baseConfig = {
      name: 'my-expert',
      description: '我的专家 Agent',
      systemPrompt: '你是一个...',
      llm: { provider: 'deepseek', model: 'deepseek-chat' },
    }

    const expertConfig = createExpertAgentConfig(baseConfig, {
      intentRecognition: { enabled: true, confidenceThreshold: 0.8 },
      rag: { enabled: true, maxResults: 5 },
    })

    super(expertConfig)
  }

  protected async recognizeIntent(userMessage: string, state: ConversationState): Promise<IntentRecognitionResult> {
    // 实现意图识别
    return {
      intent: { type: 'general_chat', message: userMessage },
      confidence: 0.9,
      reasoning: '基于消息分析',
      extractedEntities: {},
    }
  }

  protected async performRAGSearch(query: string, state: ConversationState): Promise<RAGContext> {
    // 实现 RAG 检索
    return { query, results: [], totalResults: 0, searchTime: 0 }
  }
}

// 使用
const agent = new MyExpertAgent()
const result = await agent.executeExpert('帮我创建表单', {
  conversationId: 'conv-001',
  variables: {},
})

console.log('意图:', result.intent?.intent.type)
console.log('置信度:', result.intent?.confidence)
console.log('响应:', result.content)
```

### 5. 测试和验证

```typescript
import { AgentValidator, createSchemaAgentTestSuite, generateTestReport } from '@ai-sdk'

// 创建验证器
const validator = new AgentValidator()

// 注册测试套件
validator.registerTestSuite(createSchemaAgentTestSuite())

// 运行测试
const reports = await validator.runAllTestSuites(async (input) => {
  return agent.executeExpert(input, context)
})

// 生成报告
const report = generateTestReport(reports)
console.log(report)
```

## API 参考

### BaseAgent

| 方法 | 说明 |
|------|------|
| `execute(message, context, history?)` | 非流式执行 |
| `executeStream(message, context, history?)` | 流式执行（AsyncGenerator） |
| `getTools()` | 获取已注册的工具列表 |

### ExpertAgent

| 方法 | 说明 |
|------|------|
| `executeExpert(message, context, history?)` | 执行 Expert Agent（带意图识别和 RAG） |
| `executeExpertStream(message, context, history?)` | 流式执行 Expert Agent |
| `getConversationState(conversationId)` | 获取对话状态 |
| `clearConversationState(conversationId)` | 清除对话状态 |
| `getAllConversationStates()` | 获取所有对话状态 |

### AgentValidator

| 方法 | 说明 |
|------|------|
| `registerTestSuite(suite)` | 注册测试套件 |
| `runTestCase(testCase, executor)` | 运行单个测试用例 |
| `runTestSuite(suite, executor)` | 运行测试套件 |
| `runAllTestSuites(executor)` | 运行所有测试套件 |

### ToolRegistry

| 方法 | 说明 |
|------|------|
| `register(tool)` | 注册工具 |
| `registerAll(tools)` | 批量注册 |
| `get(name)` | 获取工具 |
| `has(name)` | 检查工具是否存在 |
| `getAll()` | 获取所有工具 |
| `toOpenAITools()` | 转换为 OpenAI 格式 |
| `execute(name, params, context)` | 执行工具 |

### PromptBuilder

| 方法 | 说明 |
|------|------|
| `role(description)` | 设置角色描述 |
| `context(content)` | 添加上下文 |
| `rules(rules)` | 添加规则列表 |
| `tools(tools)` | 添加工具说明 |
| `examples(examples)` | 添加示例 |
| `outputFormat(format)` | 添加输出格式 |
| `section(title, content)` | 添加自定义区段 |
| `build()` | 构建最终 prompt |

### buildTool()

流式 API 构建工具：

```typescript
const tool = buildTool()
  .name('tool_name')
  .description('工具描述')
  .parameters(b =>
    b.string('param1', '参数1', { required: true })
      .number('param2', '参数2', { default: 0 })
      .boolean('param3', '参数3')
  )
  .execute(async (params, context) => {
    // 实现逻辑
    return result
  })
  .build()
```

### createTool()

直接创建工具：

```typescript
const tool = createTool({
  name: 'tool_name',
  description: '工具描述',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '查询' },
    },
    required: ['query'],
  },
  execute: async (params, context) => {
    return result
  },
})
```

## 类型定义

### AgentConfig

```typescript
interface AgentConfig {
  name: string
  description: string
  systemPrompt: string
  llm: LLMConfig
  tools?: ToolDefinition[]
  maxToolRounds?: number      // 默认 10
  maxHistoryMessages?: number // 默认 20
}
```

### ExpertAgentConfig

```typescript
interface ExpertAgentConfig extends AgentConfig {
  intentRecognition: {
    enabled: boolean
    confidenceThreshold: number
    maxRetries: number
  }
  rag: {
    enabled: boolean
    maxResults: number
    scoreThreshold: number
    searchTimeout: number
  }
  conversation: {
    maxTurns: number
    contextWindow: number
    statePersistence: boolean
  }
  validation: {
    enabled: boolean
    strictMode: boolean
    requiredFields: string[]
  }
}
```

### UserIntent

```typescript
type UserIntent =
  | { type: 'create_schema'; description: string; widgetTypes?: string[] }
  | { type: 'modify_schema'; target: string; changes: Record<string, unknown> }
  | { type: 'create_flow'; description: string; nodeTypes?: string[] }
  | { type: 'modify_flow'; target: string; changes: Record<string, unknown> }
  | { type: 'query_knowledge'; topic: string; scope?: string }
  | { type: 'execute_task'; task: string; parameters?: Record<string, unknown> }
  | { type: 'general_chat'; message: string }
```

### LLMConfig

```typescript
interface LLMConfig {
  provider: 'deepseek' | 'openai' | 'custom'
  apiKey?: string       // 优先级高于环境变量
  baseURL?: string      // custom 模式必填
  model: string
  temperature?: number
  maxTokens?: number
}
```

### AgentResult

```typescript
interface AgentResult {
  content: string           // 最终文本响应
  messages: Message[]       // 完整消息历史
  toolCalls: Array<{        // 工具调用记录
    name: string
    params: Record<string, unknown>
    result: unknown
    duration: number
  }>
  truncated: boolean        // 是否因达到最大轮次而终止
  usage?: {                 // Token 使用统计
    prompt: number
    completion: number
    total: number
  }
}
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key（provider 为 deepseek 时使用） |
| `OPENAI_API_KEY` | OpenAI API Key（provider 为 openai 时使用） |

## 测试

```bash
pnpm --filter @ai-sdk test
```

## 与现有 AI 系统的关系

本 SDK 是对现有 LangGraph 系统的补充，提供更轻量、独立的 Agent 抽象：

| 特性 | ai-sdk (BaseAgent) | ai-sdk (ExpertAgent) | server (LangGraph) |
|------|-------------------|---------------------|-------------------|
| 依赖 | 无框架依赖 | 无框架依赖 | LangGraph + LangChain |
| 复杂度 | 简单直接 | 中等（带意图识别和 RAG） | 支持复杂图编排 |
| 流式 | 原生支持 | 原生支持 | LangGraph 流式 |
| 意图识别 | 不支持 | 支持 | 需要自行实现 |
| RAG 集成 | 不支持 | 支持 | 需要自行实现 |
| 对话管理 | 基础 | 完整状态管理 | 支持 |
| 测试验证 | 不支持 | 完整框架 | 需要自行实现 |
| 适用场景 | 单 Agent、快速原型 | 多轮对话、智能交互 | 多 Agent 协作、复杂工作流 |

### 选择建议

- **BaseAgent**: 适合简单的单轮对话、工具调用场景
- **ExpertAgent**: 适合需要意图识别、RAG、多轮对话的智能交互场景
- **LangGraph**: 适合复杂的多 Agent 协作、工作流编排场景

## License

MIT
