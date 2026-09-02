# 报告：路由插件化 vs 功能模块插件化

- 状态：分析结论（可执行建议）
- 日期：2026-08-31
- 依据：`plugin-architecture-principles.md` + 现状勘察（`src/plugins/`、`router.ts`、`AiLayout`、`useAgentNodePropertyPanel`）
- 可视化：Cursor Canvas `ai-cordis-pluginization-report`

---

## 1. 结论（先读这段）

**应以「功能模块」为插件单元，而不是「每个路由一个插件」。**

路由可以（也应该）成为模块插件的**贡献项之一**——与导航项、属性面板、设置分区、测试探针并列——但路由本身不是 Cordis 意义上的插件。

| 问法 | 答案 |
|------|------|
| 不少路由当成插件来集成？ | **不推荐按路由拆插件**。路由是壳层入口，拆成插件会把鉴权、布局、懒加载、导航三处硬编码问题扩散成 N 个插件。 |
| 功能模块当成插件来集成？ | **推荐**。一个模块 = 一份静态装载的插件代码，向宿主贡献能力与（可选）路由/导航。 |
| 与现行 Cordis 是否一致？ | 一致：插件是静态代码；工具/节点等是动态数据；workflow 永远是数据。 |

一句话：**插件 = 功能模块；路由 = 模块可贡献的壳层声明。**

---

## 2. Cordis 核心概念在本项目的映射

| Cordis 概念 | 本项目落点 | 含义 |
|-------------|------------|------|
| Context / Fiber | `src/plugins/host.ts` | 根容器与生命周期；dispose 清理注册 |
| Service | `chatTools` / `nodeTypes` / `renderers` / `skillDefs` | 扩展点注册表（多源、优先级、可启停） |
| Plugin（代码） | `ctx.plugin(...)` 静态装载 | 打包进 app 的模块，禁止浏览器任意路径动态 import |
| 配置层 | builtin < overlay < patch | 内置 / registry / 本地启停 |

| 数据（非插件） | 工具、skill、workflow 定义 | 运行时 `setOverlay` / `register` |

因此「插件化」正确含义是：

1. **扩展点进入 Service**（已做：tools / nodes / renderers / skills）
2. **功能面以模块插件贡献**（未做：路由、导航、属性面板、设置分区）
3. **禁止**把每个页面路由或每个 workflow 当成一个 Cordis 插件

---

## 3. 现状：已经插件化了什么，还硬编码什么

### 已插件化（能力层）

- `chatTools`：内置 + registry overlay + 本地启停
- `nodeTypes`：palette 内置 + registry 动态层
- `renderers`：消息 step 渲染分发
- `skillDefs`：Skill 与 registry 同步

### 仍硬编码（壳层 / UI 扩展点）

| 区域 | 现状 | 问题 |
|------|------|------|
| `router.ts` | 静态路由大数组 | 新功能页 = 改中央路由表 |
| `AiLayout.vue` | `primaryNav` / `settingsNav` 硬编码 | 与路由表平行维护，易漂移 |
| `useAgentNodePropertyPanel` | `Map<nodeType, 组件>` | 加节点面板必须改 composable；与 Cordis 双轨 |

| 画布 node slot | 部分类型手写 slot | 新节点类型可能改 canvas |
| PluginCenter tabs | 固定 tab 列表 | 新「中心类」面无法注入 |

---

## 4. 两种路线对比

### 路线 A：按路由拆插件（不推荐）

```
plugin-chat → 贡献 /
plugin-rag → 贡献 /rag
plugin-plugins → 贡献 /plugins
…
```

**看似对齐「分支路由插件化」字面，实际踩坑：**

1. 路由与布局强耦合（`AiLayout` 子路由 vs 全屏设计器），插件边界被布局切碎
2. 鉴权 `meta.public`、`guardAuthenticatedRoute` 属于宿主职责，不应下沉到每个路由插件
3. 顶导 / settings 导航会再出现第二套「路由插件清单」
4. 违反「插件是功能内聚、而非 URL 切片」——同一业务常跨多路由（列表 + 详情 + debug）

### 路线 B：按功能模块拆插件（推荐）

```
modules/
  chat/          → routes? + chat 扩展（已有 renderers/tools 可并入或依赖）
  workflow/      → designer 路由 + nodeTypes + propertyPanels + canvas slots
  rag/           → /rag + rag-debug
  plugins-center/→ /plugins + runtime UI
  settings/      → settings 子路由簇 + settingsNav
  ops/           → monitor / evaluation / schedules / debug
  …
```

每个模块插件向宿主声明 **contributions（贡献清单）**：

| 贡献类型 | 说明 | 是否新建 Service |
|----------|------|------------------|
| `routes` | path / name / component / meta / layout 槽位 | 建议 `shellRoutes` 或 boot 时合并进 router |
| `nav` | 主导航 / 设置导航项 | 建议 `shellNav` |
| `propertyPanels` | 节点类型 → 面板组件 | 建议迁入现有或新 `nodePanels` Service |
| `settingsSections` | 聊天设置 / 模型中心分区 | 可选 |
| `testProbes` | 健康检查 / 调试探针 | 可选 `probes` |
| 既有 Service | tools / nodes / renderers / skills | 继续用 |

模块仍是**静态** `ctx.plugin(modulePlugin)`；路由在 `ensurePluginHost()` 之后、`app.use(router)` 之前由贡献表一次性 `createRouter`——不是运行时 `addRoute` 任意加载。

---

## 5. 推荐架构（目标态）

```
Host（main.ts）
  ├─ ensurePluginHost()
  │     ├─ 能力 Service：chatTools / nodeTypes / renderers / skillDefs
  │     └─ 壳层 Service：shellRoutes / shellNav / nodePanels（新增）
  ├─ createAiRouter(from shellRoutes.list())
  └─ AiLayout 读 shellNav.list()
```

**宿主保留：** 鉴权、qiankun/iframe base、登录回调、错误边界、插件容器本身。

**模块插件拥有：** 本域页面、本域导航、本域面板、本域对能力 Service 的 builtin 注册。

**数据仍非插件：** 租户 registry 下发的 tools/skills、用户保存的 workflow 图。

---

## 6. 优先级建议（渐进，禁双轨）

| 批次 | 做什么 | 验收 |
|------|--------|------|
| **P0** | 属性面板 Map → `nodePanels` Service；删 `useAgentNodePropertyPanel` 静态表 | 加面板只 `register`，旧 Map 删除 |
| **P1** | Palette / 画布只读 `host.nodeTypes`；去掉 UI 侧第二套拼装 | 单一数据源 |
| **P2** | 引入 `shellNav`：AiLayout 导航改读贡献表 | 路由表与导航同源或可校验 |
| **P3** | 引入 `shellRoutes`：按功能模块静态贡献路由，boot 合并 | `router.ts` 瘦身为工厂 |
| **P4** | settings / debug / ops 收成模块插件 | 新运维页不改中央大文件 |

不要从 P3 一上来拆全部路由——先把**注册表型 UI 扩展点**（面板、导航）Cordis 化，收益最大、风险最小。

---

## 7. 判定准则（以后每次加功能先过一遍）

| 若它是… | 则… |
|---------|-----|
| 多源可注册、可启停、有优先级 | → Cordis Service |
| 内聚业务面（含 0～N 条路由 + 导航 + 面板） | → 功能模块插件 |
| 单条 URL / 菜单项 | → 模块的 contribution，不是独立插件 |
| 租户/用户配置数据 | → overlay/patch 数据，不是插件 |
| 纯 UI 瞬时状态（toast、滚动、抽屉开合） | → composable / Pinia，不进 Cordis |

---

## 8. 明确不做

1. 浏览器运行时按路径动态 `import` 任意插件包  
2. 一个 workflow / 一个 registry tool = 一个 Cordis 插件  
3. 把鉴权与 layout 壳拆成可关掉的「路由插件」  
4. 路由插件化与旧 `router.ts` 长期双轨并存  

---

## 9. 总结

Cordis 给我们的启发是 **「能力用注册表接入，模块用插件装载」**，不是「URL 即插件」。

- **功能模块插件化**：正确主轴，覆盖路由、导航、面板、探针等壳层贡献。  
- **路由插件化**：只作为模块贡献项实现；禁止按 path 切片成插件森林。  
- 当前最值得先做的不是拆 `router.ts`，而是把 **属性面板 / 导航** 收进与 tools、renderers 同构的 Service，消除硬编码堆表。
