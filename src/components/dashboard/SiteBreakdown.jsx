import React from "react";
import { cn } from "@/lib/utils";
import { SITES } from "@/lib/sites";

export default function SiteBreakdown({ counts = {} }) {
  const entries = Object.keys(SITES).map((k) => ({
    key: k,
    ...SITES[k],
    working: counts[k]?.working || 0,
    failed: counts[k]?.failed || 0,
    total: (counts[k]?.working || 0) + (counts[k]?.failed || 0),
  }));
  const maxTotal = Math.max(...entries.map((e) => e.total), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Site breakdown</h3>
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">by credential</span>
      </div>

      <div className="space-y-4">
        {entries.map((e) => {
          const pct = e.total ? (e.working / e.total) * 100 : 0;
          return (
            <div key={e.key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", e.dot)} />
                  <span className="text-sm">{e.label}</span>
                </div>
                <div className="text-xs font-mono text-muted-foreground tabular-nums">
                  <span className="text-emerald-300">{e.working}</span>
                  <span className="mx-1 text-muted-foreground/40">/</span>
                  <span>{e.total}</span>
                </div>
              </div>
              <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary">
                <div
                  className={cn("bg-emerald-400/80 transition-all")}
                  style={{ width: `${(e.working / maxTotal) * 100}%` }}
                />
                <div
                  className="bg-rose-400/60 transition-all"
                  style={{ width: `${(e.failed / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}