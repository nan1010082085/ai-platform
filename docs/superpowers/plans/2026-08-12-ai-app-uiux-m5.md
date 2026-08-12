# AI App UI/UX M5 — 边角闭环

> **状态: ✅ CLOSED / 评分 A（2026-08-12）**  
> M5 已收口。走查证据仍见 Canvas；新缺口另开日期计划并登记 [README.md](./README.md)。

**Goal:** 收口 M4 后复审仍开放的边角项（分享页 / 面板静默失败 / 批量删除反馈）。

**基线（已归档）:** [archive/2026-08-11-ai-app-uiux-fix.md](./archive/2026-08-11-ai-app-uiux-fix.md)（M1–M4）  
**走查证据:** Canvas `ai-app-uiux-audit` / `reaudit` / `overall` / `round2-verify` / `m5`

## Progress

| Task | 优先级 | 标题 | 状态 |
|------|--------|------|------|
| 15 | P1 | 对话分享页路由闭环 | `- [x]` |
| 16 | P2 | AiSidebarView icon-only a11y | `- [x]` |
| 17 | P2 | 属性面板 / Prompt 模板加载失败可见 | `- [x]` |
| 18 | P2 | 批量删除部分失败反馈 | `- [x]` |
| 14 | P3 | 跟踪项（不实施） | 仅登记 |

## 收口说明（T15 补强）

- `buildSharedConversationUrl` 对齐 `BASE_URL` / `VITE_ROUTE_BASE`（修掉硬编码 `/ai/shared/`）
- `request({ public: true })`：401 不跳登录，分享页展示错误 + 重试
- 适配服务端分享载荷（无 `title` 字段时从首条用户消息推导）
- 单测：`shareUrl.spec` / `SharedConversationView.spec` / `request.public.spec`

## 跨项目已知限制

生产环境 `server` 对 `/api/ai` 全局 `apiOrJwtAuthMiddleware`，匿名无痕访问分享 API 仍会 401。  
前端已不误跳登录；**真正免登录分享**需切到 server 仓对 `GET /conversations/shared/:shareId` 豁免鉴权。

## 评分

| 维度 | 分 | 说明 |
|------|----|------|
| 整体 UX | **A** | M1–M5 行为/反馈/分享路由闭环 |
| 可访问性 | **A-** | 主路径 aria 齐；P3 移动端/裸 hex 仍跟踪 |
| 生产可用性 | **A** | 桌面优先；无开放 P0/P1 |

P3（移动端 / 裸 hex / Debug 确认等）不阻塞 A，见 Task 14 登记。
