import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startups } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const source = searchParams.get("source");

  let query = db.select().from(startups);

  if (stage) {
    query = query.where(eq(startups.stage, stage)) as typeof query;
  }
  if (source) {
    query = query.where(eq(startups.source, source)) as typeof query;
  }

  const results = query.all();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const id = nanoid();
  const startup = {
    id,
    source: body.source || "manual",
    sourceId: body.sourceId || null,
    name: body.name,
    url: body.url || null,
    description: body.description || null,
    founders: body.founders || null,
    sector: body.sector || null,
    stage: body.stage || "discovered",
    score: body.score || 0,
    sourceUrl: body.sourceUrl || null,
    discoveredAt: body.discoveredAt || new Date().toISOString(),
    notes: body.notes || null,
    archived: 0,
  };

  db.insert(startups).values(startup).run();

  return NextResponse.json(startup, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  updates.updatedAt = new Date().toISOString();

  db.update(startups).set(updates).where(eq(startups.id, id)).run();

  const updated = db.select().from(startups).where(eq(startups.id, id)).get();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  db.delete(startups).where(eq(startups.id, id)).run();
  return NextResponse.json({ success: true });
}
