/**
 * 工作流 Open API 调用示例生成
 *
 * 从 slug/url/key/message 生成 curl / JavaScript / Python 三方集成代码示例。
 * 抽出为纯函数便于单测，视图只做渲染。
 *
 * 转义规则（按语言）：
 * - curl：JSON body 放在 shell 单引号内，单引号 -> '\''（shell 标准转义）
 * - JavaScript：消息在 JS 单引号字符串内，单引号 -> \'，反斜杠 -> \\
 * - Python：消息在 Python 单引号字符串内，同 JS 转义
 */

export interface InvokeExampleOpts {
  /** 完整调用 URL，如 https://host/schema-platform/api/ai/workflows/invoke/my-slug */
  url: string
  /** X-Workflow-Key；为空时用占位符 <YOUR_WORKFLOW_KEY> */
  invokeKey: string
  /** input.message 内容 */
  message: string
}

export interface InvokeCodeExamples {
  curl: string
  javascript: string
  python: string
}

/** shell 单引号转义：' -> '\'' */
function escapeShellSingle(s: string): string {
  return s.replace(/'/g, "'\\''")
}

/** JS/Python 单引号字符串转义：\ -> \\，' -> \' */
function escapeSingleQuotedString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function buildInvokeCodeExamples(opts: InvokeExampleOpts): InvokeCodeExamples {
  const { url, invokeKey, message } = opts
  const key = invokeKey || '<YOUR_WORKFLOW_KEY>'
  const body = JSON.stringify({ input: { message } })
  const bodyShellEsc = escapeShellSingle(body)
  const msgStr = escapeSingleQuotedString(message)

  return {
    curl: `curl -X POST '${url}' \\
  -H 'X-Workflow-Key: ${key}' \\
  -H 'Content-Type: application/json' \\
  -d '${bodyShellEsc}'`,
    javascript: `const res = await fetch('${url}', {
  method: 'POST',
  headers: {
    'X-Workflow-Key': '${key}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ input: { message: '${msgStr}' } }),
});
const data = await res.json();
console.log(data.data.executionId);`,
    python: `import requests

res = requests.post(
    '${url}',
    headers={'X-Workflow-Key': '${key}', 'Content-Type': 'application/json'},
    json={'input': {'message': '${msgStr}'}},
)
data = res.json()
print(data['data']['executionId'])`,
  }
}
