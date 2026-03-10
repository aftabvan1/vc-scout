"use client";

import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import Link from "next/link";

interface Startup {
  id: string;
  name: string;
  source: string;
  description: string | null;
  stage: string;
  score: number;
  url: string | null;
  sourceUrl: string | null;
  founders: string | null;
  sector: string | null;
  discoveredAt: string;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const COLS = [
  { key: "discovered", label: "Discovered", color: "var(--blue)" },
  { key: "researching", label: "Researching", color: "var(--amber)" },
  { key: "reached_out", label: "Reached Out", color: "var(--purple)" },
  { key: "submitted", label: "Submitted", color: "var(--green)" },
  { key: "passed", label: "Passed", color: "var(--text-muted)" },
];

const SRC: Record<string, { label: string; color: string }> = {
  hackernews: { label: "HN", color: "#FF6600" },
  producthunt: { label: "PH", color: "#DA552F" },
  rss: { label: "RSS", color: "var(--blue)" },
  manual: { label: "M", color: "var(--accent)" },
};

export default function PipelinePage() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStartups = useCallback(async () => {
    try {
      const res = await fetch("/api/startups");
      setStartups(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStartups(); }, [fetchStartups]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    setStartups((prev) => prev.map((s) => (s.id === draggableId ? { ...s, stage: newStage } : s)));
    try {
      await fetch("/api/startups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draggableId, stage: newStage }),
      });
    } catch { fetchStartups(); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-5 h-5 rounded-full border-[1.5px] border-t-transparent animate-spin" style={{ borderColor: "var(--text-muted)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="flex items-end justify-between mb-5 shrink-0 ani">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Pipeline
          </h1>
          <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
            {startups.length} startups
          </p>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-2 flex-1 overflow-x-auto pb-2 ani" style={{ animationDelay: "0.05s" }}>
          {COLS.map((col) => {
            const items = startups.filter((s) => s.stage === col.key);
            return (
              <div key={col.key} className="flex flex-col min-w-[220px] flex-1">
                {/* Column header */}
                <div className="flex items-center justify-between px-2 py-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-[6px] h-[6px] rounded-full" style={{ background: col.color }} />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--text-secondary)" }}>
                      {col.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold tabular-nums" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
                    {items.length}
                  </span>
                </div>

                <Droppable droppableId={col.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 rounded-lg p-1.5 transition-colors duration-150 overflow-y-auto"
                      style={{
                        background: snapshot.isDraggingOver ? "var(--bg-raised)" : "var(--bg-surface)",
                        border: `1px solid ${snapshot.isDraggingOver ? "var(--border-active)" : "var(--border)"}`,
                        minHeight: 120,
                      }}
                    >
                      {items.map((s, idx) => (
                        <Draggable key={s.id} draggableId={s.id} index={idx}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className="mb-1.5 rounded-md px-3 py-2.5 transition-shadow duration-100"
                              style={{
                                ...prov.draggableProps.style,
                                background: snap.isDragging ? "var(--bg-overlay)" : "var(--bg-raised)",
                                borderLeft: `2px solid ${col.color}`,
                                boxShadow: snap.isDragging ? "0 8px 32px rgba(0,0,0,0.5)" : "none",
                              }}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[8px] font-bold tracking-wider" style={{ color: SRC[s.source]?.color || "var(--text-muted)" }}>
                                  {SRC[s.source]?.label || "?"}
                                </span>
                                {s.score > 0 && (
                                  <span className="text-[9px] tabular-nums" style={{ color: "var(--text-muted)", fontFamily: "var(--font-geist-mono)" }}>
                                    {s.score}pt
                                  </span>
                                )}
                              </div>
                              <Link
                                href={`/startup/${s.id}`}
                                className="text-[12px] font-medium leading-snug block hover:underline decoration-1 underline-offset-2"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {s.name}
                              </Link>
                              {s.description && (
                                <p className="text-[10px] leading-relaxed mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                                  {s.description}
                                </p>
                              )}
                              {s.sector && (
                                <span className="text-[9px] mt-1 inline-block" style={{ color: "var(--text-muted)" }}>
                                  {s.sector}
                                </span>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && (
                        <div className="flex items-center justify-center py-6">
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Drop here</span>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
