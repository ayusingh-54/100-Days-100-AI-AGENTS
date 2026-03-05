import Database from 'better-sqlite3';
import { config } from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const logger = createModuleLogger('database');

// Ensure data directory exists
const dbDir = dirname(config.app.databasePath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new Database(config.app.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
function initSchema() {
  logger.info('Initializing database schema...');

  // Sessions table - tracks conversation sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel_id TEXT,
      thread_ts TEXT,
      session_type TEXT NOT NULL DEFAULT 'dm',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      last_activity INTEGER NOT NULL DEFAULT (unixepoch()),
      metadata TEXT
    )
  `);

  // Messages table - stores conversation history
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      slack_ts TEXT,
      thread_ts TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      metadata TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  // Scheduled tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      thread_ts TEXT,
      task_description TEXT NOT NULL,
      cron_expression TEXT,
      scheduled_time INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      executed_at INTEGER,
      metadata TEXT
    )
  `);

  // Pairing codes for DM security
  db.exec(`
    CREATE TABLE IF NOT EXISTS pairing_codes (
      code TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at INTEGER NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Approved users for DM access
  db.exec(`
    CREATE TABLE IF NOT EXISTS approved_users (
      user_id TEXT PRIMARY KEY,
      approved_at INTEGER NOT NULL DEFAULT (unixepoch()),
      approved_by TEXT
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_channel ON sessions(channel_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status ON scheduled_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_pairing_codes_user ON pairing_codes(user_id);
  `);

  logger.info('Database schema initialized');
}

initSchema();

/**
 * Initialize the database.
 * Called at startup to ensure schema is ready.
 * Safe to call multiple times.
 */
export function initializeDatabase(): void {
  // Schema is initialized automatically when this module is imported.
  // This function exists for explicit initialization in the main entry point.
  logger.info('Database ready');
}

// ============================================
// Session Management
// ============================================

export interface Session {
  id: string;
  userId: string;
  channelId: string | null;
  threadTs: string | null;
  sessionType: 'dm' | 'channel' | 'thread';
  createdAt: number;
  lastActivity: number;
  metadata: Record<string, unknown> | null;
}

export function getOrCreateSession(
  userId: string,
  channelId: string | null,
  threadTs: string | null
): Session {
  // Generate session ID based on context
  let sessionId: string;
  let sessionType: 'dm' | 'channel' | 'thread';

  if (threadTs) {
    sessionId = `thread:${channelId}:${threadTs}`;
    sessionType = 'thread';
  } else if (channelId && !channelId.startsWith('D')) {
    sessionId = `channel:${channelId}`;
    sessionType = 'channel';
  } else {
    sessionId = `dm:${userId}`;
    sessionType = 'dm';
  }

  // Check if session exists
  const existing = db.prepare(`
    SELECT * FROM sessions WHERE id = ?
  `).get(sessionId) as Session | undefined;

  if (existing) {
    // Update last activity
    db.prepare(`
      UPDATE sessions SET last_activity = unixepoch() WHERE id = ?
    `).run(sessionId);

    return {
      ...existing,
      metadata: existing.metadata ? JSON.parse(existing.metadata as unknown as string) : null,
    };
  }

  // Create new session
  db.prepare(`
    INSERT INTO sessions (id, user_id, channel_id, thread_ts, session_type)
    VALUES (?, ?, ?, ?, ?)
  `).run(sessionId, userId, channelId, threadTs, sessionType);

  return {
    id: sessionId,
    userId,
    channelId,
    threadTs,
    sessionType,
    createdAt: Math.floor(Date.now() / 1000),
    lastActivity: Math.floor(Date.now() / 1000),
    metadata: null,
  };
}

export function getSession(sessionId: string): Session | null {
  const session = db.prepare(`
    SELECT * FROM sessions WHERE id = ?
  `).get(sessionId) as Session | undefined;

  if (!session) return null;

  return {
    ...session,
    metadata: session.metadata ? JSON.parse(session.metadata as unknown as string) : null,
  };
}

// ============================================
// Message History
// ============================================

export interface Message {
  id: number;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  slackTs: string | null;
  threadTs: string | null;
  createdAt: number;
  metadata: Record<string, unknown> | null;
}

export function addMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  slackTs?: string,
  threadTs?: string,
  metadata?: Record<string, unknown>
): Message {
  const result = db.prepare(`
    INSERT INTO messages (session_id, role, content, slack_ts, thread_ts, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    role,
    content,
    slackTs || null,
    threadTs || null,
    metadata ? JSON.stringify(metadata) : null
  );

  return {
    id: Number(result.lastInsertRowid),
    sessionId,
    role,
    content,
    slackTs: slackTs || null,
    threadTs: threadTs || null,
    createdAt: Math.floor(Date.now() / 1000),
    metadata: metadata || null,
  };
}

export function getSessionHistory(
  sessionId: string,
  limit: number = config.app.maxHistoryMessages
): Message[] {
  const messages = db.prepare(`
    SELECT * FROM messages
    WHERE session_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(sessionId, limit) as Message[];

  return messages.reverse().map((msg) => ({
    ...msg,
    metadata: msg.metadata ? JSON.parse(msg.metadata as unknown as string) : null,
  }));
}

export function getThreadMessages(channelId: string, threadTs: string): Message[] {
  const sessionId = `thread:${channelId}:${threadTs}`;
  return getSessionHistory(sessionId, 100);
}

export function clearSessionHistory(sessionId: string): void {
  db.prepare(`DELETE FROM messages WHERE session_id = ?`).run(sessionId);
  logger.info(`Cleared history for session: ${sessionId}`);
}

// ============================================
// Scheduled Tasks
// ============================================

export interface ScheduledTask {
  id: number;
  userId: string;
  channelId: string;
  threadTs: string | null;
  taskDescription: string;
  cronExpression: string | null;
  scheduledTime: number | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  executedAt: number | null;
  metadata: Record<string, unknown> | null;
}

export function createScheduledTask(
  userId: string,
  channelId: string,
  taskDescription: string,
  scheduledTime: number | null = null,
  cronExpression: string | null = null,
  threadTs: string | null = null
): ScheduledTask {
  const result = db.prepare(`
    INSERT INTO scheduled_tasks 
    (user_id, channel_id, thread_ts, task_description, cron_expression, scheduled_time)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, channelId, threadTs, taskDescription, cronExpression, scheduledTime);

  return {
    id: Number(result.lastInsertRowid),
    userId,
    channelId,
    threadTs,
    taskDescription,
    cronExpression,
    scheduledTime,
    status: 'pending',
    createdAt: Math.floor(Date.now() / 1000),
    executedAt: null,
    metadata: null,
  };
}

export function getPendingTasks(): ScheduledTask[] {
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    SELECT * FROM scheduled_tasks
    WHERE status = 'pending'
    AND (scheduled_time IS NULL OR scheduled_time <= ?)
    ORDER BY scheduled_time ASC
  `).all(now) as ScheduledTask[];
}

export function updateTaskStatus(
  taskId: number,
  status: ScheduledTask['status']
): void {
  db.prepare(`
    UPDATE scheduled_tasks
    SET status = ?, executed_at = CASE WHEN ? IN ('completed', 'failed') THEN unixepoch() ELSE executed_at END
    WHERE id = ?
  `).run(status, status, taskId);
}

export function getUserTasks(userId: string): ScheduledTask[] {
  return db.prepare(`
    SELECT * FROM scheduled_tasks
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(userId) as ScheduledTask[];
}

export function cancelTask(taskId: number, userId: string): boolean {
  const result = db.prepare(`
    UPDATE scheduled_tasks
    SET status = 'cancelled'
    WHERE id = ? AND user_id = ? AND status = 'pending'
  `).run(taskId, userId);

  return result.changes > 0;
}

// ============================================
// DM Pairing Security
// ============================================

export function generatePairingCode(userId: string): string {
  // Generate 6-character alphanumeric code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  // Delete any existing codes for this user
  db.prepare(`DELETE FROM pairing_codes WHERE user_id = ?`).run(userId);

  // Create new code
  db.prepare(`
    INSERT INTO pairing_codes (code, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(code, userId, expiresAt);

  return code;
}

export function verifyPairingCode(code: string): string | null {
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare(`
    SELECT user_id FROM pairing_codes
    WHERE code = ? AND expires_at > ? AND approved = 0
  `).get(code.toUpperCase()) as { user_id: string } | undefined;

  return result?.user_id || null;
}

export function approvePairing(code: string, approvedBy: string): boolean {
  const userId = verifyPairingCode(code);
  if (!userId) return false;

  db.prepare(`
    UPDATE pairing_codes SET approved = 1 WHERE code = ?
  `).run(code.toUpperCase());

  db.prepare(`
    INSERT OR REPLACE INTO approved_users (user_id, approved_by)
    VALUES (?, ?)
  `).run(userId, approvedBy);

  return true;
}

export function isUserApproved(userId: string): boolean {
  // Check if user is in allowed list or approved users
  if (config.security.allowedUsers.includes('*')) return true;
  if (config.security.allowedUsers.includes(userId)) return true;

  const result = db.prepare(`
    SELECT 1 FROM approved_users WHERE user_id = ?
  `).get(userId);

  return !!result;
}

// ============================================
// Cleanup and Maintenance
// ============================================

export function cleanupOldSessions(maxAgeSeconds: number = 86400 * 7): number {
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeSeconds;
  const result = db.prepare(`
    DELETE FROM sessions WHERE last_activity < ?
  `).run(cutoff);

  logger.info(`Cleaned up ${result.changes} old sessions`);
  return result.changes;
}

export function cleanupExpiredPairingCodes(): number {
  const now = Math.floor(Date.now() / 1000);
  const result = db.prepare(`
    DELETE FROM pairing_codes WHERE expires_at < ? AND approved = 0
  `).run(now);

  return result.changes;
}

/**
 * Close the database connection.
 * Should be called during graceful shutdown.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}

// Export database instance for advanced queries
export { db };
