# AI 插件化架构原则（Cordis 启发）

- 状态：现行
- 日期：2026-08-31
- 落点：`ai/app/src/plugins/`（Cordis 宿主 + Service）

## 1. 为什么保留这套思路

上一轮 DSH harness 运行时已清理；**Cordis 客户端插件容器保留**。启发不在「再接一套 agent 服务」，而在：

> 分支路由、工具、节点类型、渲染器、测试探针等扩展点，应通过插件注册接入，而不是在业务里继续堆砌常量、switch 与散落 registry。

## 2. 分层

| 层 | 职责 | 落点 |
|---|---|---|
| Pinia / Composables | UI 状态与交互 | `stores/`、`composables/` |
| 插件运行时 | 能力注册、生命周期、配置分层 | `src/plugins/` |
| API | 网络边界 | `src/api/` |

Pinia 不管能力注册；插件不管页面状态。二者不互相替代。

## 3. 铁律

1. **适配层唯一出口**：业务只 `import ... from '@/plugins'`，禁止直接 import `@deepseek-ai/cordis`。
2. **静态插件 / 动态数据**：插件代码随宿主静态装载；工具、skill、workflow 是运行时数据，由 Service 动态注册。workflow 永远是数据，不是插件。
3. **禁双轨**：扩展点迁入 Service 后必须删除旧常量/旧 registry，禁止长期并存。
4. **配置分层**：`builtin < registry overlay < local patch`，合并顺序固定。
5. **版本锁定**：`@deepseek-ai/cordis` 精确版本；升级须读 changelog 评审。
6. **优先插件化**：新增功能模块、壳层贡献（导航/面板）、测试探针、工具/节点/渲染扩展时，先问「能否注册进现有 Service / 新 Service / 模块插件」，禁止在业务文件里硬编码堆表。路由是模块的贡献项，不是独立插件（见 `cordis-pluginization-routes-vs-modules.md`）。

## 4. 已落地的扩展点

| Service | 用途 |
|---|---|
| `chatTools` | 聊天工具定义与分类 |
| `nodeTypes` | 工作流 palette / 节点类型 |
| `renderers` | 消息内容渲染分发 |
| `skillDefs` | Skill 注册（SKILL.md 契约对齐） |

新扩展点：注册表型（多源、优先级、可启停）→ Cordis Service；纯 UI 状态 → 留在 composable。

## 5. 明确不做

- 不再维护独立 `ai/harness` / DSH 运行时部署文档与迭代计划
- 不把每个 workflow 做成 Cordis 插件
- 不在浏览器侧做 loader 运行时动态 import 任意路径
