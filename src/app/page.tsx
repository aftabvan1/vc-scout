"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  submittedThisMonth: number;
  totalStartups: number;
  addedThisMonth: number;
  stages: Record<string, number>;
  outreachByStatus: Record<string, number>;
  recentActivity: Array<{
    id: string;
    name: string;
    stage: string;
    source: string;
    updatedAt: string;
    createdAt: string;
  }>;
  sources: Record<string, number>;
}

const STAGES: { key: string; label: string; color: string }[] = [
  { key: "discovered", label: "Discovered", color: "var(--blue)" },
  { key: "researching", label: "Researching", color: "var(--amber)" },
  { key: "reached_out", label: "Reached Out", color: "var(--purple)" },
  { key: "submitted", label: "Submitted", color: "var(--green)" },
  { key: "passed", label: "Passed", color: "var(--text-muted)" },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 rounded-full border-[1.5px] border-t-transparent animate-spin" style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const submitted = stats?.submittedThisMonth || 0;
  const month = new Date().toLocaleString("default", { month: "short" }).toUpperCase();

  return (
    <div className="p-6 max-w-[960px]">
      {/* Header */}
      <div className="mb-8 ani">
        <h1
          className="text-[28px] font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Overview
        </h1>
        <p className="text-[12px] mt-1 font-mono tabular-nums" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Monthly Stats */}
      <div
        className="grid grid-cols-3 gap-[1px] mb-5 ani rounded-lg overflow-hidden"
        style={{ animationDelay: "0.05s", background: "var(--border)" }}
      >
        <div className="py-4 px-5" style={{ background: "var(--bg-surface)" }}>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: "var(--text-muted)" }}>
            {month} SUBMITTED
          </div>
          <div
            className="text-[32px] font-bold leading-none tabular-nums"
            style={{ fontFamily: "var(--font-geist-mono)", color: submitted > 0 ? "var(--green)" : "var(--text-primary)" }}
          >
            {submitted}
          </div>
        </div>
        <div className="py-4 px-5" style={{ background: "var(--bg-surface)" }}>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: "var(--text-muted)" }}>
            IN PIPELINE
          </div>
          <div
            className="text-[32px] font-bold leading-none tabular-nums"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {stats?.totalStartups || 0}
          </div>
        </div>
        <div className="py-4 px-5" style={{ background: "var(--bg-surface)" }}>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] mb-2" style={{ color: "var(--text-muted)" }}>
            {month} ADDED
          </div>
          <div
            className="text-[32px] font-bold leading-none tabular-nums"
            style={{ fontFamily: "var(--font-geist-mono)" }}
          >
            {stats?.addedThisMonth || 0}
          </div>
        </div>
      </div>

      {/* Stage Counts */}
      <div className="grid grid-cols-5 gap-[1px] mb-5 ani rounded-lg overflow-hidden" style={{ animationDelay: "0.1s", background: "var(--border)" }}>
        {STAGES.map((stage) => (
          <div key={stage.key} className="py-4 px-4" style={{ background: "var(--bg-surface)" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-[5px] h-[5px] rounded-full" style={{ background: stage.color }} />
              <span className="text-[10px] font-medium uppercase tracking-[0.04em]" style={{ color: "var(--text-secondary)" }}>
                {stage.label}
              </span>
            </div>
            <div
              className="text-[24px] font-bold tabular-nums leading-none"
              style={{ fontFamily: "var(--font-geist-mono)" }}
            >
              {stats?.stages[stage.key] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div
        className="rounded-lg overflow-hidden ani"
        style={{ animationDelay: "0.15s", background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--text-secondary)" }}>
            Recent Activity
          </span>
          <Link href="/pipeline" className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
            View all &rarr;
          </Link>
        </div>

        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <div>
            {stats.recentActivity.map((item, i) => {
              const stage = STAGES.find((s) => s.key === item.stage);
              return (
                <Link
                  key={item.id}
                  href={`/startup/${item.id}`}
                  className="flex items-center justify-between px-4 py-2.5 transition-colors duration-100 group"
                  style={{
                    borderBottom: i < stats.recentActivity.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-raised)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: stage?.color || "var(--text-muted)" }} />
                    <span className="text-[12px] font-medium truncate group-hover:underline decoration-1 underline-offset-2" style={{ color: "var(--text-primary)" }}>
                      {item.name}
                    </span>
                    <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                      {stage?.label}
                    </span>
                  </div>
                  <span className="text-[10px] tabular-nums shrink-0 ml-4" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
                    {formatTime(item.updatedAt || item.createdAt)}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-10 text-center">
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
              No activity yet — start scouting from the <Link href="/feed" className="underline" style={{ color: "var(--text-secondary)" }}>Feed</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
