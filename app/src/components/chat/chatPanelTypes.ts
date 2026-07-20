import type { StarterPrompt } from '@/stores/chatConfig'
import type {
  AIMessage,
  AgentType,
  TaskChainStep,
  StreamConnectionStatus,
  MentionReference,
  RagSearchResult,
  MessageDocumentAttachment,
} from '@/types'

export interface AiChatPanelProps {
  title: string
  agent: AgentType
  messages: AIMessage[]
  loading?: boolean
  disabled?: boolean
  agentOptions?: Array<{ value: AgentType; label: string }>
  taskChain?: TaskChainStep[]
  taskChainIndex?: number
  streamStatus?: StreamConnectionStatus
  retryCount?: number
  maxRetries?: number
  ragSearchResults?: RagSearchResult[]
  ragSearching?: boolean
  ragContext?: RagSearchResult[]
  requirementInputPlaceholder?: string
  starterPrompts?: StarterPrompt[]
}

export const AI_CHAT_PANEL_DEFAULTS = {
  agentOptions: () => [
    { value: 'auto' as AgentType, label: 'Auto' },
    { value: 'editor' as AgentType, label: 'Editor' },
    { value: 'flow' as AgentType, label: 'Flow' },
  ],
  streamStatus: 'idle' as StreamConnectionStatus,
  retryCount: 0,
  maxRetries: 3,
  ragSearchResults: () => [] as RagSearchResult[],
  ragSearching: false,
  ragContext: () => [] as RagSearchResult[],
  requirementInputPlaceholder: '',
  starterPrompts: () => [] as StarterPrompt[],
}

export type AiChatPanelEmits = {
  send: [message: string, agent: AgentType, mentions?: MentionReference[], attachments?: MessageDocumentAttachment[]]
  stop: []
  retry: []
  'clear-messages': []
  'card-primary-action': [messageIndex: number, cardIndex: number]
  'card-secondary-action': [messageIndex: number, cardIndex: number]
  'open-settings': []
  'rag-search': [query: string]
  'rag-select': [item: RagSearchResult]
  'rag-remove': [id: string]
  'open-json-drawer': []
  'retry-tool': [messageIndex: number, toolCallIndex: number]
  'copy-message': [messageIndex: number]
  'regenerate-message': [messageIndex: number]
  'message-feedback': [messageIndex: number, type: 'positive' | 'negative']
  'requirement-confirm': [answers: Record<string, string>]
  'requirement-answer': [questionId: string, value: string]
  'requirement-skip': []
  'suggestion-accept': [id: string]
  'suggestion-dismiss': [id: string]
}
