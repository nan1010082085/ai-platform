# ai

AI 助手模块，包含三个子包：app（前端）、sdk（Agent SDK）、shared（共享类型）。

## 项目规则

### 子包结构
- `app/` — `@ai-app` — AI 对话界面，通过 iframe 嵌入 editor/flow
- `sdk/` — `@ai-sdk` — Agent SDK
- `shared/` — `@schema-platform/ai-shared` — AI 元数据、promptBuilder、widgetCatalogue

### 技术栈
- app：Vue 3 + TypeScript + CSS Module
- shared：TypeScript 纯逻辑（依赖 `@schema-platform/flow-shared`）

### 架构规则
- **AI 与设计器解耦**：AI 通过 iframe 嵌入，通过 postMessage 通信
- **promptBuilder**：`shared/promptBuilder` 是 AI 能力的核心，负责构建上下文
- **widgetCatalogue**：`shared/widgetCatalogue.json` 描述所有可用 Widget 的元数据
- **API 接口**：`app/src/api/` 聚合所有 AI 相关 API 调用

### 分层规范
1. app 全局状态 → Pinia Store
2. app 公共逻辑 → 组合式 API
3. app API 接口 → `app/src/api/`
4. 共享类型/逻辑 → `shared/`
5. Agent SDK → `sdk/`

### 公共包规则
- **同仓开发**：`package.json` 用 `file:` 指向 sibling 公共包；Vite 通过 `scripts/vite-shared-source.mjs` alias 到源码，改公共包后 dev/build 即时生效，无需 npm 发版。

### 环境规则
- **gh CLI 已认证**：`gh` 已登录、`GITHUB_TOKEN` 环境变量已就绪，禁止检查 token、禁止询问用户设置

### 代码质量规则
- **禁止跳过问题**：遇到任何报错、警告、异常，必须找到根因并修复，不能以"预存问题""之前就有""不影响运行"为由跳过。每个问题都要记录原因和修复方式
- **图标必须使用注册表**：使用 `AppIcon` 时 `name` 须在 `platform-shared/utils/iconRegistry.ts` 注册，禁止编造；缺图标则先扩展注册表

### 项目隔离规则
- **前端禁止修改 server 代码**：禁止修改 `server/` 的任何代码。接口对接时，前端必须按照服务端已有的接口规范适配，优先修复前端问题，不能为了方便而去改服务端接口。
- **禁止跨项目修改**：本项目只能修改自己的代码，禁止修改其他项目。需要改其他项目时，明确告知用户。

## 迭代规则

- **禁止回滚 git**，渐进式推进
- promptBuilder 变更需回归测试 AI 输出质量
- widgetCatalogue 变更需同步 editor 的 Widget 注册
- 新增 AI 能力优先在 shared 层实现，app 层只做 UI

## 常用命令

```bash
# app
cd app && pnpm dev       # vite dev server
cd app && pnpm build     # vue-tsc + vite build
cd app && pnpm test      # vitest run

# shared
cd shared && pnpm build  # tsc 编译
```
