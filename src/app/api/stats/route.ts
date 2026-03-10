import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startups, outreach } from "@/lib/db/schema";
import { sql, gte } from "drizzle-orm";

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // All startups
  const allStartups = db.select().from(startups).all();

  // This month's submissions
  const submitted = allStartups.filter(
    (s) => s.stage === "submitted" && s.updatedAt && s.updatedAt >= monthStart
  );

  // Stage breakdown
  const stages = {
    discovered: 0,
    researching: 0,
    reached_out: 0,
    submitted: 0,
    passed: 0,
  };

  for (const s of allStartups) {
    if (s.stage in stages) {
      stages[s.stage as keyof typeof stages]++;
    }
  }

  // This month's activity
  const monthlyStartups = allStartups.filter((s) => s.createdAt && s.createdAt >= monthStart);

  // Outreach stats
  const allOutreach = db.select().from(outreach).all();
  const outreachByStatus: Record<string, number> = {};
  for (const o of allOutreach) {
    const status = o.status || "drafted";
    outreachByStatus[status] = (outreachByStatus[status] || 0) + 1;
  }

  // Recent activity (last 10 startups added)
  const recentActivity = allStartups
    .sort((a, b) => {
      const aDate = a.updatedAt || a.createdAt || "";
      const bDate = b.updatedAt || b.createdAt || "";
      return bDate.localeCompare(aDate);
    })
    .slice(0, 10);

  // Source breakdown
  const sources: Record<string, number> = {};
  for (const s of allStartups) {
    sources[s.source] = (sources[s.source] || 0) + 1;
  }

  return NextResponse.json({
    submittedThisMonth: submitted.length,
    totalStartups: allStartups.length,
    addedThisMonth: monthlyStartups.length,
    stages,
    outreachByStatus,
    recentActivity,
    sources,
  });
}
