import { SQLiteDatabase } from "expo-sqlite";
import * as FileSystem from "expo-file-system";
import {
  MessageRow,
  getMessagesTableName,
  createMessagesTableSQL,
  addStatusColumnSQL,
  addConversationIdColumnSQL,
  addSignatureColumnsSQL,
} from "./schema";

export interface MessageData {
  id: string | number;
  content?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  sender?: {
    id?: string | number;
    first_name?: string;
    last_name?: string;
  } | null;
  createdAt?: string;
  status?: string;
  signature?: {
    id?: number;
    title?: string;
    notes?: string;
    dueDate?: string;
    status?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    signedBy?: {
      id?: string | number;
      name?: string;
      email?: string;
    } | null;
  } | null;
}

export const messageExistsInSQLite = (
  db: SQLiteDatabase,
  messageId: string | number,
  conversationId: string
): boolean => {
  try {
    const tableName = getMessagesTableName(conversationId);
    const existingMessage = db.getFirstSync<{ id: number }>(
      `SELECT id FROM ${tableName} WHERE id = ?`,
      [messageId]
    );
    return Boolean(existingMessage);
  } catch (error) {
    console.error("❌ Error checking message existence:", error);
    return false;
  }
};

export const saveMessageToSQLite = (
  db: SQLiteDatabase,
  msg: MessageData,
  conversationId: string,
  logLabel: string = "DEFAULT",
  logSkips: boolean = true
): void => {
  try {
    const isDuplicate = messageExistsInSQLite(db, msg.id, conversationId);

    if (isDuplicate) {
      if (logSkips) {
        console.log(
          `ℹ️ [${logLabel}] Message ${msg.id} already exists - skipping insert`
        );
      }
      return;
    }

    const tableName = getMessagesTableName(conversationId);

    db.runSync(
      `
      INSERT OR REPLACE INTO ${tableName} (
        id, conversation_id, content, file_uri, file_name, file_type, file_size,
        sender_id, sender_first_name, sender_last_name, created_at, status,
        signature_id, signature_title, signature_notes, signature_due_date, 
        signature_status, signature_file_url, signature_file_name, signature_file_size,
        signed_by_id, signed_by_name, signed_by_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        msg.id,
        conversationId,
        msg.content || null,
        msg.fileUrl || null,
        msg.fileName || null,
        msg.fileType || null,
        msg.fileSize || null,
        msg.sender?.id || null,
        msg.sender?.first_name || null,
        msg.sender?.last_name || null,
        msg.createdAt || new Date().toISOString(),
        msg.status || "sent",
        msg.signature?.id || null,
        msg.signature?.title || null,
        msg.signature?.notes || null,
        msg.signature?.dueDate || null,
        msg.signature?.status || null,
        msg.signature?.fileUrl || null,
        msg.signature?.fileName || null,
        msg.signature?.fileSize || null,
        msg.signature?.signedBy?.id || null,
        msg.signature?.signedBy?.name || null,
        msg.signature?.signedBy?.email || null,
      ]
    );
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
    const messagesToInsert = messages.filter(
      (message) => !messageExistsInSQLite(db, message.id, conversationId)
    );

    if (messagesToInsert.length === 0) {
      return;
    }

    db.execSync("BEGIN TRANSACTION");
    messagesToInsert.forEach((message) => {
      saveMessageToSQLite(db, message, conversationId, logLabel, false);
    });
    db.execSync("COMMIT");
  } catch (transactionError) {
    console.error(`❌ [${logLabel}] Failed to persist message batch:`, transactionError);
    try {
      db.execSync("ROLLBACK");
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
    const tableName = getMessagesTableName(conversationId);
    const message = db.getFirstSync<MessageRow>(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [messageId]
    );
    return message || null;
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
    const tableName = getMessagesTableName(conversationId);
    let query = `SELECT * FROM ${tableName} ORDER BY created_at DESC`;
    
    if (limit !== undefined) {
      query += ` LIMIT ${limit}`;
      if (offset !== undefined) {
        query += ` OFFSET ${offset}`;
      }
    }
    
    const messages = db.getAllSync<MessageRow>(query);
    return messages || [];
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
    const tableName = getMessagesTableName(conversationId);
    const result = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    return result?.count || 0;
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
    const tableName = getMessagesTableName(conversationId);
    db.runSync(`DELETE FROM ${tableName} WHERE id = ?`, [messageId]);
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
    const tableName = getMessagesTableName(conversationId);
    db.execSync(`DELETE FROM ${tableName}`);
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
    const tableName = getMessagesTableName(conversationId);
    const result = db.getAllSync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );
    return result.length > 0;
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
    const tableName = getMessagesTableName(conversationId);
    db.runSync(`UPDATE ${tableName} SET status = ? WHERE id = ?`, [
      status,
      messageId,
    ]);
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
  signatureData: {
    status?: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    signedById?: string | number | null;
    signedByName?: string | null;
    signedByEmail?: string | null;
  }
): boolean => {
  try {
    const tableName = getMessagesTableName(conversationId);
    db.runSync(
      `UPDATE ${tableName} 
       SET signature_status = ?, signature_file_url = ?, signature_file_name = ?, 
           signature_file_size = ?, signed_by_id = ?, signed_by_name = ?, signed_by_email = ?
       WHERE id = ?`,
      [
        signatureData.status || null,
        signatureData.fileUrl || null,
        signatureData.fileName || null,
        signatureData.fileSize || null,
        signatureData.signedById || null,
        signatureData.signedByName || null,
        signatureData.signedByEmail || null,
        messageId,
      ]
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
    const tableName = getMessagesTableName(conversationId);
    db.runSync(`UPDATE ${tableName} SET signature_id = ? WHERE id = ?`, [
      signatureId,
      messageId,
    ]);
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
  signatureData: {
    status?: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    signedById?: string | number | null;
    signedByName?: string | null;
    signedByEmail?: string | null;
  }
): boolean => {
  try {
    const tableName = getMessagesTableName(conversationId);
    db.runSync(
      `UPDATE ${tableName} 
       SET signature_status = ?, signature_file_url = ?, signature_file_name = ?, 
           signature_file_size = ?, signed_by_id = ?, signed_by_name = ?, signed_by_email = ?
       WHERE signature_id = ?`,
      [
        signatureData.status || null,
        signatureData.fileUrl || null,
        signatureData.fileName || null,
        signatureData.fileSize || null,
        signatureData.signedById || null,
        signatureData.signedByName || null,
        signatureData.signedByEmail || null,
        signatureId,
      ]
    );
    return true;
  } catch (error) {
    console.error("❌ Error updating signature fields by signature ID:", error);
    return false;
  }
};

export const getLastInsertRowId = (db: SQLiteDatabase): number | null => {
  try {
    const result = db.getFirstSync<{ id: number }>(
      `SELECT last_insert_rowid() AS id`
    );
    return result?.id || null;
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
    const tableName = getMessagesTableName(conversationId);
    db.runSync(
      `DELETE FROM ${tableName} WHERE id = ? AND status = 'pending'`,
      [messageId]
    );
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
    const tableName = getMessagesTableName(conversationId);

    db.runSync(
      `
      INSERT INTO ${tableName} (
        conversation_id, content, file_uri, file_name, file_type, file_size,
        sender_id, sender_first_name, sender_last_name, created_at, status,
        signature_id, signature_title, signature_notes, signature_due_date, 
        signature_status, signature_file_url, signature_file_name, signature_file_size,
        signed_by_id, signed_by_name, signed_by_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        conversationId,
        msg.content || null,
        msg.fileUrl || null,
        msg.fileName || null,
        msg.fileType || null,
        msg.fileSize || null,
        msg.sender?.id || null,
        msg.sender?.first_name || null,
        msg.sender?.last_name || null,
        msg.createdAt || new Date().toISOString(),
        msg.status || "pending",
        msg.signature?.id || null,
        msg.signature?.title || null,
        msg.signature?.notes || null,
        msg.signature?.dueDate || null,
        msg.signature?.status || null,
        msg.signature?.fileUrl || null,
        msg.signature?.fileName || null,
        msg.signature?.fileSize || null,
        msg.signature?.signedBy?.id || null,
        msg.signature?.signedBy?.name || null,
        msg.signature?.signedBy?.email || null,
      ]
    );

    const rowId = getLastInsertRowId(db);
    return rowId;
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
    const tableName = getMessagesTableName(conversationId);
    const rows = db.getAllSync<{ signature_id: number }>(
      `SELECT signature_id FROM ${tableName} WHERE signature_status = 'pending' AND signature_id IS NOT NULL`
    );
    return rows
      .map((row) => row?.signature_id)
      .filter((id) => id !== null && id !== undefined)
      .map((id) => String(id));
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
    const tableName = getMessagesTableName(conversationId);
    let query = `SELECT * FROM ${tableName} WHERE status = 'pending' AND sender_id = ?`;
    const params: any[] = [senderId];
    
    if (content !== undefined) {
      query += ` AND content = ?`;
      params.push(content);
    }
    
    const messages = db.getAllSync<MessageRow>(query, params);
    return messages || [];
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
    const tableName = getMessagesTableName(conversationId);
    const messages = db.getAllSync<MessageRow>(
      `SELECT * FROM ${tableName} ORDER BY datetime(created_at) ASC`
    );
    return messages || [];
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
    console.log("🔄 Initializing database for conversation:", conversationId);
    console.log("✅ Database connection established via context");

    // Create the messages table ONLY if it doesn't exist
    console.log(
      "🔨 Checking if messages table exists for conversation:",
      conversationId
    );
    db.execSync(createMessagesTableSQL(conversationId));

    // Add missing columns if they don't exist (for existing tables)
    try {
      db.execSync(addStatusColumnSQL(conversationId));
      console.log("✅ Added status column to existing table");
    } catch (e) {
      // Column already exists, ignore error
      console.log("ℹ️ status column already exists");
    }

    try {
      db.execSync(addConversationIdColumnSQL(conversationId));
      console.log("✅ Added conversation_id column to existing table");
    } catch (e) {
      // Column already exists, ignore error
      console.log("ℹ️ conversation_id column already exists");
    }

    // Add signature columns if they don't exist
    const signatureColumnSQLs = addSignatureColumnsSQL(conversationId);
    signatureColumnSQLs.forEach((sql) => {
      try {
        db.execSync(sql);
        console.log(`✅ Added column to existing table`);
      } catch (e) {
        // Column already exists, ignore error
        console.log(`ℹ️ column already exists`);
      }
    });

    console.log("✅ Messages table ready (created once only)");

    // Debug: Check table structure
    try {
      const tableName = getMessagesTableName(conversationId);
      const tableInfo = db.getAllSync(`PRAGMA table_info(${tableName})`);
      console.log(
        `🔍 Table structure for ${tableName}:`,
        tableInfo
      );
      console.log(
        "📋 Available columns:",
        tableInfo.map((col: any) => col.name)
      );
    } catch (e) {
      console.log("❌ Could not get table info:", e);
    }

    // Delete entire database file and create fresh new one
    // NOTE: This deletes the database file after creating the table - consider removing if not needed
    console.log("🗑️ Deleting old database file...");
    try {
      const dbName = `chat_${conversationId}.db`;
      const dbPath = `${FileSystem.documentDirectory}SQLite/${dbName}`;
      await FileSystem.deleteAsync(dbPath, { idempotent: true });
      console.log(`✅ Deleted database file: ${dbName}`);
    } catch (error) {
      console.log("ℹ️ No database file to delete");
    }

    console.log("✅ Database setup completed for conversation", conversationId);
  } catch (error: any) {
    console.error("❌ Database initialization failed:", error);
    console.error("❌ Error details:", error.message);
    throw error;
  }
};

