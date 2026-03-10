import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const startups = sqliteTable("startups", {
  id: text("id").primaryKey(),
  source: text("source").notNull(), // "hackernews" | "producthunt" | "rss" | "manual"
  sourceId: text("source_id"),
  name: text("name").notNull(),
  url: text("url"),
  description: text("description"),
  founders: text("founders"),
  sector: text("sector"),
  stage: text("stage").default("discovered").notNull(), // discovered | researching | reached_out | submitted | passed
  score: integer("score").default(0),
  sourceUrl: text("source_url"),
  discoveredAt: text("discovered_at").notNull(),
  notes: text("notes"),
  archived: integer("archived").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const alertRules = sqliteTable("alert_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sectors: text("sectors"), // JSON array
  keywords: text("keywords"), // JSON array
  minScore: integer("min_score").default(0),
  isActive: integer("is_active").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const alertMatches = sqliteTable("alert_matches", {
  id: text("id").primaryKey(),
  alertRuleId: text("alert_rule_id").references(() => alertRules.id),
  startupId: text("startup_id").references(() => startups.id),
  matchedAt: text("matched_at").default(sql`(datetime('now'))`),
  dismissed: integer("dismissed").default(0),
});

export const outreach = sqliteTable("outreach", {
  id: text("id").primaryKey(),
  startupId: text("startup_id").references(() => startups.id),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactLinkedin: text("contact_linkedin"),
  channel: text("channel"), // "email" | "linkedin" | "twitter" | "intro" | "other"
  status: text("status").default("drafted"), // drafted | sent | replied | meeting_scheduled | no_response
  sentAt: text("sent_at"),
  lastFollowup: text("last_followup"),
  notes: text("notes"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export const feedCache = sqliteTable("feed_cache", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  sourceId: text("source_id").notNull(),
  rawData: text("raw_data").notNull(),
  fetchedAt: text("fetched_at").default(sql`(datetime('now'))`),
});

// Type exports
export type Startup = typeof startups.$inferSelect;
export type NewStartup = typeof startups.$inferInsert;
export type AlertRule = typeof alertRules.$inferSelect;
export type OutreachRecord = typeof outreach.$inferSelect;
