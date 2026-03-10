import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "scout.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS startups (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT,
    name TEXT NOT NULL,
    url TEXT,
    description TEXT,
    founders TEXT,
    sector TEXT,
    stage TEXT NOT NULL DEFAULT 'discovered',
    score INTEGER DEFAULT 0,
    source_url TEXT,
    discovered_at TEXT NOT NULL,
    notes TEXT,
    archived INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alert_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sectors TEXT,
    keywords TEXT,
    min_score INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alert_matches (
    id TEXT PRIMARY KEY,
    alert_rule_id TEXT REFERENCES alert_rules(id),
    startup_id TEXT REFERENCES startups(id),
    matched_at TEXT DEFAULT (datetime('now')),
    dismissed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS outreach (
    id TEXT PRIMARY KEY,
    startup_id TEXT REFERENCES startups(id),
    contact_name TEXT,
    contact_email TEXT,
    contact_linkedin TEXT,
    channel TEXT,
    status TEXT DEFAULT 'drafted',
    sent_at TEXT,
    last_followup TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feed_cache (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    raw_data TEXT NOT NULL,
    fetched_at TEXT DEFAULT (datetime('now')),
    UNIQUE(source, source_id)
  );

  CREATE TABLE IF NOT EXISTS ai_analysis (
    id TEXT PRIMARY KEY,
    startup_id TEXT,
    feed_item_key TEXT NOT NULL,
    ai_score INTEGER DEFAULT 0,
    verdict TEXT,
    tags TEXT,
    enrichment_data TEXT,
    analyzed_at TEXT DEFAULT (datetime('now')),
    UNIQUE(feed_item_key)
  );
  CREATE INDEX IF NOT EXISTS idx_ai_analysis_feed_key ON ai_analysis(feed_item_key);
  CREATE INDEX IF NOT EXISTS idx_ai_analysis_startup ON ai_analysis(startup_id);
`);

export const db = drizzle(sqlite, { schema });
