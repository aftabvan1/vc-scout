import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startups } from "@/lib/db/schema";
import { enrichStartup } from "@/lib/ai";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { startupId } = body;

    if (!startupId) {
      return NextResponse.json({ error: "startupId is required" }, { status: 400 });
    }

    const startup = db.select().from(startups).where(eq(startups.id, startupId)).get();
    if (!startup) {
      return NextResponse.json({ error: "Startup not found" }, { status: 404 });
    }

    const result = await enrichStartup({
      name: startup.name,
      description: startup.description,
      url: startup.url,
      founders: startup.founders,
      sector: startup.sector,
      source: startup.source,
      score: startup.score ?? 0,
    });

    // Store AI analysis in the ai_analysis table
    const { nanoid } = await import("nanoid");
    const sqlite = db as unknown as { run: (sql: string, ...params: unknown[]) => void };

    // Use raw SQL since we added the table outside Drizzle schema
    const dbAny = db as unknown as { all: { run: (query: string) => void } };
    try {
      const betterDb = (db as unknown as { _: { session: { client: { exec: (sql: string) => void; run: (sql: string, ...params: unknown[]) => unknown } } } })._.session.client;
      betterDb.run(
        `INSERT OR REPLACE INTO ai_analysis (id, startup_id, feed_item_key, ai_score, verdict, tags, enrichment_data, analyzed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        nanoid(),
        startupId,
        `${startup.source}:${startup.sourceId || startup.name}`,
        result.score,
        result.verdict,
        JSON.stringify(result.tags),
        JSON.stringify({
          sector: result.sector,
          stage: result.stage,
          competitiveLandscape: result.competitiveLandscape,
          founderInsights: result.founderInsights,
          recommendation: result.recommendation,
        }),
        new Date().toISOString()
      );
    } catch {
      // Table might not exist yet on first run, analysis still returned
      console.warn("Could not persist AI analysis to DB");
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI analyze error:", error);
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }
}
