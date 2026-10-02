// @ts-nocheck
import { SQLiteDatabase } from "expo-sqlite";
import {
  MessageRow,
  CHAT_MESSAGES_TABLE,
  createChatMessagesTableSQL,
  createChatMessagesIndexesSQL,
  sanitizeConversationId,
  getMessagesTableName,
} from "../schema/messages.schema";
import type { MessageData, SignatureFieldUpdate } from "./message.types";

const T = CHAT_MESSAGES_TABLE;

export const MessageRepository = {
  ensureTable(db: SQLiteDatabase, conversationId?: string | number): void {
    db.execSync(createChatMessagesTableSQL());
    createChatMessagesIndexesSQL().forEach((sql) => {
      try {
        db.execSync(sql);
      } catch {
      }
    });

    if (conversationId !== undefined && conversationId !== null) {
      this.migrateLegacyConversationTable(db, conversationId);
    }
  },

  migrateLegacyConversationTable(
    db: SQLiteDatabase,
    conversationId: string | number
  ): void {
    try {
      const legacy = getMessagesTableName(conversationId);
      const exists = db.getAllSync(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [legacy]
      );
      if (!exists.length) return;

      const safeConversationId = sanitizeConversationId(conversationId);
      db.execSync("BEGIN TRANSACTION");
      try {
        db.runSync(
          `
          INSERT OR IGNORE INTO ${T} (
            id, conversation_id, content, file_uri, file_name, file_type, file_size,
            sender_id, sender_first_name, sender_last_name, created_at, status,
            signature_id, signature_title, signature_notes, signature_due_date,
            signature_status, signature_file_url, signature_file_name, signature_file_size,
            signed_by_id, signed_by_name, signed_by_email
          )
          SELECT
            id,
            COALESCE(conversation_id, ?),
            content, file_uri, file_name, file_type, file_size,
            sender_id, sender_first_name, sender_last_name, created_at, status,
            signature_id, signature_title, signature_notes, signature_due_date,
            signature_status, signature_file_url, signature_file_name, signature_file_size,
            signed_by_id, signed_by_name, signed_by_email
          FROM ${legacy}
        `,
          [safeConversationId]
        );
        db.execSync(`DROP TABLE IF EXISTS ${legacy}`);
        db.execSync("COMMIT");
      } catch (err) {
        db.execSync("ROLLBACK");
        throw err;
      }
    } catch (error) {
      console.error("❌ Legacy chat table migration failed:", error);
    }
  },

  tableExists(db: SQLiteDatabase, _conversationId?: string): boolean {
    const result = db.getAllSync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [T]
    );
    return result.length > 0;
  },

  hasCachedMessages(
    db: SQLiteDatabase,
    conversationId: string | number
  ): boolean {
    this.ensureTable(db, conversationId);
    return this.count(db, conversationId) > 0;
  },

  exists(
    db: SQLiteDatabase,
    messageId: string | number,
    conversationId: string | number
  ): boolean {
    const row = db.getFirstSync<{ id: number }>(
      `SELECT id FROM ${T} WHERE id = ? AND conversation_id = ?`,
      [messageId, sanitizeConversationId(conversationId)]
    );
    return Boolean(row);
  },

  insert(
    db: SQLiteDatabase,
    msg: MessageData,
    conversationId: string | number
  ): void {
    const safeConversationId = sanitizeConversationId(conversationId);
    db.runSync(
      `
      INSERT OR REPLACE INTO ${T} (
        id, conversation_id, content, file_uri, file_name, file_type, file_size,
        sender_id, sender_first_name, sender_last_name, created_at, status,
        signature_id, signature_title, signature_notes, signature_due_date,
        signature_status, signature_file_url, signature_file_name, signature_file_size,
        signed_by_id, signed_by_name, signed_by_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        msg.id,
        safeConversationId,
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
  },

  insertOffline(
    db: SQLiteDatabase,
    msg: Omit<MessageData, "id">,
    conversationId: string | number
  ): void {
    const localId = -Math.abs(Date.now() % 1000000000);
    const safeConversationId = sanitizeConversationId(conversationId);
    db.runSync(
      `
      INSERT OR REPLACE INTO ${T} (
        id, conversation_id, content, file_uri, file_name, file_type, file_size,
        sender_id, sender_first_name, sender_last_name, created_at, status,
        signature_id, signature_title, signature_notes, signature_due_date,
        signature_status, signature_file_url, signature_file_name, signature_file_size,
        signed_by_id, signed_by_name, signed_by_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        localId,
        safeConversationId,
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
  },

  findById(
    db: SQLiteDatabase,
    messageId: string | number,
    conversationId: string | number
  ): MessageRow | null {
    const message = db.getFirstSync<MessageRow>(
      `SELECT * FROM ${T} WHERE id = ? AND conversation_id = ?`,
      [messageId, sanitizeConversationId(conversationId)]
    );
    return message || null;
  },

  findMany(
    db: SQLiteDatabase,
    conversationId: string | number,
    options?: { limit?: number; offset?: number; ascending?: boolean }
  ): MessageRow[] {
    const safeConversationId = sanitizeConversationId(conversationId);
    const order = options?.ascending
      ? `ORDER BY datetime(created_at) ASC`
      : `ORDER BY datetime(created_at) DESC`;

    let query = `SELECT * FROM ${T} WHERE conversation_id = ? ${order}`;
    const params: any[] = [safeConversationId];

    if (options?.limit !== undefined) {
      query += ` LIMIT ?`;
      params.push(options.limit);
      if (options.offset !== undefined) {
        query += ` OFFSET ?`;
        params.push(options.offset);
      }
    }

    return db.getAllSync<MessageRow>(query, params) || [];
  },

  count(db: SQLiteDatabase, conversationId: string | number): number {
    const result = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${T} WHERE conversation_id = ?`,
      [sanitizeConversationId(conversationId)]
    );
    return result?.count || 0;
  },

  deleteById(
    db: SQLiteDatabase,
    messageId: string | number,
    conversationId: string | number
  ): void {
    db.runSync(`DELETE FROM ${T} WHERE id = ? AND conversation_id = ?`, [
      messageId,
      sanitizeConversationId(conversationId),
    ]);
  },

  deletePendingById(
    db: SQLiteDatabase,
    messageId: string | number,
    conversationId: string | number
  ): void {
    db.runSync(
      `DELETE FROM ${T} WHERE id = ? AND conversation_id = ? AND status = 'pending'`,
      [messageId, sanitizeConversationId(conversationId)]
    );
  },

  clearAll(db: SQLiteDatabase, conversationId: string | number): void {
    db.runSync(`DELETE FROM ${T} WHERE conversation_id = ?`, [
      sanitizeConversationId(conversationId),
    ]);
  },

  updateStatus(
    db: SQLiteDatabase,
    messageId: string | number,
    conversationId: string | number,
    status: string
  ): void {
    db.runSync(
      `UPDATE ${T} SET status = ? WHERE id = ? AND conversation_id = ?`,
      [status, messageId, sanitizeConversationId(conversationId)]
    );
  },

  updateSignatureId(
    db: SQLiteDatabase,
    messageId: string | number,
    conversationId: string | number,
    signatureId: number | null
  ): void {
    db.runSync(
      `UPDATE ${T} SET signature_id = ? WHERE id = ? AND conversation_id = ?`,
      [signatureId, messageId, sanitizeConversationId(conversationId)]
    );
  },

  updateSignatureByMessageId(
    db: SQLiteDatabase,
    messageId: string | number,
    conversationId: string | number,
    signatureData: SignatureFieldUpdate
  ): void {
    db.runSync(
      `UPDATE ${T}
       SET signature_status = ?, signature_file_url = ?, signature_file_name = ?,
           signature_file_size = ?, signed_by_id = ?, signed_by_name = ?, signed_by_email = ?
       WHERE id = ? AND conversation_id = ?`,
      [
        signatureData.status || null,
        signatureData.fileUrl || null,
        signatureData.fileName || null,
        signatureData.fileSize || null,
        signatureData.signedById || null,
        signatureData.signedByName || null,
        signatureData.signedByEmail || null,
        messageId,
        sanitizeConversationId(conversationId),
      ]
    );
  },

  updateSignatureBySignatureId(
    db: SQLiteDatabase,
    signatureId: number,
    conversationId: string | number,
    signatureData: SignatureFieldUpdate
  ): void {
    db.runSync(
      `UPDATE ${T}
       SET signature_status = ?, signature_file_url = ?, signature_file_name = ?,
           signature_file_size = ?, signed_by_id = ?, signed_by_name = ?, signed_by_email = ?
       WHERE signature_id = ? AND conversation_id = ?`,
      [
        signatureData.status || null,
        signatureData.fileUrl || null,
        signatureData.fileName || null,
        signatureData.fileSize || null,
        signatureData.signedById || null,
        signatureData.signedByName || null,
        signatureData.signedByEmail || null,
        signatureId,
        sanitizeConversationId(conversationId),
      ]
    );
  },

  getPendingSignatureIds(
    db: SQLiteDatabase,
    conversationId: string | number
  ): string[] {
    const rows = db.getAllSync<{ signature_id: number }>(
      `SELECT signature_id FROM ${T}
       WHERE conversation_id = ? AND signature_status = 'pending' AND signature_id IS NOT NULL`,
      [sanitizeConversationId(conversationId)]
    );
    return rows
      .map((row) => row?.signature_id)
      .filter((id) => id !== null && id !== undefined)
      .map((id) => String(id));
  },

  getPendingMessages(
    db: SQLiteDatabase,
    conversationId: string | number,
    senderId: string | number,
    content?: string
  ): MessageRow[] {
    let query = `SELECT * FROM ${T} WHERE conversation_id = ? AND status = 'pending' AND sender_id = ?`;
    const params: any[] = [sanitizeConversationId(conversationId), senderId];

    if (content !== undefined) {
      query += ` AND content = ?`;
      params.push(content);
    }

    return db.getAllSync<MessageRow>(query, params) || [];
  },

  lastInsertRowId(db: SQLiteDatabase): number | null {
    const result = db.getFirstSync<{ id: number }>(
      `SELECT last_insert_rowid() AS id`
    );
    return result?.id || null;
  },

  lastOfflineId(
    db: SQLiteDatabase,
    conversationId: string | number
  ): number | null {
    const row = db.getFirstSync<{ id: number }>(
      `SELECT id FROM ${T} WHERE conversation_id = ? AND id < 0 ORDER BY id ASC LIMIT 1`,
      [sanitizeConversationId(conversationId)]
    );
    const newest = db.getFirstSync<{ id: number }>(
      `SELECT id FROM ${T}
       WHERE conversation_id = ? AND id < 0
       ORDER BY datetime(created_at) DESC LIMIT 1`,
      [sanitizeConversationId(conversationId)]
    );
    return newest?.id ?? row?.id ?? null;
  },

  begin(db: SQLiteDatabase): void {
    db.execSync("BEGIN TRANSACTION");
  },

  commit(db: SQLiteDatabase): void {
    db.execSync("COMMIT");
  },

  rollback(db: SQLiteDatabase): void {
    db.execSync("ROLLBACK");
  },
};
