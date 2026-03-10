import { NextRequest, NextResponse } from "next/server";
import { batchScore, type AIScoreResult } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    // Limit batch size to 20
    const toProcess = items.slice(0, 20);
    const results = await batchScore(toProcess);

    // Convert Map to plain object for JSON response
    const scores: Record<string, AIScoreResult> = {};
    for (const [key, value] of results) {
      scores[key] = value;
    }

    return NextResponse.json({ scores, processed: toProcess.length });
  } catch (error) {
    console.error("AI batch error:", error);
    return NextResponse.json({ error: "Batch analysis failed" }, { status: 500 });
  }
}
