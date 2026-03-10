"use client";

import { useEffect, useState, useCallback } from "react";

interface FeedItem {
  source: string;
  sourceId: string;
  name: string;
  url: string;
  description: string;
  score: number;
  sourceUrl: string;
  discoveredAt: string;
  founders: string;
  sector?: string;
  aiScore?: number;
  aiVerdict?: string;
  aiTags?: string[];
}

interface FeedResponse {
  items: FeedItem[];
  sources: Record<string, number>;
  fetchedAt: string;
}

const SRC: Record<string, { label: string; color: string }> = {
  hackernews: { label: "HN", color: "#FF6600" },
  producthunt: { label: "PH", color: "#DA552F" },
  rss: { label: "RSS", color: "var(--blue)" },
  github: { label: "GH", color: "#8B5CF6" },
  reddit: { label: "RD", color: "#FF4500" },
  manual: { label: "Manual", color: "var(--accent)" },
};

function aiScoreColor(score: number): string {
  if (score >= 70) return "var(--green)";
  if (score >= 40) return "var(--amber)";
  return "var(--red)";
}

export default function FeedPage() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("score");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiScores, setAiScores] = useState<Record<string, { score: number; verdict: string; tags: string[] }>>({});

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?sort=${sort}`);
      const data = await res.json();
      setFeed(data);
      // Load any existing AI scores from feed data
      const scores: Record<string, { score: number; verdict: string; tags: string[] }> = {};
      for (const item of data.items || []) {
        if (item.aiScore !== undefined) {
          scores[`${item.source}:${item.name}`] = {
            score: item.aiScore,
            verdict: item.aiVerdict || "",
            tags: item.aiTags || [],
          };
        }
      }
      if (Object.keys(scores).length > 0) {
        setAiScores((prev) => ({ ...prev, ...scores }));
      }
    } catch (err) {
      console.error("Failed to fetch feed:", err);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const saveToPipeline = async (item: FeedItem) => {
    setSaving(item.sourceId);
    try {
      await fetch("/api/startups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      setSaved((prev) => new Set([...prev, item.sourceId]));
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(null);
    }
  };

  const analyzeAll = async () => {
    if (!feed || analyzing) return;
    setAnalyzing(true);
    try {
      // Send top 20 items without AI scores for analysis
      const unscored = feed.items
        .filter((item) => !aiScores[`${item.source}:${item.name}`])
        .slice(0, 20);

      if (unscored.length === 0) {
        setAnalyzing(false);
        return;
      }

      const res = await fetch("/api/ai/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: unscored }),
      });
      const data = await res.json();
      if (data.scores) {
        setAiScores((prev) => ({ ...prev, ...data.scores }));
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredItems = feed?.items.filter((item) => {
    if (filter !== "all" && item.source !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || item.founders?.toLowerCase().includes(q);
    }
    return true;
  }) || [];

  // Apply AI sort client-side if sort=ai and we have scores
  const sortedItems = sort === "ai"
    ? [...filteredItems].sort((a, b) => {
      const aScore = aiScores[`${a.source}:${a.name}`]?.score ?? a.aiScore ?? -1;
      const bScore = aiScores[`${b.source}:${b.name}`]?.score ?? b.aiScore ?? -1;
      return bScore - aScore;
    })
    : filteredItems;

  const filters = [
    { key: "all", label: "All" },
    { key: "hackernews", label: "HN" },
    { key: "producthunt", label: "PH" },
    { key: "github", label: "GH" },
    { key: "reddit", label: "RD" },
    { key: "rss", label: "RSS" },
  ];

  const sortOptions = [
    { key: "score", label: "Engagement" },
    { key: "date", label: "Newest" },
    { key: "ai", label: "AI Score" },
  ];

  const totalSources = feed ? Object.values(feed.sources).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="p-6 max-w-[920px]">
      {/* Header */}
      <div className="flex items-end justify-between mb-5 ani">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Feed
          </h1>
          <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
            {feed ? `${totalSources} startups from ${Object.keys(feed.sources).filter((k) => feed.sources[k] > 0).length} sources` : "Loading..."}
            {feed && ` — synced ${new Date(feed.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={analyzeAll}
            disabled={analyzing || !feed}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-[6px] rounded-md cursor-pointer transition-all duration-100"
            style={{
              background: analyzing ? "var(--bg-overlay)" : "rgba(139,92,246,0.12)",
              color: analyzing ? "var(--text-muted)" : "#8B5CF6",
              border: "1px solid rgba(139,92,246,0.2)",
            }}
          >
            {analyzing ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                  <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
                AI Analyze
              </>
            )}
          </button>
          <button onClick={fetchFeed} disabled={loading} className="btn-primary flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={loading ? "animate-spin" : ""}>
              <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            {loading ? "Syncing" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 ani" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-[2px] p-[3px] rounded-md" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-2.5 py-1 rounded text-[11px] font-medium transition-all duration-100 cursor-pointer"
              style={{
                background: filter === f.key ? "var(--bg-hover)" : "transparent",
                color: filter === f.key ? "var(--text-primary)" : "var(--text-muted)",
              }}
            >
              {f.label}
              {f.key !== "all" && feed?.sources[f.key] ? (
                <span className="ml-1 tabular-nums" style={{ fontFamily: "var(--font-geist-mono)", fontSize: "9px", opacity: 0.6 }}>
                  {feed.sources[f.key]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-[2px] p-[3px] rounded-md" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          {sortOptions.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className="px-2 py-1 rounded text-[10px] font-medium transition-all duration-100 cursor-pointer"
              style={{
                background: sort === s.key ? "var(--bg-hover)" : "transparent",
                color: sort === s.key ? "var(--text-primary)" : "var(--text-muted)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-[12px] flex-1"
          style={{ background: "var(--bg-surface)", maxWidth: 200 }}
        />
      </div>

      {/* Feed List */}
      {loading && !feed ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 rounded-full border-[1.5px] border-t-transparent animate-spin" style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }} />
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden ani" style={{ animationDelay: "0.1s", border: "1px solid var(--border)" }}>
          {sortedItems.map((item, i) => {
            const isSaved = saved.has(item.sourceId);
            const isSaving = saving === item.sourceId;
            const src = SRC[item.source] || SRC.manual;
            const ai = aiScores[`${item.source}:${item.name}`] || (item.aiScore !== undefined ? { score: item.aiScore, verdict: item.aiVerdict || "", tags: item.aiTags || [] } : null);

            return (
              <div
                key={`${item.source}-${item.sourceId}-${i}`}
                className="flex items-start gap-3 px-4 py-3 transition-colors duration-100"
                style={{
                  background: "var(--bg-surface)",
                  borderBottom: i < sortedItems.length - 1 ? "1px solid var(--border)" : "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-raised)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-surface)")}
              >
                {/* Source indicator */}
                <div className="shrink-0 pt-0.5">
                  <span
                    className="text-[9px] font-bold tracking-wider w-[26px] h-[18px] rounded flex items-center justify-center"
                    style={{ background: `${src.color}18`, color: src.color }}
                  >
                    {src.label}
                  </span>
                </div>

                {/* AI Score */}
                {ai && (
                  <div className="shrink-0 pt-0.5 w-[36px] text-center" title={ai.verdict}>
                    <div
                      className="text-[13px] font-bold tabular-nums leading-none"
                      style={{ fontFamily: "var(--font-geist-mono)", color: aiScoreColor(ai.score) }}
                    >
                      {ai.score}
                    </div>
                    <div className="text-[7px] uppercase tracking-wider mt-0.5" style={{ color: "var(--text-muted)" }}>AI</div>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] font-semibold hover:underline decoration-1 underline-offset-2 truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.name}
                    </a>
                    {item.score > 0 && (
                      <span className="text-[10px] tabular-nums shrink-0" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
                        {item.score}pt
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-[11px] leading-[1.5] mb-1 line-clamp-1" style={{ color: "var(--text-secondary)" }}>
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[10px] flex-wrap" style={{ color: "var(--text-muted)" }}>
                    {item.founders && <span>{item.founders}</span>}
                    {item.sector && <span>{item.sector}</span>}
                    <span className="tabular-nums" style={{ fontFamily: "var(--font-geist-mono)" }}>{fmtDate(item.discoveredAt)}</span>
                    {ai && ai.verdict && (
                      <span className="italic text-[9px]" style={{ color: "var(--text-secondary)" }}>
                        {ai.verdict.length > 60 ? ai.verdict.slice(0, 60) + "..." : ai.verdict}
                      </span>
                    )}
                  </div>
                  {ai && ai.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {ai.tags.map((tag) => (
                        <span key={tag} className="text-[8px] font-medium px-1.5 py-[1px] rounded" style={{ background: "rgba(139,92,246,0.08)", color: "#8B5CF6" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2 pt-0.5">
                  <a
                    href={item.sourceUrl || item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] hover:underline"
                    style={{ color: "var(--text-muted)" }}
                  >
                    src
                  </a>
                  <button
                    onClick={() => !isSaved && saveToPipeline(item)}
                    disabled={isSaved || isSaving}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded cursor-pointer transition-all duration-100"
                    style={{
                      background: isSaved ? "rgba(34, 197, 94, 0.1)" : "var(--accent-muted)",
                      color: isSaved ? "var(--green)" : "var(--accent)",
                      opacity: isSaving ? 0.5 : 1,
                    }}
                  >
                    {isSaved ? "Saved" : isSaving ? "..." : "Save"}
                  </button>
                </div>
              </div>
            );
          })}

          {sortedItems.length === 0 && !loading && (
            <div className="text-center py-12" style={{ background: "var(--bg-surface)" }}>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>No results</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function fmtDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const hrs = Math.floor((now.getTime() - date.getTime()) / 3600000);
  if (hrs < 1) return "now";
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
