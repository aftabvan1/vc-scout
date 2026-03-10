"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Overview", href: "/", key: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { label: "Feed", href: "/feed", key: "M12 6v6m0 0v6m0-6h6m-6 0H6" },
  { label: "Pipeline", href: "/pipeline", key: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { label: "Outreach", href: "/outreach", key: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { label: "Alerts", href: "/alerts", key: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[200px] flex flex-col z-20"
      style={{ background: `var(--bg-surface)`, borderRight: `1px solid var(--border)` }}
    >
      <div className="px-5 pt-6 pb-7">
        <div
          className="text-[13px] font-extrabold tracking-[0.08em] uppercase"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Scout
        </div>
        <div className="text-[10px] mt-0.5 tracking-[0.04em]" style={{ color: "var(--text-muted)" }}>
          Deal Sourcing
        </div>
      </div>

      <nav className="flex-1 px-2">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-[7px] rounded-md mb-[1px] transition-all duration-150 group"
              style={{
                background: active ? "var(--bg-hover)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {active && (
                <span
                  className="w-[3px] h-[3px] rounded-full shrink-0"
                  style={{ background: "var(--accent)" }}
                />
              )}
              {!active && <span className="w-[3px] shrink-0" />}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: active ? 1 : 0.5 }}>
                <path d={item.key} />
              </svg>
              <span className="text-[12px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
