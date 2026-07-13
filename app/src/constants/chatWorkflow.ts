/** 对话设置中「未选编排」时的预设值（走 LangGraph 多 Agent，非 Workflow DAG） */
export const DEFAULT_CHAT_WORKFLOW_ID = null

export const DEFAULT_CHAT_WORKFLOW_LABEL = '默认（LangGraph 多 Agent 对话）'

export const DEFAULT_CHAT_WORKFLOW_HINT =
  '未选择已发布编排时，发送消息走 LangGraph 多 Agent 协作（路由 → 专家 → 工具循环）。'
