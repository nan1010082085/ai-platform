import type { AgentNodeRecord, AgentNodeType, AgentWorkflowNodeData } from '@/types/agentWorkflow'
import { getToolDisplayLabel } from '@schema-platform/platform-shared/ai/toolNames'
import { getToolNodeCategoryLabel } from '@/constants/toolNodeTypes'

export type PreviewTone = 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger'

export interface AgentNodePreviewRow {
  key: string
  label: string
  value: string
  tone?: PreviewTone
}

export interface AgentNodePreviewSections {
  config: AgentNodePreviewRow[]
  runtime: AgentNodePreviewRow[]
}

const STATUS_LABELS: Record<string, string> = {
  pending: '等待',
  running: '执行中',
  success: '成功',
  error: '失败',
  skipped: '跳过',
  waiting: '待确认',
}

export function truncateText(text: string, max = 72): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1)}…`
}

export function formatPreviewValue(value: unknown, max = 72): string {
  if (value == null) return '—'
  if (typeof value === 'string') return truncateText(value, max) || '—'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return truncateText(JSON.stringify(value), max)
  } catch {
    return '—'
  }
}

function documentSourcePreviewLabel(data: AgentWorkflowNodeData): string {
  if (data.documentSource === 'documentId') return '平台固定 ID'
  if (data.documentSource === 'inputField') return `平台字段 ${data.inputField ?? 'documentId'}`
  if (data.documentSource === 'api') {
    const url = data.fetchUrl?.trim()
    return url ? `查询接口 ${truncateText(url, 48)}` : '查询接口（未配置）'
  }
  return `上传流 ${data.streamField ?? 'file'}`
}

export function hasMeaningfulPreviewValue(value: string): boolean {
  const normalized = value.trim()
  return normalized !== '' && normalized !== '—'
}

function summarizeRuntimePayload(payload: unknown): string {
  if (payload == null) return '—'
  if (typeof payload === 'object' && payload !== null) {
    const obj = payload as Record<string, unknown>
    if (obj.text != null) return formatPreviewValue(obj.text, 96)
    if (obj.message != null) return formatPreviewValue(obj.message, 96)
    if (obj.result != null) return formatPreviewValue(obj.result, 96)
    if (obj.tool != null) return formatPreviewValue(obj.tool, 48)
    if (obj.agent != null) return formatPreviewValue(obj.agent, 48)
  }
  return formatPreviewValue(payload, 96)
}

function extractRuntimeInput(record: AgentNodeRecord): string {
  const input = record.input as Record<string, unknown> | undefined
  if (!input) return '—'
  if (input.input != null) return summarizeRuntimePayload(input.input)
  if (input.lastOutput != null) return summarizeRuntimePayload(input.lastOutput)
  return summarizeRuntimePayload(input)
}

function extractRuntimeOutput(record: AgentNodeRecord): string {
  if (record.error) return record.error
  return summarizeRuntimePayload(record.output)
}

export function getAgentNodePreviewSections(
  nodeType: AgentNodeType,
  data: AgentWorkflowNodeData,
  record?: AgentNodeRecord | null,
): AgentNodePreviewSections {
  const config: AgentNodePreviewRow[] = []
  const runtime: AgentNodePreviewRow[] = []

  switch (nodeType) {
    case 'manual-trigger':
      config.push({ key: 'call', label: '调用', value: '手动启动', tone: 'primary' })
      break
    case 'webhook-trigger':
      config.push(
        { key: 'call', label: '调用', value: 'Webhook', tone: 'primary' },
        {
          key: 'path',
          label: '路径',
          value: formatPreviewValue(data.webhookPath?.trim() || '/hook'),
          tone: 'muted',
        },
        {
          key: 'method',
          label: '方法',
          value: data.webhookMethod ?? 'POST',
          tone: 'muted',
        },
      )
      break
    case 'document-parse':
      config.push(
        { key: 'call', label: '调用', value: '文档解析', tone: 'primary' },
        {
          key: 'source',
          label: '来源',
          value: documentSourcePreviewLabel(data),
          tone: 'muted',
        },
      )
      if (data.documentSource === 'documentId' && data.documentId?.trim()) {
        config.push({
          key: 'documentId',
          label: '文档 ID',
          value: formatPreviewValue(data.documentId),
          tone: 'default',
        })
      }
      break
    case 'vision-analyze':
      config.push(
        { key: 'call', label: '调用', value: '图片视觉分析', tone: 'primary' },
        {
          key: 'source',
          label: '来源',
          value: documentSourcePreviewLabel(data),
          tone: 'muted',
        },
      )
      if (data.visionPrompt?.trim()) {
        config.push({
          key: 'visionPrompt',
          label: 'Prompt',
          value: formatPreviewValue(data.visionPrompt),
          tone: 'default',
        })
      }
      break
    case 'audio-transcribe':
      config.push(
        { key: 'call', label: '调用', value: '音频转录', tone: 'primary' },
        {
          key: 'source',
          label: '来源',
          value: documentSourcePreviewLabel(data),
          tone: 'muted',
        },
      )
      {
        const lang = data.language ?? 'zh'
        const langLabel = lang === 'zh' ? '中文' : lang === 'en' ? '英文' : lang === 'auto' ? '自动' : lang
        config.push({ key: 'language', label: '语言', value: langLabel, tone: 'default' })
      }
      break
    case 'video-analyze':
      config.push(
        { key: 'call', label: '调用', value: '视频分析', tone: 'primary' },
        {
          key: 'source',
          label: '来源',
          value: documentSourcePreviewLabel(data),
          tone: 'muted',
        },
      )
      if (data.visionPrompt?.trim()) {
        config.push({
          key: 'visionPrompt',
          label: 'Prompt',
          value: formatPreviewValue(data.visionPrompt),
          tone: 'default',
        })
      }
      {
        const frames = data.maxFrames ?? 10
        config.push({ key: 'maxFrames', label: '最大帧数', value: String(frames), tone: 'default' })
      }
      break
    case 'conversation-memory':
      config.push(
        { key: 'call', label: '调用', value: '对话记忆', tone: 'primary' },
        {
          key: 'mode',
          label: '模式',
          value: data.memoryMode === 'reset' ? '清空' : data.memoryMode === 'read' ? '读取' : '追加',
          tone: 'muted',
        },
      )
      if (data.memoryMode === 'append') {
        config.push({
          key: 'role',
          label: '角色',
          value: data.memoryRole === 'assistant' ? '助手' : '用户',
          tone: 'muted',
        })
      }
      break
    case 'llm':
      config.push(
        { key: 'model', label: '模型', value: data.model?.trim() || 'default', tone: 'primary' },
        { key: 'prompt', label: 'Prompt', value: formatPreviewValue(data.prompt?.trim() || '{{$json}}'), tone: 'default' },
      )
      if (data.useConversationHistory) {
        config.push({
          key: 'memory',
          label: '记忆',
          value: `启用 · ${data.maxHistoryTurns ?? 20} 轮`,
          tone: 'primary',
        })
      }
      if (data.systemPrompt?.trim()) {
        config.push({
          key: 'system',
          label: '系统',
          value: formatPreviewValue(data.systemPrompt),
          tone: 'muted',
        })
      }
      config.push({ key: 'call', label: '调用', value: 'LLM 推理', tone: 'primary' })
      break
    case 'agent-intent':
      config.push({
        key: 'call',
        label: '调用',
        value: '意图识别 → 自动路由',
        tone: 'primary',
      })
      if (data.prompt?.trim()) {
        config.push({
          key: 'prompt',
          label: '指令',
          value: formatPreviewValue(data.prompt),
          tone: 'default',
        })
      }
      break
    case 'expert': {
      const expertId = data.expertId?.trim()
      config.push({
        key: 'call',
        label: '调用',
        value: expertId ? `专家 ${expertId}` : '未选择专家',
        tone: expertId ? 'primary' : 'warning',
      })
      if (data.prompt?.trim()) {
        config.push({
          key: 'prompt',
          label: '指令',
          value: formatPreviewValue(data.prompt),
          tone: 'default',
        })
      }
      break
    }
    case 'tool': {
      const categoryLabel = getToolNodeCategoryLabel(nodeType, data)
      if (categoryLabel) {
        config.push({
          key: 'category',
          label: '类型',
          value: categoryLabel,
          tone: 'muted',
        })
      }
      const toolName = data.toolName?.trim()
      config.push({
        key: 'call',
        label: '调用',
        value: toolName ? getToolDisplayLabel(toolName) : '未配置工具',
        tone: toolName ? 'primary' : 'warning',
      })
      if (toolName) {
        config.push({
          key: 'tool',
          label: '工具名',
          value: toolName,
          tone: 'default',
        })
      }
      if (data.toolArgs && Object.keys(data.toolArgs).length > 0) {
        config.push({
          key: 'args',
          label: '参数',
          value: formatPreviewValue(data.toolArgs),
          tone: 'default',
        })
      }
      break
    }
    case 'if':
      config.push({
        key: 'call',
        label: '调用',
        value: formatPreviewValue(data.expression?.trim() || 'true'),
        tone: 'primary',
      })
      break
    case 'hitl':
      config.push(
        { key: 'call', label: '调用', value: '人工确认', tone: 'warning' },
        {
          key: 'confirm',
          label: '提示',
          value: formatPreviewValue(data.confirmMessage?.trim() || '请确认是否继续'),
          tone: 'default',
        },
      )
      if (Array.isArray(data.confirmQuestions) && data.confirmQuestions.length > 0) {
        config.push({
          key: 'questions',
          label: '问题',
          value: `${data.confirmQuestions.length} 项`,
          tone: 'primary',
        })
      } else if (data.inheritUpstreamQuestions !== false) {
        config.push({
          key: 'inherit',
          label: '问题',
          value: '继承上游 confirmQuestions',
          tone: 'muted',
        })
      }
      break
    case 'agent-loop': {
      const tools = Array.isArray(data.agentLoopTools) ? data.agentLoopTools : []
      config.push({
        key: 'loop-model',
        label: '模型',
        value: data.model?.trim() || 'default',
        tone: 'primary',
      })
      config.push({
        key: 'loop-max',
        label: '最大迭代',
        value: String(data.agentLoopMaxIterations ?? 8),
        tone: 'default',
      })
      config.push({
        key: 'loop-tools',
        label: '可用工具',
        value: tools.length > 0 ? tools.join(', ') : '未配置',
        tone: tools.length > 0 ? 'default' : 'warning',
      })
      if (record?.output && typeof record.output === 'object') {
        const out = record.output as Record<string, unknown>
        if (typeof out.iterations === 'number') {
          runtime.push({
            key: 'loop-iterations',
            label: '实际迭代',
            value: String(out.iterations),
            tone: 'primary',
          })
        }
        if (typeof out.toolInvocations === 'number') {
          runtime.push({
            key: 'loop-tools-count',
            label: '工具调用',
            value: `${out.toolInvocations} 次`,
            tone: 'muted',
          })
        }
      }
      break
    }
    case 'code-execute': {
      const lang = data.codeLanguage ?? 'javascript'
      const script = data.codeScript ?? ''
      config.push({
        key: 'code-lang',
        label: '语言',
        value: lang,
        tone: 'primary',
      })
      config.push({
        key: 'code-lines',
        label: '代码行数',
        value: String(script.split('\n').length),
        tone: 'muted',
      })
      if (record?.output && typeof record.output === 'object') {
        const out = record.output as Record<string, unknown>
        if ('result' in out || 'error' in out) {
          runtime.push({
            key: 'code-result',
            label: '输出',
            value: JSON.stringify(out, null, 2).slice(0, 500),
            tone: 'error' in out ? 'danger' : 'success',
          })
        }
      }
      break
    }
    case 'variable-set': {
      config.push({
        key: 'var-name',
        label: '变量名',
        value: data.variableName ?? '',
        tone: 'primary',
      })
      config.push({
        key: 'var-value',
        label: '变量值',
        value: data.variableValue ?? '',
        tone: 'muted',
      })
      config.push({
        key: 'var-mode',
        label: '模式',
        value: data.variableMode ?? 'set',
        tone: 'default',
      })
      if (record?.output && typeof record.output === 'object') {
        const out = record.output as Record<string, unknown>
        if ('value' in out) {
          runtime.push({
            key: 'var-result',
            label: '结果',
            value: JSON.stringify(out.value),
            tone: 'success',
          })
        }
      }
      break
    }
    case 'switch': {
      const branches = (data.switchBranches ?? []) as Array<{ label: string; expression: string }>
      config.push({
        key: 'switch-count',
        label: '分支数',
        value: String(branches.length),
        tone: 'primary',
      })
      branches.forEach((b, i) => {
        config.push({
          key: `switch-${i}`,
          label: b.label || `分支${i + 1}`,
          value: b.expression || '',
          tone: 'muted',
        })
      })
      if (record?.output && typeof record.output === 'object') {
        const out = record.output as Record<string, unknown>
        if ('branch' in out) {
          runtime.push({
            key: 'switch-taken',
            label: '匹配分支',
            value: String(out.branch),
            tone: 'primary',
          })
        }
      }
      break
    }
    case 'end':
      break
  }

  if (record) {
    runtime.push({
      key: 'status',
      label: '状态',
      value: STATUS_LABELS[record.status] ?? record.status,
      tone:
        record.status === 'success'
          ? 'success'
          : record.status === 'error'
            ? 'danger'
            : record.status === 'waiting'
              ? 'warning'
              : record.status === 'running'
                ? 'primary'
                : 'default',
    })
    if (record.durationMs != null) {
      runtime.push({
        key: 'duration',
        label: '耗时',
        value: record.durationMs < 1000 ? `${record.durationMs}ms` : `${(record.durationMs / 1000).toFixed(2)}s`,
        tone: 'muted',
      })
    }
    const runtimeInput = extractRuntimeInput(record)
    if (hasMeaningfulPreviewValue(runtimeInput)) {
      runtime.push({ key: 'rt-input', label: '输入', value: runtimeInput, tone: 'default' })
    }
    const runtimeOutput = extractRuntimeOutput(record)
    if (hasMeaningfulPreviewValue(runtimeOutput)) {
      runtime.push({
        key: 'rt-output',
        label: '输出',
        value: runtimeOutput,
        tone: record.error ? 'danger' : record.status === 'success' ? 'success' : 'default',
      })
    }
  }

  return { config, runtime }
}

export function getAgentNodeStatusLabel(record?: AgentNodeRecord | null): string | null {
  if (!record) return null
  return STATUS_LABELS[record.status] ?? record.status
}
