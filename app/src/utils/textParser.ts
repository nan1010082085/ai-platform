/**
 * 文本解析工具 — 从 AiMessage.vue 提取
 *
 * 将 Markdown 内容拆分为文字和代码块两部分，
 * 识别 ```json ... ``` 格式和 <schema>...</schema> 标签，
 * 过滤 <schema> 标签后的多余总结文本。
 */

export interface TextPart {
  type: 'text' | 'code'
  content: string
  language?: string
}

/**
 * 判断文本是否是 LLM 输出的多余总结性内容
 * 匹配 <schema> 标签后常见的总结模式
 */
function isRedundantSummary(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  const patterns = [
    /^(好的|已|我|现在|以上|这就是|这是|根据|基于)/,
    /^(表单|流程|Schema|JSON|数据)\s*(已|已经|已生成|已创建|已更新)/,
    /已(生成|创建|更新|完成|应用)(好|了)?/,
    /以上(就是|是)/,
    /请(查看|确认|检查|参考)/,
    /希望(这|这个)/,
  ]
  return trimmed.length < 100 && patterns.some(p => p.test(trimmed))
}

/**
 * 将 Markdown 内容拆分为文字和代码块两部分
 * 识别 ```json ... ``` 格式和 <schema>...</schema> 标签
 * 过滤 <schema> 标签后的多余总结文本
 */
export function splitTextAndCodeBlocks(content: string): TextPart[] {
  const parts: TextPart[] = []

  const blockRegex = /(<schema>[\s\S]*?<\/schema>|```(\w+)?\n([\s\S]*?)```)/g
  let lastIndex = 0
  let match
  let hasSchemaTag = false

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index)
      if (textBefore.trim()) {
        parts.push({ type: 'text', content: textBefore })
      }
    }

    const fullMatch = match[0]

    if (fullMatch.startsWith('<schema>')) {
      const jsonContent = fullMatch.replace(/<\/?schema>/g, '').trim()
      parts.push({ type: 'code', content: jsonContent, language: 'json' })
      hasSchemaTag = true
    } else {
      const language = match[2] || 'json'
      const codeContent = match[3].trim()
      parts.push({ type: 'code', content: codeContent, language })
    }

    lastIndex = match.index + fullMatch.length
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex)
    if (remaining.trim()) {
      if (hasSchemaTag && isRedundantSummary(remaining)) {
        // 过滤掉多余总结文本
      } else {
        parts.push({ type: 'text', content: remaining })
      }
    }
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content })
  }

  return parts
}
