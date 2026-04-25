import React from "react";
import StatusPill from "@/components/shared/StatusPill";
import { formatMs } from "@/lib/sites";

const PAGE_SIZE = 250;

export default function ResultsTable({ results }) {
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const visibleResults = React.useMemo(() => (results || []).slice(0, visibleCount), [results, visibleCount]);
  const hiddenCount = Math.max(0, (results || []).length - visibleResults.length);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [results]);

  if (!results || results.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 py-14 text-center text-sm text-muted-foreground">
        No results yet.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-[minmax(0,2fr)_110px_100px_minmax(0,3fr)_80px] gap-3 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <div>Username</div>
        <div>Status</div>
        <div>Attempts</div>
        <div>Detail</div>
        <div>Elapsed</div>
      </div>
      <div className="divide-y divide-border/60 max-h-[540px] overflow-y-auto thin-scroll">
        {visibleResults.map((r) => (
          <div key={r.id} className="grid grid-cols-[minmax(0,2fr)_110px_100px_minmax(0,3fr)_80px] gap-3 px-4 py-2.5 items-center text-xs font-mono">
            <div className="truncate">{r.username}</div>
            <div><StatusPill status={r.status} /></div>
            <div className="text-muted-foreground">{r.attempts || 0}</div>
            <div className="truncate text-muted-foreground">
              {r.error_message || r.final_url || (r.success_marker_found ? "success marker ✓" : "—")}
            </div>
            <div className="text-muted-foreground">{formatMs(r.elapsed_ms)}</div>
          </div>
        ))}
        {hiddenCount > 0 && (
          <div className="px-4 py-3 text-center bg-secondary/20">
            <button className="text-xs font-mono text-primary hover:underline" onClick={() => setVisibleCount((count) => Math.min(results.length, count + PAGE_SIZE))}>
              Show {Math.min(PAGE_SIZE, hiddenCount)} more · {hiddenCount} hidden
            </button>
          </div>
        )}
      </div>
    </div>
  );
}