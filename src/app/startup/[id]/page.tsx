"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Startup {
  id: string; name: string; source: string; sourceId: string | null; description: string | null;
  stage: string; score: number; url: string | null; sourceUrl: string | null; founders: string | null;
  sector: string | null; discoveredAt: string; notes: string | null; archived: number | null;
  createdAt: string | null; updatedAt: string | null;
}

interface OutreachRecord {
  id: string; startupId: string | null; contactName: string | null; contactEmail: string | null;
  contactLinkedin: string | null; channel: string | null; status: string | null; sentAt: string | null;
  lastFollowup: string | null; notes: string | null; createdAt: string | null;
}

interface AIEnrichment {
  score: number;
  verdict: string;
  tags: string[];
  sector: string;
  stage: string;
  competitiveLandscape: string;
  founderInsights: string;
  recommendation: string;
}

const STAGES = [
  { key: "discovered", label: "Discovered", color: "var(--blue)" },
  { key: "researching", label: "Researching", color: "var(--amber)" },
  { key: "reached_out", label: "Reached Out", color: "var(--purple)" },
  { key: "submitted", label: "Submitted", color: "var(--green)" },
  { key: "passed", label: "Passed", color: "var(--text-muted)" },
];

const STATUS: Record<string, { label: string; color: string }> = {
  drafted: { label: "Draft", color: "var(--text-muted)" },
  sent: { label: "Sent", color: "var(--blue)" },
  replied: { label: "Replied", color: "var(--green)" },
  meeting_scheduled: { label: "Meeting", color: "var(--purple)" },
  no_response: { label: "No Reply", color: "var(--red)" },
};

const SRC: Record<string, string> = { hackernews: "Hacker News", producthunt: "Product Hunt", rss: "RSS", github: "GitHub", reddit: "Reddit", manual: "Manual" };

const REC_COLORS: Record<string, { bg: string; color: string }> = {
  "strong-interest": { bg: "rgba(34,197,94,0.1)", color: "var(--green)" },
  "research": { bg: "rgba(59,130,246,0.1)", color: "var(--blue)" },
  "watch": { bg: "rgba(245,158,11,0.1)", color: "var(--amber)" },
  "pass": { bg: "rgba(239,68,68,0.1)", color: "var(--red)" },
};

export default function StartupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [startup, setStartup] = useState<Startup | null>(null);
  const [outreach, setOutreach] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ contactName: "", contactEmail: "", contactLinkedin: "", channel: "email", notes: "" });
  const [aiData, setAiData] = useState<AIEnrichment | null>(null);
  const [enriching, setEnriching] = useState(false);

  const fetchData = useCallback(async () => {
    const [sRes, oRes] = await Promise.all([fetch("/api/startups"), fetch(`/api/outreach?startupId=${id}`)]);
    const sData = await sRes.json();
    const oData = await oRes.json();
    const found = sData.find((s: Startup) => s.id === id);
    setStartup(found || null);
    setNotes(found?.notes || "");
    setOutreach(oData);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setStage = async (stage: string) => {
    if (!startup) return;
    await fetch("/api/startups", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: startup.id, stage }) });
    setStartup({ ...startup, stage });
  };

  const saveNotes = async () => {
    if (!startup) return;
    await fetch("/api/startups", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: startup.id, notes }) });
    setStartup({ ...startup, notes });
    setEditingNotes(false);
  };

  const createOutreach = async () => {
    if (!startup) return;
    await fetch("/api/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startupId: startup.id, ...form }) });
    setShowForm(false);
    setForm({ contactName: "", contactEmail: "", contactLinkedin: "", channel: "email", notes: "" });
    fetchData();
  };

  const del = async () => {
    if (!startup) return;
    await fetch(`/api/startups?id=${startup.id}`, { method: "DELETE" });
    router.push("/pipeline");
  };

  const enrichWithAI = async () => {
    if (!startup || enriching) return;
    setEnriching(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupId: startup.id }),
      });
      const data = await res.json();
      if (data.score !== undefined) {
        setAiData(data);
      }
    } catch (err) {
      console.error("Enrichment failed:", err);
    } finally {
      setEnriching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 rounded-full border-[1.5px] border-t-transparent animate-spin" style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-[13px] mb-2" style={{ color: "var(--text-secondary)" }}>Not found</p>
          <Link href="/pipeline" className="text-[12px] underline" style={{ color: "var(--text-muted)" }}>Back</Link>
        </div>
      </div>
    );
  }

  const stageIdx = STAGES.findIndex((s) => s.key === startup.stage);
  const recStyle = aiData ? REC_COLORS[aiData.recommendation] || REC_COLORS.watch : null;

  return (
    <div className="p-6 max-w-[780px]">
      {/* Breadcrumb */}
      <Link href="/pipeline" className="inline-flex items-center gap-1 text-[11px] mb-5 ani" style={{ color: "var(--text-muted)" }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Pipeline
      </Link>

      {/* Header */}
      <div className="mb-6 ani" style={{ animationDelay: "0.03s" }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>{SRC[startup.source] || startup.source}</span>
          {startup.score > 0 && (
            <span className="text-[10px] tabular-nums" style={{ color: "var(--amber)", fontFamily: "var(--font-geist-mono)" }}>{startup.score}pt</span>
          )}
          <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>{fmtDate(startup.discoveredAt)}</span>
        </div>
        <h1 className="text-[30px] font-bold tracking-tight leading-tight" style={{ fontFamily: "var(--font-display)" }}>
          {startup.name}
        </h1>
        {startup.description && (
          <p className="text-[13px] leading-relaxed mt-1.5 max-w-[600px]" style={{ color: "var(--text-secondary)" }}>{startup.description}</p>
        )}
      </div>

      {/* Stage selector */}
      <div className="flex gap-[2px] mb-5 ani rounded-md overflow-hidden" style={{ animationDelay: "0.06s", border: "1px solid var(--border)" }}>
        {STAGES.map((s, i) => {
          const active = s.key === startup.stage;
          const past = i < stageIdx;
          return (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              className="flex-1 py-2.5 text-center cursor-pointer transition-all duration-150 relative"
              style={{
                background: active ? "var(--bg-raised)" : "var(--bg-surface)",
                borderBottom: active ? `2px solid ${s.color}` : "2px solid transparent",
              }}
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: active ? s.color : past ? "var(--text-secondary)" : "var(--text-muted)" }}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* AI Enrichment Card */}
      <div className="rounded-lg p-4 mb-5 ani" style={{ animationDelay: "0.08s", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: "#8B5CF6" }}>AI Analysis</span>
          </div>
          <button
            onClick={enrichWithAI}
            disabled={enriching}
            className="text-[10px] font-medium px-2.5 py-1 rounded cursor-pointer transition-all duration-100"
            style={{
              background: enriching ? "var(--bg-overlay)" : "rgba(139,92,246,0.1)",
              color: enriching ? "var(--text-muted)" : "#8B5CF6",
              border: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            {enriching ? "Analyzing..." : aiData ? "Re-analyze" : "Enrich with AI"}
          </button>
        </div>

        {aiData ? (
          <div className="space-y-3">
            {/* Score + Recommendation */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div
                  className="text-[28px] font-bold tabular-nums leading-none"
                  style={{
                    fontFamily: "var(--font-geist-mono)",
                    color: aiData.score >= 70 ? "var(--green)" : aiData.score >= 40 ? "var(--amber)" : "var(--red)",
                  }}
                >
                  {aiData.score}
                </div>
                <div className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: "var(--text-muted)" }}>Score</div>
              </div>
              {recStyle && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded"
                  style={{ background: recStyle.bg, color: recStyle.color }}
                >
                  {aiData.recommendation.replace("-", " ")}
                </span>
              )}
              {aiData.stage && (
                <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "var(--bg-overlay)", color: "var(--text-secondary)" }}>
                  {aiData.stage}
                </span>
              )}
            </div>

            {/* Verdict */}
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {aiData.verdict}
            </p>

            {/* Tags */}
            {aiData.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {aiData.tags.map((tag) => (
                  <span key={tag} className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.08)", color: "#8B5CF6" }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              {aiData.sector && (
                <div>
                  <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>AI Sector</div>
                  <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{aiData.sector}</div>
                </div>
              )}
              {aiData.competitiveLandscape && (
                <div>
                  <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Competition</div>
                  <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{aiData.competitiveLandscape}</div>
                </div>
              )}
              {aiData.founderInsights && (
                <div className="col-span-2">
                  <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Founder Insights</div>
                  <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>{aiData.founderInsights}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Click &ldquo;Enrich with AI&rdquo; to get an AI-powered analysis including investment score, competitive landscape, and recommendation.
          </p>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* Details */}
        <div className="rounded-lg p-4 ani" style={{ animationDelay: "0.09s", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="text-[9px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: "var(--text-muted)" }}>Details</div>
          <div className="space-y-2.5">
            {startup.url && (
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Website</div>
                <a href={startup.url} target="_blank" rel="noopener noreferrer" className="text-[12px] hover:underline decoration-1 underline-offset-2" style={{ color: "var(--accent)" }}>
                  {startup.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              </div>
            )}
            {startup.founders && (
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Founders</div>
                <div className="text-[12px]">{startup.founders}</div>
              </div>
            )}
            {startup.sector && (
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Sector</div>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.08)", color: "var(--purple)" }}>{startup.sector}</span>
              </div>
            )}
            {startup.sourceUrl && (
              <div>
                <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Source</div>
                <a href={startup.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] hover:underline decoration-1 underline-offset-2" style={{ color: "var(--blue)" }}>
                  Original post &rarr;
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-lg p-4 ani" style={{ animationDelay: "0.12s", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>Notes</div>
            {!editingNotes && (
              <button onClick={() => setEditingNotes(true)} className="text-[10px] cursor-pointer" style={{ color: "var(--text-muted)" }}>Edit</button>
            )}
          </div>
          {editingNotes ? (
            <div>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="resize-none mb-2 text-[12px]" placeholder="Research notes..." autoFocus />
              <div className="flex gap-2">
                <button onClick={saveNotes} className="btn-primary">Save</button>
                <button onClick={() => { setEditingNotes(false); setNotes(startup.notes || ""); }} className="btn-ghost">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: startup.notes ? "var(--text-secondary)" : "var(--text-muted)" }}>
              {startup.notes || "No notes yet."}
            </p>
          )}
        </div>
      </div>

      {/* Outreach */}
      <div className="rounded-lg overflow-hidden mb-5 ani" style={{ animationDelay: "0.15s", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
            Outreach &middot; {outreach.length}
          </span>
          <button onClick={() => setShowForm(!showForm)} className="btn-ghost text-[10px] py-1 px-2">+ Log</button>
        </div>

        {showForm && (
          <div className="p-4" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-raised)" }}>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="text" placeholder="Name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="text-[12px]" />
              <input type="email" placeholder="Email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="text-[12px]" />
              <input type="text" placeholder="LinkedIn" value={form.contactLinkedin} onChange={(e) => setForm({ ...form, contactLinkedin: e.target.value })} className="text-[12px]" />
              <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} className="text-[12px]">
                <option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="twitter">Twitter</option><option value="intro">Intro</option><option value="other">Other</option>
              </select>
            </div>
            <textarea rows={2} placeholder="Notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="resize-none mb-2 text-[12px]" />
            <div className="flex gap-2">
              <button onClick={createOutreach} className="btn-primary">Save</button>
              <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}

        {outreach.length > 0 ? outreach.map((r, i) => {
          const st = STATUS[r.status || "drafted"];
          return (
            <div key={r.id} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: i < outreach.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="flex items-center gap-2.5">
                <span className="w-[5px] h-[5px] rounded-full" style={{ background: st?.color }} />
                <div>
                  <span className="text-[12px] font-medium">{r.contactName || "Unknown"}</span>
                  <span className="text-[10px] ml-2" style={{ color: "var(--text-muted)" }}>{r.channel}{r.contactEmail ? ` — ${r.contactEmail}` : ""}</span>
                </div>
              </div>
              <span className="text-[9px] font-medium" style={{ color: st?.color }}>{st?.label}</span>
            </div>
          );
        }) : (
          <div className="py-6 text-center">
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>No outreach yet</p>
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="flex items-center justify-between px-4 py-3 rounded-lg ani" style={{ animationDelay: "0.18s", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Remove from pipeline</span>
        <button onClick={del} className="text-[11px] font-medium px-2.5 py-1 rounded cursor-pointer" style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)" }}>
          Delete
        </button>
      </div>
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const hrs = Math.floor((now.getTime() - date.getTime()) / 3600000);
  if (hrs < 1) return "now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
