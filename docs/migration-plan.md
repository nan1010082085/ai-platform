# 仓库迁移计划

**创建时间**：2026-07-13
**状态**：执行中
**目标账号**：github.com/nan1010082085

---

## 1. 背景

schema-platform 组织已删除，需要将所有子项目重新提交到个人账号 `nan1010082085`，采用功能描述型命名。

## 2. 仓库清单（5个）

| 本地目录 | 新仓库名 | 说明 |
|---|---|---|
| `shared/platform-shared/` | `platform-shared` | 平台公共组件/工具 + ai-shared |
| `ai/` | `ai-platform` | AI 助手 SaaS 平台 |
| `editor/` | `form-editor` | 可视化表单设计器 |
| `flow/` | `flow-designer` | BPMN 流程设计器 |
| `server/` | `api-server` | 后端 API 服务 |

## 3. 依赖关系

```
┌─────────────────────────────────────────────────────────┐
│              platform-shared (独立仓库)                   │
│  auth组件 · 通用UI · apiClient · 图标 · qiankun · ai/   │
│  types · events · toolNames · promptBuilder · workflow   │
└──────┬──────────────┬──────────────┬──────────────┬─────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
  ai-platform    form-editor   flow-designer   api-server
```

## 4. 执行步骤

### Phase 1：融合 flow-shared（73处引用）

**目标**：将 `shared/flow-shared/` 融入 flow 和 server，然后删除

1. 复制 `shared/flow-shared/src/` → `flow/src/shared/flow/`
2. 复制 `shared/flow-shared/src/` → `server/src/shared/flow/`
3. 全局替换：`@schema-platform/flow-shared` → `@/shared/flow`
4. 更新 `flow/package.json` 移除依赖
5. 更新 `server/package.json` 移除依赖和 build 脚本
6. 运行测试验证

### Phase 2：融合 ai-shared 到 platform-shared（27处引用）

**目标**：将 `ai/shared/` 移入 `shared/platform-shared/ai/`，统一导出

1. 复制 `ai/shared/*.ts` → `shared/platform-shared/ai/`
2. 更新 `shared/platform-shared/index.ts` 添加 ai/ 导出
3. 更新 `ai/app/` 中11处引用路径
4. 更新 `server/` 中16处引用路径
5. 删除 `ai/shared/` 目录
6. 运行测试验证

### Phase 3：创建 GitHub 仓库

```bash
gh repo create nan1010082085/platform-shared --public
gh repo create nan1010082085/ai-platform --public
gh repo create nan1010082085/form-editor --public
gh repo create nan1010082085/flow-designer --public
gh repo create nan1010082085/api-server --public
```

### Phase 4：推送各仓库

逐个更新 remote 并推送所有分支和标签：

| 仓库 | 未推送 | 分支 |
|---|---|---|
| ai | 9 commits | main |
| editor | 1 commit | feat/implement-missing-features |
| flow | 1 commit | main |
| server | 3 commits | main |
| platform-shared | 新建 | main |

### Phase 5：清理

1. 删除 `shared/flow-shared/`
2. 删除 `shared/` 目录（如已空）
3. 更新各项目 `package.json` 中 platform-shared 引用路径
4. 更新 CLAUDE.md 仓库清单

## 5. 验证清单

- [ ] flow-shared 已融入 flow + server，测试通过
- [ ] ai-shared 已融入 platform-shared，测试通过
- [ ] `shared/` 目录已删除
- [ ] 5 个 GitHub 仓库均可访问
- [ ] 各项目本地构建通过
