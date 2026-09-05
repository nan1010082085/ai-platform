# AI App 插件基座 — 完整说明（现行）

- 状态：已落地（Wave 1 + Wave 2）
- 日期：2026-09-04
- 范围：`ai/app`（Cordis 客户端宿主）
- 实施计划：`ai/docs/superpowers/plans/2026-09-04-plugin-foundation-remaining-60.md`

---

## 1. 目标

在「能力层可插件（原 ~40%）」之上补齐壳层槽位、消灭 UI 双轨、功能模块贡献路由，形成**可控扩展点可插件**基座。

**不是**万物可插件；宿主（鉴权、Layout 壳、login）保留。

---

## 2. 架构总览

```
main.ts
  await ensurePluginHost()
       ├─ 能力 Service：chatTools / nodeTypes / renderers / skillDefs
       ├─ 壳层 Service：nodePanels / shellNav / shellRoutes
       └─ 功能模块（在 shellRoutesPlugin apply 内同步 register）
            chat / workflow / rag / plugins-center / settings / ops
  createAiRouter() ← buildRoutesFromContributions(shellRoutes.list())
  AiLayout ← shellNav.list()
```

| 层 | Service / 模块 | 职责 |
|----|----------------|------|
| 能力 | `chatTools` | 工具定义三层 |
| 能力 | `nodeTypes` | palette 内置 + registry 动态 |
| 能力 | `renderers` | 消息渲染分发 |
| 能力 | `skillDefs` | Skill 定义 |
| 壳层 | `nodePanels` | 节点属性面板 `register/resolve` |
| 壳层 | `shellNav` | 顶导 / 设置导航贡献 |
| 壳层 | `shellRoutes` | 路由贡献；工厂合并 |
| 模块 | `plugins/modules/*` | 按域注册 routes |

业务只 `import ... from '@/plugins'`。

---

## 3. 什么该插件 / 什么不该

详见 `what-is-a-real-plugin-panel.md`。摘要：

- **该**：多源可增长注册表、功能模块（含 routes/nav/panels 贡献）
- **不该**：单条 URL、瞬时 UI 状态、鉴权壳、registry 纯数据行、workflow 图数据

真正的插件面板 = 宿主槽位 + `nodePanels.register(type, Comp)`（已取代原 Map）。

---

## 4. 关键文件

| 路径 | 说明 |
|------|------|
| `src/plugins/host.ts` | 宿主启动 |
| `src/plugins/plugins/node-panels/` | 属性面板 Service + builtin |
| `src/plugins/plugins/shell-nav/` | 导航 Service + builtin |
| `src/plugins/plugins/shell-routes/` | 路由 Service；内装载六模块 |
| `src/plugins/modules/` | chat/workflow/rag/… 路由贡献 |
| `src/router.ts` | `buildRoutesFromContributions` 工厂 |
| `src/components/AiLayout.vue` | 读 shellNav |
| `src/components/agent-workflow/AgentWorkflowPalette.vue` | 读 nodeTypes |
| `src/components/agent-workflow/AgentWorkflowCanvas.vue` | 按 nodeTypes 类型挂槽 |
| `src/composables/useAgentNodePropertyPanel.ts` | 仅 resolve + labels |

---

## 5. 扩展指南（怎么加东西）

### 5.1 新节点属性面板

1. 写面板 Vue 组件  
2. 在 `node-panels/builtin.ts`（或未来模块 apply 内）`register(type, Comp)`  
3. **禁止**再改 composable 大 Map（已删除）

### 5.2 新导航项

在 `shell-nav/builtin.ts` 或模块内 `ctx.shellNav.register({...})`。

### 5.3 新页面路由

在对应 `plugins/modules/<domain>/index.ts` 增加 `ShellRouteContribution`：

- `layout: 'ai-layout'` + `childPath` → Layout 子路由  
- `layout: 'bare'` → 全屏（设计器等）  
- `layout: 'public'` + `meta.public` → 公开页  

`login` / `auth-callback` 仍由 `router.ts` 宿主硬编码。

### 5.4 新 palette 节点类型

内置改 `config/nodeTypes.ts`；租户动态走 `nodeTypes.setDynamic`（registry 同步已接）。

---

## 6. 验收与门禁

```bash
cd ai/app
pnpm typecheck
pnpm exec vitest run src/plugins/__tests__/ src/__tests__/useAgentNodePropertyPanel.spec.ts src/__tests__/AgentWorkflowDesignerView.spec.ts

# 双轨门禁
rg "new Map<AgentNodeType" src/composables/useAgentNodePropertyPanel.ts   # 应无
rg "AGENT_PALETTE_ITEMS" src/components/agent-workflow/AgentWorkflowPalette.vue src/components/agent-workflow/AgentWorkflowCanvas.vue  # 应无
rg "path: '/rag'" src/components/AiLayout.vue   # 应无（进 shellNav）
```

全量 `pnpm test` 中 `AiPreviewPanel` / `pagination` / `AiChatSettings` 若因 `@apform-ui/core` 槽位报错失败，属预存问题，与本基座无关。

---

## 7. 进度

| 块 | 状态 |
|----|------|
| 能力 Service（原 40%） | ✅ |
| nodePanels | ✅ |
| Palette/Canvas 单源 | ✅ |
| shellNav | ✅ |
| shellRoutes + 六模块 | ✅ |
| 完整 docs | ✅（本文） |

基座在「可控扩展点」意义上视为 **完成**。

**下一步（能力数据加载 Cordis 化）：** [`cordis-centric-registry-loading.md`](./cordis-centric-registry-loading.md)
