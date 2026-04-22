import React from "react";
import { Activity, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { formatMs } from "@/lib/sites";
import { cn } from "@/lib/utils";

export default function ProfilingSummary({ steps = [], profiles = {}, meta = {}, enabled, onToggle }) {
  const vals = steps.map((s, i) => profiles[s.id || `idx-${i}`]).filter(Boolean);
  const withData = vals.filter((p) => p.hasData);

  const totalAvg = withData.reduce((a, p) => a + (p.avgMs || 0), 0);
  const totalErrors = vals.reduce((a, p) => a + (p.errors || 0), 0);
  const avgFail = vals.length
    ? vals.reduce((a, p) => a + (p.failureProb || 0), 0) / vals.length
    : 0;

  // Hottest (highest failure probability with data)
  const hot = [...vals]
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.hasData)
    .sort((a, b) => (b.p.failureProb || 0) - (a.p.failureProb || 0))[0];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-sky-300" />
          <h3 className="text-sm font-medium">Profiling</h3>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-1 rounded-md border transition-colors",
            enabled
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-secondary border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {enabled ? "overlay on" : "overlay off"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniTile label="Est. runtime" value={withData.length ? formatMs(totalAvg) : "—"} icon={Clock} accent="text-sky-300" />
        <MiniTile label="Avg fail" value={`${Math.round(avgFail * 100)}%`} icon={TrendingUp} accent={avgFail >= 0.15 ? "text-amber-300" : "text-emerald-300"} />
        <MiniTile label="Errors (30d)" value={totalErrors} icon={AlertTriangle} accent={totalErrors ? "text-rose-300" : "text-muted-foreground"} />
      </div>

      <div className="rounded-lg border border-border bg-secondary/30 p-3 mb-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
          Sample size
        </div>
        <div className="text-xs font-mono">
          <span className="tabular-nums">{meta.totalSessions || 0}</span> sessions ·{" "}
          <span className="tabular-nums text-rose-300">{meta.failedSessions || 0}</span> failed ·{" "}
          <span className="tabular-nums">{meta.logsConsidered || 0}</span> log events
        </div>
      </div>

      {hot ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-300 mb-1">
            Highest failure step
          </div>
          <div className="text-xs">
            <span className="font-mono tabular-nums text-muted-foreground mr-2">
              #{String(hot.i + 1).padStart(2, "0")}
            </span>
            <span className="font-medium capitalize">{steps[hot.i]?.type || "step"}</span>
            <span className="text-muted-foreground"> — </span>
            <span className="text-rose-300 tabular-nums">
              {Math.round((hot.p.failureProb || 0) * 100)}% fail
            </span>
            <span className="text-muted-foreground"> · {formatMs(hot.p.avgMs)} avg</span>
          </div>
          {steps[hot.i]?.selector && (
            <div className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
              {steps[hot.i].selector}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-3 text-center">
          <div className="text-xs text-muted-foreground">
            No historical samples yet — run this flow to build a profile.
          </div>
        </div>
      )}
    </div>
  );
}

function MiniTile({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 px-2.5 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={cn("h-3 w-3", accent)} />
      </div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}