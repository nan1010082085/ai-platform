# 插件中心（Plugin Registry）

> 配置文件驱动的 Expert / Skill / Tool / MCP 四层能力目录。Chat（LangGraph）与 Workflow（DAG）共用。

**路线图**：[plugin-roadmap.md](./plugin-roadmap.md)  
**Workflow 对外开放**：[design/workflow-open-api.md](./design/workflow-open-api.md)

## 一、配置文件

### 推荐：分目录（`server/config/plugins/`）

```
plugins/
├── mcp/           # 每个文件一个 MCP Server（含 id）
├── tools/         # 按域分组，如 mcp-schema.json → { "tools": [...] }
├── experts/       # 每个文件一个 Expert（含 id）
├── skills/        # 每个文件一个 Skill（含 id）
├── local/         # 本机覆盖（gitignore）
├── tenants/{id}/  # 租户 overlay（配合 AI_PLUGIN_TENANT_ID）
├── packs/         # 可分发插件包源码（manifest.json + layers）
└── local.example/ # 扩展示例
```

详见 `server/config/plugins/README.md`。

### 兼容：单文件 overlay

| 文件 | 说明 |
|------|------|
| `ai-plugins.builtin.json` | **已废弃**（内容已迁入 `plugins/`），保留空壳兼容 |
| `ai-plugins.json` | 环境扩展，可提交 |
| `ai-plugins.local.json` | 本机单文件覆盖 |
| `AI_PLUGIN_CONFIG_PATH` | 额外 manifest **文件或同结构目录** |
| `AI_PLUGIN_CONFIG_DIR` | 配置根目录，默认 `server/config` |

**合并顺序**（后者覆盖同 id / name）：

```text
plugins/ → ai-plugins.builtin.json → ai-plugins.json
  → plugins/local/ → plugins/tenants/{AI_PLUGIN_TENANT_ID}/
  → ai-plugins.local.json → AI_PLUGIN_CONFIG_PATH
```

**运维 CLI**（在 `server/` 目录）：

```bash
pnpm plugin:validate
pnpm plugin:pack --dir config/plugins/packs/example.support --out dist/example.support.tgz
pnpm plugin:install --file dist/example.support.tgz [--tenant acme]
kill -HUP $(pgrep -f "dist/index.js")   # 热重载 Registry
```

## 二、四层模型

```text
mcp/       →  bridge 按 transport 连接（inmemory / stdio / sse）
tools/     →  工具元数据（kind: mcp | graph | http）
skills/    →  Markdown 指令（content 或 file）
experts/   →  专家 Agent：prompt + tools + skills + routing
```

### Expert 关键字段

| 字段 | 说明 |
|------|------|
| `id` | 全局唯一，如 `platform.editor` |
| `legacyAgentKey` | 对齐 LangGraph `currentAgent` / 旧 Workflow 节点 |
| `dynamicPrompt` | `editor` / `flow` / `page` / `general` → promptBuilder |
| `systemPrompt` | 纯外置专家内联 prompt |
| `tools` | 工具名列表 |
| `skills` | Skill id 列表 |
| `routing` | LangGraph 意图匹配 |
| `runtime` | `langgraph` / `workflow` |

## 三、与 Chat / Workflow / 设计器

| 消费方 | Registry 用法 |
|--------|----------------|
| LangGraph Chat | legacy 专家 + `pluginExpert` 自定义专家 |
| Workflow 执行器 | `runRegisteredExpert`；`expert` 节点 + `expertId` |
| 设计器 | `GET /api/ai/plugins` → Palette + ToolNodePanel |
| **外部系统** | 执行 workflow 内 expert 节点，配置来自 Registry；Open API 见 [workflow-open-api.md](./design/workflow-open-api.md) |

## 四、扩展示例

```bash
cp -R server/config/plugins/local.example server/config/plugins/local
# 编辑 local/experts/*.json，设 enabled: true
# 重启 server
```

或在 `plugins/local/experts/acme.support.json` 新增专家文件。

## 五、代码入口

| 路径 | 职责 |
|------|------|
| `server/config/plugins/` | 分文件配置 |
| `server/src/ai/plugins/loadPluginConfig.ts` | 目录 + legacy 合并 |
| `server/src/ai/plugins/dispatchExpert.ts` | 统一专家调度 |
| `server/src/ai/mcp/bridge.ts` | MCP 连接 |
| `ai/app/src/composables/usePluginRegistry.ts` | 设计器消费 |

部署：`deploy/pack.sh --target server` 复制整个 `server/config/`。

## 六、已完成能力（P0–P1）

1. Router / taskPlanner 动态专家  
2. `GET /api/ai/plugins`  
3. MCP bridge 读 Registry  
4. 设计器 Palette + `expert` 节点  
5. `runRegisteredExpert` + `pluginExpert`  

未完成项见 [plugin-roadmap.md](./plugin-roadmap.md)。
