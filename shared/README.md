# @schema-platform/ai-shared

AI 智能体所需的元数据和 prompt 构建能力。从 editor widget configs 和 flow node definitions 构建时提取，保证 AI 知识与编辑器/流程引擎单一数据源。

## 用途

- **metadata.json** — 构建时自动生成的 Widget/Flow 节点元数据
- **promptBuilder** — 从 metadata 动态构建 Editor/Flow Agent 的 system prompt
- **systemKnowledge** — 稳定的领域知识（事件系统、联动系统、变量系统、数据源配置）
- **types** — AIMetadata, WidgetAIMetadata, FlowNodeAIMetadata TypeScript 接口

## metadata.json

构建时由 `scripts/extract-ai-metadata.ts` 自动生成，包含：

```json
{
  "version": "2026-06-02",
  "generatedAt": "2026-06-02T...",
  "widgets": [
    {
      "type": "input",
      "group": "form",
      "canHaveChildren": false,
      "displayName": "文本输入",
      "description": "单行文本输入框",
      "defaultProps": { "placeholder": "请输入", "clearable": true },
      "keyProps": ["placeholder", "maxlength", "showWordLimit", "clearable"],
      "defaultSize": { "w": 280, "h": 44 },
      "exposedValues": [{ "key": "value", "type": "string", ... }],
      "receivableEvents": [{ "name": "focus", "description": "聚焦" }],
      "eventTargets": [],
      "configPanels": ["basic", "style", "event"]
    }
  ],
  "flowNodes": [
    {
      "type": "userTask",
      "label": "用户任务",
      "description": "需要用户完成的任务（审批/填写）",
      "size": { "width": 160, "height": 80 },
      "category": "task",
      "configFields": [{ "key": "assigneeType", "type": "string", ... }]
    }
  ],
  "systems": {
    "eventActionTypes": ["show", "hide", "open-dialog", ...],
    "linkageTypes": ["visible", "disabled", "required", ...],
    "containerTypes": ["form", "dialog", "card", ...],
    "variableTypes": ["string", "number", "boolean", "object", "array"]
  }
}
```

## 提取脚本

```bash
# 单独运行提取
pnpm extract:ai-metadata

# 开发/构建时自动运行
pnpm dev:server    # 先提取再启动后端
pnpm build:server  # 先提取再编译
```

脚本路径：`scripts/extract-ai-metadata.ts`

从以下位置提取元数据：
- `packages/editor/web/src/widgets/` — Widget 注册表和属性配置
- `packages/flow/shared/` — Flow 节点定义

## 导出

```typescript
// 类型
export type { WidgetAIMetadata, FlowNodeAIMetadata, AIMetadata } from './types.js'

// Prompt 构建器
export { buildEditorSystemPrompt, buildFlowSystemPrompt, ROUTER_SYSTEM_PROMPT } from './promptBuilder.js'

// 系统知识
export {
  EVENT_ACTION_TYPES, EVENT_ACTION_DESCRIPTIONS, EVENT_ACTION_FIELDS,
  EVENT_TRIGGERS, LINKAGE_TYPES, LINKAGE_DESCRIPTIONS,
  VARIABLE_TYPES, VARIABLE_SCOPE_DESCRIPTIONS, API_CONFIG_FIELDS, OUTPUT_TAGS,
} from './systemKnowledge.js'
```

## promptBuilder 函数

### `buildEditorSystemPrompt(metadata: Metadata): string`

从 metadata 生成完整的 Editor Agent system prompt，包含：
- Widget 类型表格（按 8 组分类）
- Widget Schema 结构说明
- 默认尺寸参考
- 事件系统（16 种动作类型）
- 联动系统（6 种类型）
- 变量系统
- 数据源配置
- 核心规则
- 典型示例（表单、搜索列表、带联动表单）
- 输出格式

### `buildFlowSystemPrompt(metadata: Metadata): string`

从 metadata 生成完整的 Flow Agent system prompt，包含：
- BPMN 节点表格（按 4 类分类）
- BpmnNodeConfig 完整字段
- FlowGraph 数据结构
- 引擎校验规则
- 布局规则
- 典型示例（审批流程、条件分支）
- generate_schema 工具使用说明
- 输出格式

### `ROUTER_SYSTEM_PROMPT`

Router Agent 的 system prompt（稳定，不依赖 metadata），定义意图分类规则和输出格式。

## 依赖

```json
{
  "@schema-platform/flow-shared": "workspace:*"
}
```

## 工作流模板

`agentWorkflow.ts` 提供 n8n 风格 DAG 工作流模板工厂，用于 AI Agent 工作流编排。

### 可用模板

| 模板 ID | 名称 | 说明 |
|---|---|---|
| `blank` | 空白工作流 | 手动触发 → LLM → 结束 |
| `document-summary` | 文档摘要 | Webhook → 文档解析 → LLM 摘要 → 结束 |
| `doc-image-recognition` | 文档/图片识别 | 手动触发 → 解析 → if 分支（OCR 走 vision / 文档走结构化提取） |
| `intelligent-assistant` | 智能助手问答 | 手动触发 → 会话记忆 → RAG 检索 → LLM 回答 → 结束 |
| `contract-extract` | 合同条款提取 | Webhook → 文档解析 → LLM 结构化提取关键条款与风险点 |
| `kb-faq` | 知识库 FAQ 生成 | Webhook → 文档解析 → LLM 生成问答对 → RAG 写入知识库 |
| `http-notify` | HTTP 回调通知 | Webhook → LLM 处理 → HTTP POST 结果推送到外部系统 |
| `rag-ingest-qa` | RAG 入库质检 | Webhook → 解析 → LLM 质检 → if 分支（合格入库 / 不合格人工审核） |
| `multi-doc-batch` | 多文档批量处理 | Webhook → 解析 → 单文档摘要 → 会话记忆 → 汇总报告 |

### 使用方式

```typescript
import { createAgentWorkflowGraphByTemplate, AGENT_WORKFLOW_TEMPLATES } from '@schema-platform/ai-shared/agentWorkflow'

// 获取模板列表（用于 UI 选择器）
const templates = AGENT_WORKFLOW_TEMPLATES

// 按模板 ID 创建 DAG
const graph = createAgentWorkflowGraphByTemplate('contract-extract')
```

### 测试

```bash
pnpm test
```

## 与 server 的关系

- server Chat 专家经 `pluginExpert` + `buildExpertSystemPrompt`（插件 Registry）；`dynamicPrompt` 类型走 ai-shared `promptBuilder`
- server 的 `editorTools.ts` 通过 `metadata.json` 读取 Widget 目录
- metadata.json 通过 `require.resolve('@schema-platform/ai-shared/package.json')` 定位
