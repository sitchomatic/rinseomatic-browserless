import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatusPill from "@/components/shared/StatusPill";
import { formatMs } from "@/lib/sites";
import { ChevronDown, ChevronUp } from "lucide-react";

const PAGE_SIZE = 250;

function ResultScreenshots({ resultId }) {
  const { data: screenshots = [], isLoading } = useQuery({
    queryKey: ["result-screenshots", resultId],
    queryFn: () => base44.entities.Screenshot.filter({ result_id: resultId }, "step_index", 200),
    enabled: !!resultId,
  });

  if (isLoading) return <div className="p-4 text-xs text-muted-foreground animate-pulse">Loading screenshots...</div>;
  if (screenshots.length === 0) return <div className="p-4 text-xs text-muted-foreground">No screenshots available.</div>;

  return (
    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-secondary/10 border-t border-border shadow-inner">
      {screenshots.map(shot => (
        <a key={shot.id} href={shot.image_url} target="_blank" rel="noreferrer" className="group rounded-lg border border-border bg-card overflow-hidden block">
          <div className="aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
            {shot.image_url ? (
              <img src={shot.image_url} alt={shot.step_label} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
            ) : (
              <div className="text-[10px] text-muted-foreground">No image</div>
            )}
          </div>
          <div className="p-2 text-[10px] truncate border-t border-border/50">{shot.step_label}</div>
        </a>
      ))}
    </div>
  );
}

export default function ResultsTable({ results }) {
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [expandedRow, setExpandedRow] = React.useState(null);
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
      <div className="grid grid-cols-[minmax(0,2fr)_110px_100px_minmax(0,3fr)_80px_20px] gap-3 px-4 py-2.5 border-b border-border bg-secondary/40 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <div>Username</div>
        <div>Status</div>
        <div>Attempts</div>
        <div>Detail</div>
        <div>Elapsed</div>
        <div></div>
      </div>
      <div className="divide-y divide-border/60 max-h-[540px] overflow-y-auto thin-scroll">
        {visibleResults.map((r) => (
          <React.Fragment key={r.id}>
            <div 
              onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
              className="grid grid-cols-[minmax(0,2fr)_110px_100px_minmax(0,3fr)_80px_20px] gap-3 px-4 py-2.5 items-center text-xs font-mono animate-fade-in cursor-pointer hover:bg-secondary/30 transition-colors"
            >
              <div className="truncate">{r.username}</div>
              <div><StatusPill status={r.status} /></div>
              <div className="text-muted-foreground">{r.attempts || 0}</div>
              <div className="truncate text-muted-foreground">
                {r.error_message || r.final_url || (r.success_marker_found ? "success marker ✓" : "—")}
              </div>
              <div className="text-muted-foreground">{formatMs(r.elapsed_ms)}</div>
              <div className="text-muted-foreground flex justify-end">
                {expandedRow === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
            {expandedRow === r.id && (
              <div className="animate-accordion-down overflow-hidden border-t border-border/50">
                <ResultScreenshots resultId={r.id} />
              </div>
            )}
          </React.Fragment>
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