export type ChatAuthor = 'customer' | 'assistant' | 'agent' | 'system'

export interface ChatMessage {
  id: string
  author: ChatAuthor
  body: string
  createdAt: string
  /** Products the assistant referenced, rendered as inline cards */
  productIds?: string[]
  /** Quick-reply chips offered alongside the message */
  suggestions?: string[]
}

export type ChatSessionStatus = 'bot' | 'escalation_requested' | 'with_agent' | 'closed'

export interface ChatSession {
  id: string
  status: ChatSessionStatus
  messages: ChatMessage[]
  startedAt: string
  customerId: string | null
}

export interface AssistantReply {
  body: string
  productIds?: string[]
  suggestions?: string[]
  shouldEscalate?: boolean
}

/**
 * Swap the implementation, not the widget. Today: a catalog-aware local
 * responder. Tomorrow: a Supabase Edge Function calling a model with the
 * live product table as context.
 */
export interface AssistantProvider {
  readonly name: string
  reply(input: { message: string; history: ChatMessage[] }): Promise<AssistantReply>
}
