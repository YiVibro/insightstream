import { create } from 'zustand';
import type { ChatMessage, ChatMode, Citation } from '@/lib/types';

interface ChatState {
  messages: ChatMessage[];
  mode: ChatMode;
  selectedModel: string;
  isStreaming: boolean;
  setMode: (mode: ChatMode) => void;
  setSelectedModel: (model: string) => void;
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  mode: 'agentic',
  selectedModel: 'groq-llama-3',
  isStreaming: false,

  setMode: (mode) => set({ mode }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  clearMessages: () => set({ messages: [] }),
}));

/** Generates a citation-like chip label, e.g. "Page 4, Chunk 2". */
export function citationLabel(c: Citation): string {
  return `Page ${c.page}, Chunk ${c.chunk}`;
}
