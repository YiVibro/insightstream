import { api } from './api';
import { type Citation } from '@/lib/types';

export async function sendChatMessage({
  query,
  documentIds,
  userId,
}: {
  query: string;
  userId?: string;
  documentIds?: string[];
}): Promise<{ content: string; citations: Citation[] }> {
    try {
        const response = await api.post('/chat', { query, document_ids: documentIds, userId });
        return {
            content: response.data.answer || response.data.content,
            citations: response.data.sources || response.data.citations || [],
        };
    } catch (error) {
        console.error('Error sending chat message:', error);
        throw new Error('Failed to send chat message');
    }
}