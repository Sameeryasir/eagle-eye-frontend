import type { Id } from '../types';

export interface Conversation {
  id: number;
  type?: string;
  name?: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  id?: number;
  conversation_id?: number;
  content?: string | null;
  file_uri?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  sender_id?: number;
  created_at?: string;
  status?: string;
  [key: string]: unknown;
}

export interface SendMessagePayload {
  conversationId?: Id;
  content?: string;
  [key: string]: unknown;
}

export interface CreateSignaturePayload {
  conversationId: number;
  title?: string;
  notes?: string;
  dueDate?: string;
}

export interface SubmitSignatureFile {
  uri: string;
  type?: string;
  fileName?: string;
  name?: string;
}
