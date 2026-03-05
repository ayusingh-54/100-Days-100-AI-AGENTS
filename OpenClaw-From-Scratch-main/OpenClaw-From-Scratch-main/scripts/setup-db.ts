#!/usr/bin/env tsx
/**
 * Database Setup Script
 * 
 * Run this to initialize or reset the database.
 * Usage: npm run db:setup
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync, unlinkSync } from 'fs';
import { dirname } from 'path';
import { createInterface } from 'readline';

const DATABASE_PATH = process.env.DATABASE_PATH || './data/assistant.db';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🗄️  Slack AI Assistant - Database Setup\n');

  // Check if database exists
  if (existsSync(DATABASE_PATH)) {
    const answer = await question(
      `Database already exists at ${DATABASE_PATH}.\nDo you want to reset it? (y/N): `
    );

    if (answer.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }

    console.log('Removing existing database...');
    unlinkSync(DATABASE_PATH);
  }

  // Ensure directory exists
  const dbDir = dirname(DATABASE_PATH);
  if (!existsSync(dbDir)) {
    console.log(`Creating directory: ${dbDir}`);
    mkdirSync(dbDir, { recursive: true });
  }

  // Create database
  console.log(`Creating database: ${DATABASE_PATH}`);
  const db = new Database(DATABASE_PATH);

  // Enable optimizations
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create schema
  console.log('Creating schema...');

  db.exec(`
    -- Sessions table
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      channel_id TEXT,
      thread_ts TEXT,
      session_type TEXT NOT NULL DEFAULT 'dm',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      last_activity INTEGER NOT NULL DEFAULT (unixepoch()),
      metadata TEXT
    );

    -- Messages table
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      slack_ts TEXT,
      thread_ts TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      metadata TEXT,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    -- Scheduled tasks table
    CREATE TABLE scheduled_tasks (
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
    );

    -- Pairing codes table
    CREATE TABLE pairing_codes (
      code TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at INTEGER NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0
    );

    -- Approved users table
    CREATE TABLE approved_users (
      user_id TEXT PRIMARY KEY,
      approved_at INTEGER NOT NULL DEFAULT (unixepoch()),
      approved_by TEXT
    );

    -- Indexes
    CREATE INDEX idx_messages_session ON messages(session_id);
    CREATE INDEX idx_messages_created ON messages(created_at);
    CREATE INDEX idx_sessions_user ON sessions(user_id);
    CREATE INDEX idx_sessions_channel ON sessions(channel_id);
    CREATE INDEX idx_scheduled_tasks_status ON scheduled_tasks(status);
    CREATE INDEX idx_pairing_codes_user ON pairing_codes(user_id);
  `);

  console.log('Schema created successfully!\n');

  // Show table info
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as { name: string }[];

  console.log('Tables created:');
  tables.forEach((t) => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get() as { count: number };
    console.log(`  • ${t.name} (${count.count} rows)`);
  });

  db.close();

  console.log('\n✅ Database setup complete!');
  console.log(`\nDatabase location: ${DATABASE_PATH}`);

  rl.close();
}

main().catch((error) => {
  console.error('Setup failed:', error);
  rl.close();
  process.exit(1);
});
