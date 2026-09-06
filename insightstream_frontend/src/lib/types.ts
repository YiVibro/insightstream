export type DocumentStatus = 'processed' | 'parsing' | 'failed';

export type ChatMode = 'standard' | 'agentic';

export type MessageRole = 'user' | 'assistant' | 'thinking';

export interface Citation {
  id: string;
  documentId: string;
  documentTitle: string;
  page: number;
  chunk: number;
  excerpt: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  citations?: Citation[];
  thinkingSteps?: string[];
  mode?: ChatMode;
  model?: string;
  createdAt: number;
}

export interface KnowledgeDocument {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_size: number;
  page_count: number;
  status: DocumentStatus;
  storage_path: string;
  created_at: string;
}

export interface ModelOption {
  id: string;
  label: string;
  description: string;
  badge?: string;
}

export const MODELS: ModelOption[] = [
  {
    id: 'groq-llama-3',
    label: 'Groq Llama-3',
    description: 'Ultra-fast inference, 70B params',
    badge: 'Fast',
  },
  {
    id: 'fast-rag',
    label: 'Fast RAG',
    description: 'Optimized vector retrieval + summarization',
    badge: 'Balanced',
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    description: 'Compact reasoning, good cost/quality',
  },
  {
    id: 'claude-haiku',
    label: 'Claude 3 Haiku',
    description: 'Long-context analysis',
  },
];
