// @ts-nocheck
import { SQLiteDatabase } from "expo-sqlite";
import { MessageRow } from "../schema/messages.schema";
import { MessageRepository } from "./message.repository";
import type { MessageData, SignatureFieldUpdate } from "./message.types";

export type { MessageData, SignatureFieldUpdate } from "./message.types";
export type { MessageRow } from "../schema/messages.schema";

export const mapMessageRowToUi = (row: MessageRow) => {
  return {
    id: row.id,
    content: row.content ?? null,
    fileUrl: row.file_uri ?? null,
    fileName: row.file_name ?? null,
    fileType: row.file_type ?? null,
    fileSize: row.file_size ?? null,
    createdAt: row.created_at,
    status: row.status || "sent",
    conversation_id: row.conversation_id,
    sender: {
      id: row.sender_id,
      first_name: row.sender_first_name,
      last_name: row.sender_last_name,
    },
    signature: row.signature_id
      ? {
          id: row.signature_id,
          title: row.signature_title,
          notes: row.signature_notes,
          dueDate: row.signature_due_date,
          status: row.signature_status,
          fileUrl: row.signature_file_url,
          fileName: row.signature_file_name,
          fileSize: row.signature_file_size,
          signedBy: row.signed_by_id
            ? {
                id: row.signed_by_id,
                name: row.signed_by_name,
                email: row.signed_by_email,
              }
            : null,
        }
      : null,
  };
};

export const loadCachedMessagesPage = (
  db: SQLiteDatabase,
  conversationId: string | number,
  limit = 20,
  offset = 0
) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const rows = getAllMessagesFromSQLite(
    db,
    String(conversationId),
    safeLimit,
    safeOffset
  );
  return rows.map(mapMessageRowToUi);
};

export const messageExistsInSQLite = (
  db: SQLiteDatabase,
  messageId: string | number,
  conversationId: string
): boolean => {
  try {
    return MessageRepository.exists(db, messageId, conversationId);
  } catch (error) {
    console.error("❌ Error checking message existence:", error);
    return false;
  }
};

export const saveMessageToSQLite = (
  db: SQLiteDatabase,
  msg: MessageData,
  conversationId: string,
  _logLabel: string = "DEFAULT",
  _logSkips: boolean = true
): void => {
  try {
    MessageRepository.ensureTable(db, conversationId);
    if (MessageRepository.exists(db, msg.id, conversationId)) {
      return;
    }
    MessageRepository.insert(db, msg, conversationId);
  } catch (dbError) {
    console.error("❌ Error saving message to database:", dbError);
    throw dbError;
  }
};

export const saveMessagesBatchToSQLite = (
  db: SQLiteDatabase,
  messages: MessageData[],
  conversationId: string,
  logLabel: string = "BATCH"
): void => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return;
  }

  try {
    MessageRepository.ensureTable(db, conversationId);
    const messagesToInsert = messages.filter(
      (message) => !MessageRepository.exists(db, message.id, conversationId)
    );

    if (messagesToInsert.length === 0) {
      return;
    }

    MessageRepository.begin(db);
    messagesToInsert.forEach((message) => {
      MessageRepository.insert(db, message, conversationId);
    });
    MessageRepository.commit(db);
  } catch (transactionError) {
    console.error(`❌ [${logLabel}] Failed to persist message batch:`, transactionError);
    try {
      MessageRepository.rollback(db);
    } catch (rollbackError) {
      console.error(`❌ [${logLabel}] Failed to rollback batch transaction:`, rollbackError);
    }
    throw transactionError;
  }
};

export const getMessageFromSQLite = (
  db: SQLiteDatabase,
  messageId: string | number,
  conversationId: string
): MessageRow | null => {
  try {
    return MessageRepository.findById(db, messageId, conversationId);
  } catch (error) {
    console.error("❌ Error getting message from database:", error);
    return null;
  }
};

export const getAllMessagesFromSQLite = (
  db: SQLiteDatabase,
  conversationId: string,
  limit?: number,
  offset?: number
): MessageRow[] => {
  try {
    return MessageRepository.findMany(db, conversationId, { limit, offset });
  } catch (error) {
    console.error("❌ Error getting messages from database:", error);
    return [];
  }
};

export const getMessageCountFromSQLite = (
  db: SQLiteDatabase,
  conversationId: string
): number => {
  try {
    return MessageRepository.count(db, conversationId);
  } catch (error) {
    console.error("❌ Error getting message count from database:", error);
    return 0;
  }
};

export const deleteMessageFromSQLite = (
  db: SQLiteDatabase,
  messageId: string | number,
  conversationId: string
): boolean => {
  try {
    MessageRepository.deleteById(db, messageId, conversationId);
    return true;
  } catch (error) {
    console.error("❌ Error deleting message from database:", error);
    return false;
  }
};

export const clearAllMessagesFromSQLite = (
  db: SQLiteDatabase,
  conversationId: string
): boolean => {
  try {
    MessageRepository.clearAll(db, conversationId);
    return true;
  } catch (error) {
    console.error("❌ Error clearing messages from database:", error);
    return false;
  }
};

export const messagesTableExists = (
  db: SQLiteDatabase,
  conversationId: string
): boolean => {
  try {
    return MessageRepository.hasCachedMessages(db, conversationId);
  } catch (error) {
    console.error("❌ Error checking table existence:", error);
    return false;
  }
};

export const updateMessageStatus = (
  db: SQLiteDatabase,
  messageId: string | number,
  conversationId: string,
  status: string
): boolean => {
  try {
    MessageRepository.updateStatus(db, messageId, conversationId, status);
    return true;
  } catch (error) {
    console.error("❌ Error updating message status:", error);
    return false;
  }
};

export const updateSignatureFields = (
  db: SQLiteDatabase,
  messageId: string | number,
  conversationId: string,
  signatureData: SignatureFieldUpdate
): boolean => {
  try {
    MessageRepository.updateSignatureByMessageId(
      db,
      messageId,
      conversationId,
      signatureData
    );
    return true;
  } catch (error) {
    console.error("❌ Error updating signature fields:", error);
    return false;
  }
};

export const updateSignatureId = (
  db: SQLiteDatabase,
  messageId: string | number,
  conversationId: string,
  signatureId: number | null
): boolean => {
  try {
    MessageRepository.updateSignatureId(db, messageId, conversationId, signatureId);
    return true;
  } catch (error) {
    console.error("❌ Error updating signature ID:", error);
    return false;
  }
};

export const updateSignatureFieldsBySignatureId = (
  db: SQLiteDatabase,
  signatureId: number,
  conversationId: string,
  signatureData: SignatureFieldUpdate
): boolean => {
  try {
    MessageRepository.updateSignatureBySignatureId(
      db,
      signatureId,
      conversationId,
      signatureData
    );
    return true;
  } catch (error) {
    console.error("❌ Error updating signature fields by signature ID:", error);
    return false;
  }
};

export const getLastInsertRowId = (db: SQLiteDatabase): number | null => {
  try {
    return MessageRepository.lastInsertRowId(db);
  } catch (error) {
    console.error("❌ Error getting last insert row ID:", error);
    return null;
  }
};

export const deletePendingMessage = (
  db: SQLiteDatabase,
  messageId: string | number,
  conversationId: string
): boolean => {
  try {
    MessageRepository.deletePendingById(db, messageId, conversationId);
    return true;
  } catch (error) {
    console.error("❌ Error deleting pending message:", error);
    return false;
  }
};

export const insertOfflineMessage = (
  db: SQLiteDatabase,
  msg: Omit<MessageData, "id">,
  conversationId: string
): number | null => {
  try {
    MessageRepository.ensureTable(db, conversationId);
    MessageRepository.insertOffline(db, msg, conversationId);
    return MessageRepository.lastOfflineId(db, conversationId);
  } catch (error) {
    console.error("❌ Error inserting offline message:", error);
    return null;
  }
};

export const getPendingSignatureIds = (
  db: SQLiteDatabase,
  conversationId: string
): string[] => {
  try {
    return MessageRepository.getPendingSignatureIds(db, conversationId);
  } catch (error) {
    console.error("❌ Error getting pending signature IDs:", error);
    return [];
  }
};

export const getPendingMessages = (
  db: SQLiteDatabase,
  conversationId: string,
  senderId: string | number,
  content?: string
): MessageRow[] => {
  try {
    return MessageRepository.getPendingMessages(
      db,
      conversationId,
      senderId,
      content
    );
  } catch (error) {
    console.error("❌ Error getting pending messages:", error);
    return [];
  }
};

export const getAllMessagesAscending = (
  db: SQLiteDatabase,
  conversationId: string
): MessageRow[] => {
  try {
    return MessageRepository.findMany(db, conversationId, { ascending: true });
  } catch (error) {
    console.error("❌ Error getting messages ascending:", error);
    return [];
  }
};

export const initializeMessagesTable = async (
  db: SQLiteDatabase,
  conversationId: string
): Promise<void> => {
  try {
    MessageRepository.ensureTable(db, conversationId);
  } catch (error: any) {
    console.error("❌ Database initialization failed:", error);
    console.error("❌ Error details:", error.message);
    throw error;
  }
};
