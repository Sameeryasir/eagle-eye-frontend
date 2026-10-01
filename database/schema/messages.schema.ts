// Single shared chat cache table (Nest/Node-style), keyed by conversation_id.
// Replaces legacy per-chat tables: messages_<id>

export const CHAT_MESSAGES_TABLE = "chat_messages";

export const createChatMessagesTableSQL = (): string => `
  CREATE TABLE IF NOT EXISTS ${CHAT_MESSAGES_TABLE} (
    id INTEGER PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL,
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

export const createChatMessagesIndexesSQL = (): string[] => [
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
    ON ${CHAT_MESSAGES_TABLE} (conversation_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_signature
    ON ${CHAT_MESSAGES_TABLE} (signature_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_status
    ON ${CHAT_MESSAGES_TABLE} (conversation_id, status)`,
];

/** Digits-only conversation id for queries / legacy table migration. */
export function sanitizeConversationId(conversationId: string | number): string {
  const raw = String(conversationId ?? "").trim();
  const safe = raw.replace(/[^0-9]/g, "");
  if (!safe) {
    throw new Error("Invalid conversation id for local message cache");
  }
  return safe;
}

/** @deprecated Legacy per-chat table name — used only during one-time migration */
export const getMessagesTableName = (conversationId: string | number): string => {
  return `messages_${sanitizeConversationId(conversationId)}`;
};

/** @deprecated */
export const createMessagesTableSQL = (conversationId: string | number): string => {
  return createChatMessagesTableSQL();
};

/** @deprecated no-op aliases kept for old imports */
export const addStatusColumnSQL = (_conversationId?: string | number): string => {
  return `SELECT 1`;
};
export const addConversationIdColumnSQL = (_conversationId?: string | number): string => {
  return `SELECT 1`;
};
export const addSignatureColumnsSQL = (_conversationId?: string | number): string[] => {
  return [];
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
