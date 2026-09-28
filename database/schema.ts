// @ts-nocheck
export const createMessagesTableSQL = (conversationId: string): string => {
  return `
    CREATE TABLE IF NOT EXISTS messages_${conversationId} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT,
      content TEXT,
      file_uri TEXT,
      file_name TEXT,
      file_type TEXT,
      file_size INTEGER,
      sender_id TEXT,
      sender_first_name TEXT,
      sender_last_name TEXT,
      created_at TEXT,
      status TEXT DEFAULT 'sent',
      signature_id INTEGER,
      signature_title TEXT,
      signature_notes TEXT,
      signature_due_date TEXT,
      signature_status TEXT,
      signature_file_url TEXT,
      signature_file_name TEXT,
      signature_file_size INTEGER,
      signed_by_id TEXT,
      signed_by_name TEXT,
      signed_by_email TEXT
    )
  `;
};

export const addStatusColumnSQL = (conversationId: string): string => {
  return `ALTER TABLE messages_${conversationId} ADD COLUMN status TEXT DEFAULT 'sent'`;
};

export const addConversationIdColumnSQL = (conversationId: string): string => {
  return `ALTER TABLE messages_${conversationId} ADD COLUMN conversation_id TEXT`;
};

export const addSignatureColumnsSQL = (conversationId: string): string[] => {
  return [
    `ALTER TABLE messages_${conversationId} ADD COLUMN signature_id INTEGER`,
    `ALTER TABLE messages_${conversationId} ADD COLUMN signature_title TEXT`,
    `ALTER TABLE messages_${conversationId} ADD COLUMN signature_notes TEXT`,
    `ALTER TABLE messages_${conversationId} ADD COLUMN signature_due_date TEXT`,
    `ALTER TABLE messages_${conversationId} ADD COLUMN signature_status TEXT`,
    `ALTER TABLE messages_${conversationId} ADD COLUMN signature_file_url TEXT`,
    `ALTER TABLE messages_${conversationId} ADD COLUMN signature_file_name TEXT`,
    `ALTER TABLE messages_${conversationId} ADD COLUMN signature_file_size INTEGER`,
    `ALTER TABLE messages_${conversationId} ADD COLUMN signed_by_id TEXT`,
    `ALTER TABLE messages_${conversationId} ADD COLUMN signed_by_name TEXT`,
    `ALTER TABLE messages_${conversationId} ADD COLUMN signed_by_email TEXT`,
  ];
};

export interface MessageRow {
  id?: number;
  conversation_id?: string;
  content?: string;
  file_uri?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  sender_id?: string;
  sender_first_name?: string;
  sender_last_name?: string;
  created_at?: string;
  status?: string;
  signature_id?: number;
  signature_title?: string;
  signature_notes?: string;
  signature_due_date?: string;
  signature_status?: string;
  signature_file_url?: string;
  signature_file_name?: string;
  signature_file_size?: number;
  signed_by_id?: string;
  signed_by_name?: string;
  signed_by_email?: string;
}

export const getMessagesTableName = (conversationId: string): string => {
  return `messages_${conversationId}`;
};

