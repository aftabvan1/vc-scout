import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { outreach } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startupId = searchParams.get("startupId");

  if (startupId) {
    const results = db.select().from(outreach).where(eq(outreach.startupId, startupId)).all();
    return NextResponse.json(results);
  }

  const results = db.select().from(outreach).all();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const record = {
    id: nanoid(),
    startupId: body.startupId,
    contactName: body.contactName || null,
    contactEmail: body.contactEmail || null,
    contactLinkedin: body.contactLinkedin || null,
    channel: body.channel || "email",
    status: body.status || "drafted",
    sentAt: body.sentAt || null,
    lastFollowup: body.lastFollowup || null,
    notes: body.notes || null,
  };

  db.insert(outreach).values(record).run();
  return NextResponse.json(record, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  updates.updatedAt = new Date().toISOString();
  db.update(outreach).set(updates).where(eq(outreach.id, id)).run();

  const updated = db.select().from(outreach).where(eq(outreach.id, id)).get();
  return NextResponse.json(updated);
}
