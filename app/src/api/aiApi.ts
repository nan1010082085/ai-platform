/**
 * AI API 客户端（barrel 入口）
 *
 * 实现已按域拆分到 ./aiApi/ 子目录：
 * - base: 错误类型、认证 helpers、原始 fetch
 * - conversation: 对话 CRUD、发布、搜索、版本、反馈
 * - document: 文档上传、预览、摘要、图片分析
 * - monitor: Agent/插件监控指标
 * - rag: 语义搜索、知识库管理、mention
 * - llm: 供应商、用量、模型配置、引导词、健康检查
 *
 * 本文件仅 re-export，保持 `@/api/aiApi` 导入路径不变（60+ 文件零迁移）。
 *
 * Chat 流式对话走 WebSocket（stream store -> chat:send / chat:event），不在此模块。
 */

export * from './aiApi/base'
export * from './aiApi/conversation'
export * from './aiApi/document'
export * from './aiApi/monitor'
export * from './aiApi/rag'
export * from './aiApi/llm'
