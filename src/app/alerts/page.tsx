"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface AlertRule { id: string; name: string; sectors: string | null; keywords: string | null; minScore: number | null; isActive: number | null; createdAt: string | null; }
interface AlertMatch { id: string; alertRuleId: string | null; startupId: string | null; matchedAt: string | null; dismissed: number | null; }
interface Startup { id: string; name: string; source: string; score: number; stage: string; }

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [matches, setMatches] = useState<AlertMatch[]>([]);
  const [startups, setStartups] = useState<Record<string, Startup>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", keywords: "", sectors: "", minScore: 0 });

  const fetchData = useCallback(async () => {
    try {
      const [aRes, sRes] = await Promise.all([fetch("/api/alerts"), fetch("/api/startups")]);
      const aData = await aRes.json();
      const sData = await sRes.json();
      setRules(aData.rules);
      setMatches(aData.matches);
      const map: Record<string, Startup> = {};
      for (const s of sData) map[s.id] = s;
      setStartups(map);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createRule = async () => {
    if (!form.name) return;
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        keywords: form.keywords ? form.keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
        sectors: form.sectors ? form.sectors.split(",").map((s) => s.trim()).filter(Boolean) : [],
        minScore: form.minScore,
      }),
    });
    setShowForm(false);
    setForm({ name: "", keywords: "", sectors: "", minScore: 0 });
    fetchData();
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 rounded-full border-[1.5px] border-t-transparent animate-spin" style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[720px]">
      <div className="flex items-end justify-between mb-5 ani">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Alerts</h1>
          <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
            {rules.length} rules &middot; {matches.filter((m) => !m.dismissed).length} matches
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Rule</button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-lg p-4 mb-4 ani" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Rule Name</label>
              <input type="text" placeholder="e.g. AI Startups" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Min Score</label>
              <input type="number" placeholder="0" value={form.minScore} onChange={(e) => setForm({ ...form, minScore: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Keywords (comma-separated)</label>
            <input type="text" placeholder="AI, LLM, GPT" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Sectors (comma-separated)</label>
            <input type="text" placeholder="SaaS, Fintech" value={form.sectors} onChange={(e) => setForm({ ...form, sectors: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={createRule} disabled={!form.name} className="btn-primary">Create</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-2 ani" style={{ animationDelay: "0.05s" }}>
        {rules.map((rule) => {
          const ruleMatches = matches.filter((m) => m.alertRuleId === rule.id && !m.dismissed);
          const keywords = rule.keywords ? JSON.parse(rule.keywords) as string[] : [];
          const sectors = rule.sectors ? JSON.parse(rule.sectors) as string[] : [];

          return (
            <div key={rule.id} className="rounded-lg overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-[5px] h-[5px] rounded-full" style={{ background: rule.isActive ? "var(--green)" : "var(--text-muted)" }} />
                    <span className="text-[13px] font-semibold">{rule.name}</span>
                    {ruleMatches.length > 0 && (
                      <span className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded" style={{ background: "var(--accent-muted)", color: "var(--accent)", fontFamily: "var(--font-geist-mono)" }}>
                        {ruleMatches.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {keywords.map((kw) => (
                      <span key={kw} className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.08)", color: "var(--blue)" }}>{kw}</span>
                    ))}
                    {sectors.map((s) => (
                      <span key={s} className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.08)", color: "var(--purple)" }}>{s}</span>
                    ))}
                    {(rule.minScore ?? 0) > 0 && (
                      <span className="text-[9px] tabular-nums" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
                        &ge;{rule.minScore}pt
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-1.5 rounded transition-opacity duration-100 cursor-pointer opacity-30 hover:opacity-100"
                  style={{ color: "var(--red)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {ruleMatches.length > 0 && (
                <div className="px-4 pb-3">
                  {ruleMatches.map((m) => {
                    const s = m.startupId ? startups[m.startupId] : null;
                    if (!s) return null;
                    return (
                      <Link
                        key={m.id}
                        href={`/startup/${s.id}`}
                        className="flex items-center justify-between py-1.5 px-2 rounded transition-colors duration-100 group"
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-raised)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <span className="text-[11px] font-medium group-hover:underline decoration-1 underline-offset-2">{s.name}</span>
                        <span className="text-[9px] tabular-nums" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>{s.score}pt</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {rules.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[12px] mb-3" style={{ color: "var(--text-muted)" }}>No alert rules yet</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">Create first rule</button>
          </div>
        )}
      </div>
    </div>
  );
}
