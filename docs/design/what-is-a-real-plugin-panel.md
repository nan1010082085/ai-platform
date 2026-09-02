# 什么该插件、什么不该、什么是真正的插件面板

- 状态：准则补充
- 日期：2026-08-31
- 上游：`plugin-architecture-principles.md` · `cordis-pluginization-routes-vs-modules.md`

---

## 0. 先分清三个词（最容易混）

| 说法 | 实际是什么 | 例子 |
|------|------------|------|
| **Cordis 插件** | 静态代码单元，`ctx.plugin(...)` 装载 | `chat-tools`、未来的 `workflow` 模块 |
| **Registry「插件」数据** | 服务端下发的配置/元数据，不是代码插件 | Expert / Tool / MCP / Skill 清单 |
| **面板（Panel）** | 挂在宿主槽位上的 UI 片段 | 节点属性面板、设置分区、PluginCenter 某个 Tab |

PluginCenter 里的表格，多数是在管 **Registry 数据**，不是 Cordis 插件本身。  
「真正的插件面板」指的是：**由插件向宿主槽位注册的 UI**，不是又一张硬编码大表。

---

## 1. 该做成插件（Cordis Plugin / Service）的

满足任意两条就倾向插件化：

1. **多源**：内置 + 租户 registry + 本地 patch 会叠在一起  
2. **可替换 / 可启停**：关掉后宿主仍能跑，只是少一块能力  
3. **会增长**：团队会持续追加同构项（新工具、新节点面板、新渲染器）  
4. **有生命周期**：需要随 fiber dispose 清掉监听/注册  

| 该 | 形态 |
|----|------|
| 聊天工具定义 | Service `chatTools`（已有） |
| 节点类型 / palette | Service `nodeTypes`（已有） |
| 消息渲染器 | Service `renderers`（已有） |
| Skill 定义 | Service `skillDefs`（已有） |
| **节点属性面板** | Service `nodePanels`（该做，现状是静态 Map） |
| 壳层导航项 | Service `shellNav`（该做） |
| 功能模块（workflow/rag/ops） | 模块插件，贡献 routes/nav/panels |

---

## 2. 不该做成插件的

| 不该 | 原因 | 正确落点 |
|------|------|----------|
| 单条路由 `/rag` | URL 切片不是内聚单元 | 模块的 `routes` 贡献项 |
| 某个具体 workflow 图 | 运行时数据 | DB / registry 数据 |
| 某个 Tool / Expert 配置行 | 元数据 | overlay，由已有 Service 消费 |
| Toast / 滚动 / 抽屉开合 | 瞬时 UI 状态 | composable / Pinia |
| 登录鉴权、qiankun base、Layout 壳 | 宿主基础设施 | `main` / `router` 工厂 / `AiLayout` |
| API `fetch` 封装 | 网络边界 | `src/api/` |
| 「再写一个总 Map 假装插件」 | 双轨，不是插件 | 禁止 |

判定一句话：

> **改中央大文件才能加同类项 → 该插件化。**  
> **关了会导致整个 app 起不来 → 该留在宿主，不是可关插件。**

---

## 3. 什么是「真正的插件面板」

### 3.1 反例（现在的节点属性面板）

`useAgentNodePropertyPanel.ts` 里：

- 40+ 个 `import PanelXxx`
- 一个巨大的 `Map<AgentNodeType, Component>`
- 新节点 = 改这个文件

这只是 **硬编码面板目录**，不是插件面板。

### 3.2 正例（真正的插件面板）

真正的插件面板 = **宿主提供槽位 + 插件注册组件 + 运行时按 key 解析**。

```
宿主（画布右侧）
  └─ <PropertyPanelHost>
        读 nodePanels.resolve(selectedNode.type)
        渲染插件注册的组件

workflow 模块插件（装载时）
  └─ ctx.nodePanels.register('llm', LlmNodePanel)
  └─ ctx.nodePanels.register('agent-loop', AgentLoopNodePanel)
  └─ …
```

必备特征：

| 特征 | 说明 |
|------|------|
| **槽位在宿主** | 面板外框、选中态、保存按钮由宿主管 |
| **内容由注册表来** | `register(type, component)`，不是中央 import 堆 |
| **默认兜底** | 未注册 → `DefaultNodePanel`，响亮可知 |
| **可随模块启停** | 关掉模块 → 其面板一并 unregister（fiber dispose） |
| **禁双轨** | 迁完即删旧 Map |

同类「真正的面板」还包括：

- 设置页某个 section（宿主 Settings 壳 + 模块 `registerSection`）
- PluginCenter 某个 Tab（宿主 Tab 壳 + 模块 `registerTab`）——**若**真要可扩展；否则固定 Tab 管 Registry 数据即可

### 3.3 PluginCenter ≠ 插件面板

| | PluginCenter | 真正的插件面板 |
|--|--------------|----------------|
| 角色 | **管理面**：看/改 registry 数据与运行时启停 | **业务面**：编辑某个节点/某块设置 |
| 用户 | 配置管理员 | 画布/设置里的编辑者 |
| 扩展方式 | 主要是数据 overlay | 组件注册进槽位 |

Runtime Tab 已经接近「管 Cordis Service」；Experts/Tools 表仍是数据目录——两者都要，但不要混称。

---

## 4. 一张决策树

```
要加的东西是什么？
├─ 瞬时 UI 状态 → composable / Pinia
├─ 租户/用户配置数据 → registry overlay（不是新插件）
├─ 宿主基建（鉴权/壳） → 留在 host
├─ 同构可增长的能力/UI 槽 → Cordis Service.register
└─ 一整块业务（多页面+导航+面板） → 功能模块插件
       └─ 其中单条路由/菜单 → 模块 contribution，不是独立插件
```

---

## 5. 对现状的直接答案

| 问题 | 答案 |
|------|------|
| 什么该插件？ | 多源、可启停、会增长的能力与 UI 槽；以及内聚功能模块 |
| 什么不该插件？ | 单路由、单条数据、瞬时状态、宿主基建 |
| 真正的插件面板？ | 宿主槽位 + `register(key, Component)`；当前节点属性 Map **还不是** |

下一步若只做一件事：把 `useAgentNodePropertyPanel` 的 Map 迁成 `nodePanels` Service——那就是第一批「真正的插件面板」。
