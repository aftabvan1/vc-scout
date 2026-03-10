"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface OutreachRecord {
  id: string;
  startupId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactLinkedin: string | null;
  channel: string | null;
  status: string | null;
  sentAt: string | null;
  lastFollowup: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface Startup { id: string; name: string; source: string; stage: string; }

const STATUS: Record<string, { label: string; color: string }> = {
  drafted: { label: "Draft", color: "var(--text-muted)" },
  sent: { label: "Sent", color: "var(--blue)" },
  replied: { label: "Replied", color: "var(--green)" },
  meeting_scheduled: { label: "Meeting", color: "var(--purple)" },
  no_response: { label: "No Reply", color: "var(--red)" },
};

export default function OutreachPage() {
  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [startups, setStartups] = useState<Record<string, Startup>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [allStartups, setAllStartups] = useState<Startup[]>([]);
  const [form, setForm] = useState({ startupId: "", contactName: "", contactEmail: "", contactLinkedin: "", channel: "email", notes: "" });

  const fetchData = useCallback(async () => {
    try {
      const [oRes, sRes] = await Promise.all([fetch("/api/outreach"), fetch("/api/startups")]);
      const oData = await oRes.json();
      const sData = await sRes.json();
      setRecords(oData);
      setAllStartups(sData);
      const map: Record<string, Startup> = {};
      for (const s of sData) map[s.id] = s;
      setStartups(map);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const create = async () => {
    if (!form.startupId) return;
    await fetch("/api/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false);
    setForm({ startupId: "", contactName: "", contactEmail: "", contactLinkedin: "", channel: "email", notes: "" });
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/outreach", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, ...(status === "sent" ? { sentAt: new Date().toISOString() } : {}) }),
    });
    fetchData();
  };

  const filtered = filter === "all" ? records : records.filter((r) => r.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 rounded-full border-[1.5px] border-t-transparent animate-spin" style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[860px]">
      <div className="flex items-end justify-between mb-5 ani">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Outreach</h1>
          <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>{records.length} conversations</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ New</button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-lg p-4 mb-4 ani" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Startup</label>
              <select value={form.startupId} onChange={(e) => setForm({ ...form, startupId: e.target.value })}>
                <option value="">Select...</option>
                {allStartups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Channel</label>
              <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                <option value="email">Email</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">Twitter</option>
                <option value="intro">Intro</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Name</label>
              <input type="text" placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Email</label>
              <input type="email" placeholder="email@co.com" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>LinkedIn</label>
            <input type="text" placeholder="linkedin.com/in/..." value={form.contactLinkedin} onChange={(e) => setForm({ ...form, contactLinkedin: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="text-[10px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Notes</label>
            <textarea rows={2} placeholder="Context..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={!form.startupId} className="btn-primary">Create</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 ani" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-[2px] p-[3px] rounded-md" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <button onClick={() => setFilter("all")} className="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-all duration-100" style={{ background: filter === "all" ? "var(--bg-hover)" : "transparent", color: filter === "all" ? "var(--text-primary)" : "var(--text-muted)" }}>
            All
          </button>
          {Object.entries(STATUS).map(([key, cfg]) => (
            <button key={key} onClick={() => setFilter(key)} className="px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-all duration-100" style={{ background: filter === key ? "var(--bg-hover)" : "transparent", color: filter === key ? cfg.color : "var(--text-muted)" }}>
              {cfg.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[10px] tabular-nums" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
          {filtered.length}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden ani" style={{ animationDelay: "0.1s", border: "1px solid var(--border)" }}>
        {/* Header row */}
        <div className="grid grid-cols-[1fr_120px_100px_80px_80px] px-4 py-2" style={{ background: "var(--bg-raised)", borderBottom: "1px solid var(--border)" }}>
          {["Contact", "Startup", "Channel", "Status", ""].map((h) => (
            <span key={h} className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>{h}</span>
          ))}
        </div>

        {filtered.map((r, i) => {
          const startup = r.startupId ? startups[r.startupId] : null;
          const st = STATUS[r.status || "drafted"];
          return (
            <div
              key={r.id}
              className="grid grid-cols-[1fr_120px_100px_80px_80px] items-center px-4 py-2.5 transition-colors duration-100"
              style={{
                background: "var(--bg-surface)",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-raised)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-surface)")}
            >
              <div className="min-w-0">
                <div className="text-[12px] font-medium truncate">{r.contactName || "—"}</div>
                <div className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{r.contactEmail || ""}</div>
              </div>
              <div className="truncate">
                {startup ? (
                  <Link href={`/startup/${startup.id}`} className="text-[11px] hover:underline decoration-1 underline-offset-2" style={{ color: "var(--text-secondary)" }}>
                    {startup.name}
                  </Link>
                ) : <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>—</span>}
              </div>
              <span className="text-[10px] capitalize" style={{ color: "var(--text-secondary)" }}>{r.channel || "—"}</span>
              <div className="flex items-center gap-1">
                <span className="w-[5px] h-[5px] rounded-full" style={{ background: st?.color }} />
                <span className="text-[10px] font-medium" style={{ color: st?.color }}>{st?.label}</span>
              </div>
              <select
                value={r.status || "drafted"}
                onChange={(e) => updateStatus(r.id, e.target.value)}
                className="text-[10px] px-1.5 py-0.5 rounded cursor-pointer"
                style={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", color: "var(--text-secondary)", width: "auto", fontSize: "10px" }}
              >
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-10" style={{ background: "var(--bg-surface)" }}>
            <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>No outreach records</p>
          </div>
        )}
      </div>
    </div>
  );
}
