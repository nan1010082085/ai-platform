/**
 * 平台领域工具（workflow-as-tool 的 v0 形态）：
 *
 * - platform_echo：平台连通性验证工具，Agent 可自主调用（POC 验收链路用）。
 * - platform_workflow_invoke：把平台已发布的 Agent Workflow 包装为 DSH 工具，
 *   Agent 在推理中自主决定何时调用确定性流水线。仅在配置 workflowBaseUrl
 *   （或环境变量 PLATFORM_WORKFLOW_BASE_URL）时注册。
 *
 * 心智模型：插件（本文件）是静态代码；工具（registry 数据）由插件动态注册；
 * workflow 永远是数据，不是插件。
 */

import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'ai-harness-platform-tools'

export const inject = ['tools']

export function apply(ctx, config = {}) {
  const disposers = []

  disposers.push(ctx.tools.register(defineTool({
    name: 'platform_echo',
    description: '平台连通性验证工具：原样返回输入消息与时间戳。用于验证 harness 与平台链路。',
    parameters: {
      message: { type: 'string', required: true, description: '要回显的消息' },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      void exec
      return { echoed: args.message, at: new Date().toISOString() }
    },
  })))

  const baseUrl = (config.workflowBaseUrl ?? process.env.PLATFORM_WORKFLOW_BASE_URL ?? '').replace(/\/$/, '')
  if (baseUrl !== '') {
    const pathTemplate = config.workflowPathTemplate ?? '/ai/agent-workflows/{workflowId}/execute'
    disposers.push(ctx.tools.register(defineTool({
      name: 'platform_workflow_invoke',
      description: '调用平台已发布的 Agent Workflow（确定性流水线），返回执行结果 JSON。',
      parameters: {
        workflowId: { type: 'string', required: true, description: '已发布的 workflow id' },
        input: { type: 'object', additionalProperties: true, description: 'workflow 输入（如 { message: ... }）' },
      },
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      },
      async execute(args, exec) {
        const path = pathTemplate.replace('{workflowId}', encodeURIComponent(args.workflowId))
        const resp = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(args.input ?? {}),
          signal: exec.signal,
        })
        const text = await resp.text()
        let value
        try {
          value = JSON.parse(text)
        } catch {
          value = { raw: text }
        }
        if (!resp.ok) {
          const err = new Error(`workflow ${args.workflowId} failed: HTTP ${resp.status}`)
          err.cause = value
          throw err
        }
        return value
      },
    })))
  }

  return () => {
    for (const dispose of disposers.splice(0).reverse()) dispose()
  }
}
