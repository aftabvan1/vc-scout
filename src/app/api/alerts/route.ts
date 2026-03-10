import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alertRules, alertMatches } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

export async function GET() {
  const rules = db.select().from(alertRules).all();
  const matches = db.select().from(alertMatches).all();
  return NextResponse.json({ rules, matches });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const rule = {
    id: nanoid(),
    name: body.name,
    sectors: body.sectors ? JSON.stringify(body.sectors) : null,
    keywords: body.keywords ? JSON.stringify(body.keywords) : null,
    minScore: body.minScore || 0,
    isActive: 1,
  };

  db.insert(alertRules).values(rule).run();
  return NextResponse.json(rule, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  db.delete(alertMatches).where(eq(alertMatches.alertRuleId, id)).run();
  db.delete(alertRules).where(eq(alertRules.id, id)).run();
  return NextResponse.json({ success: true });
}
