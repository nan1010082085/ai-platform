# 插件中心（Plugin Registry）

> 配置文件驱动的 Expert / Skill / Tool / MCP 四层能力目录。Chat（LangGraph）与 Workflow（DAG）共用，避免硬编码。

## 一、配置文件

| 文件 | 说明 |
|------|------|
| `server/config/ai-plugins.builtin.json` | 内置平台专家、工具目录、MCP Server 声明（随仓库发布） |
| `server/config/ai-plugins.json` | 环境扩展（可提交），默认可为空数组 |
| `server/config/ai-plugins.local.json` | 本地覆盖（建议 gitignore），复制 `.example` |
| `AI_PLUGIN_CONFIG_PATH` | 额外 manifest 绝对路径 |
| `AI_PLUGIN_CONFIG_DIR` | 配置目录，默认 `server/config` |

**合并规则**：按顺序加载，同 `id` / `name` 后者覆盖前者：

```text
ai-plugins.builtin.json → ai-plugins.json → ai-plugins.local.json（若存在）→ AI_PLUGIN_CONFIG_PATH
```

| 层级 | 用途 | Git |
|------|------|-----|
| **builtin** | 平台出厂能力（4 专家 + 5 MCP + 工具目录） | 提交 |
| **json** | 环境/租户共用扩展 | 提交 |
| **local** | 本机私有（外置 MCP、试验专家） | 建议 gitignore |

## 二、四层模型

```text
mcpServers[]  →  bridge 按 transport 连接（inmemory / stdio / sse）
tools[]       →  工具元数据（kind: mcp | graph | http）
skills[]      →  Markdown 指令（content 或 file）
experts[]     →  专家 Agent：prompt + tools + skills + routing
```

### Expert 关键字段

| 字段 | 说明 |
|------|------|
| `id` | 全局唯一，如 `platform.editor` |
| `legacyAgentKey` | 对齐 LangGraph `currentAgent` / Workflow `agentType` |
| `dynamicPrompt` | `editor` / `flow` / `page` / `general` → 运行时 `promptBuilder` |
| `systemPrompt` | 纯外置专家使用内联 prompt |
| `tools` | 工具名列表，执行时 `getToolsByNames` |
| `skills` | 附加 Skill id，拼装进 system prompt |
| `routing.keywords` | 供 LangGraph 意图匹配（`matchExpertsByRouting`） |
| `runtime` | `langgraph` / `workflow` |

## 三、与 Chat / Workflow / 设计器

| 消费方 | Registry 用法 |
|--------|----------------|
| **LangGraph Chat** | `editor`/`flow`/`page` 读 prompt+tools；无 legacy 专家走 `pluginExpert` 节点 |
| **Workflow 执行器** | `runRegisteredExpert`；`expert` 节点用 `expertId` |
| **设计器 Palette** | `GET /api/ai/plugins` → 专家区 + MCP 工具区动态列表 |
| **ToolNodePanel** | `usePluginRegistry().getToolsForPanel()`，argsHint 回退 `agentTools` |

前端 `agentTools.ts` 仅保留 **参数示例（argsHint）** 与旧图兼容，**工具清单以 Registry 为准**。

## 四、扩展示例

复制 `ai-plugins.local.json.example` 为 `ai-plugins.local.json`，或设置：

```bash
export AI_PLUGIN_CONFIG_PATH=/path/to/my-plugins.json
```

```json
{
  "version": 1,
  "experts": [
    {
      "id": "acme.support",
      "label": "客服专家",
      "systemPrompt": "你是客服助手。",
      "tools": ["rag__search"],
      "routing": { "keywords": ["客服", "工单"] },
      "runtime": ["langgraph", "workflow"]
    }
  ]
}
```

重启 server 后生效（当前无热重载）。

## 五、代码入口

| 路径 | 职责 |
|------|------|
| `server/src/ai/plugins/types.ts` | 类型 |
| `server/src/ai/plugins/registry.ts` | 注册表 |
| `server/src/ai/plugins/loadPluginConfig.ts` | 读配置 |
| `server/src/ai/plugins/resolveExpertPrompt.ts` | Prompt 拼装 |
| `server/src/ai/plugins/dispatchExpert.ts` | `runRegisteredExpert` 统一调度 |
| `server/src/ai/mcp/bridge.ts` | 按 Registry 声明初始化 MCP |
| `ai/app/src/composables/usePluginRegistry.ts` | 设计器消费 Registry |

启动时由 `tools/registry.ts` 在 MCP 初始化前调用 `initPluginRegistry()`。

**部署**：`deploy/pack.sh --target server` 会复制 `server/config/`（含 `ai-plugins*.json`）。

## 六、后续（P1+）

1. ~~`router` 使用 `matchExpertsByRouting`~~（已接入 `resolveRoutedExpert`，支持无 legacy 专家走 `pluginExpert` 节点）
2. ~~`taskPlanner` prompt 动态注入 `listExperts()`~~（已接入 `buildExpertCatalogForPrompt`）
3. ~~`GET /api/ai/plugins` 只读目录 API~~（已实现，需登录）
4. ~~`bridge` 从 Registry 加载 MCP~~（inmemory / stdio / sse 按声明连接）
5. ~~Workflow 设计器 Palette 从 Registry 拉专家列表~~（`expert` 节点 + PropertyPanel 下拉）
6. ~~通用专家执行~~（`runRegisteredExpert` + Workflow `expert` 节点；Chat 侧 `pluginExpert` 图节点）

扩展新专家：在 `ai-plugins.json` 或 `ai-plugins.local.json` 增加 `experts[]` 条目，重启 server，设计器 Palette 自动出现。
