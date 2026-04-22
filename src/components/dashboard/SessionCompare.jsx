import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import SiteChip from "@/components/shared/SiteChip";
import StatusPill from "@/components/shared/StatusPill";
import { formatMs } from "@/lib/sites";
import { cn } from "@/lib/utils";

function pickLatest(sessions, status) {
  return sessions.find((s) => s.status === status) || null;
}

function DeltaRow({ label, aVal, bVal, format: fmt = (v) => v, unit = "", invert = false }) {
  const numA = typeof aVal === "number" ? aVal : null;
  const numB = typeof bVal === "number" ? bVal : null;
  let direction = 0;
  if (numA != null && numB != null && numA !== numB) {
    direction = numB > numA ? 1 : -1;
    if (invert) direction = -direction;
  }
  const Icon = direction === 0 ? Minus : direction > 0 ? TrendingUp : TrendingDown;
  const color = direction === 0 ? "text-muted-foreground" : direction > 0 ? "text-rose-300" : "text-emerald-300";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 border-b border-border/40 last:border-0">
      <div className="text-xs font-mono text-right text-muted-foreground">{aVal == null ? "—" : fmt(aVal)}{unit}</div>
      <div className="min-w-0 text-center">
        <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">{label}</div>
        <Icon className={cn("h-3 w-3 mx-auto mt-0.5", color)} />
      </div>
      <div className="text-xs font-mono text-left">{bVal == null ? "—" : fmt(bVal)}{unit}</div>
    </div>
  );
}

export default function SessionCompare() {
  const { data: sessions = [] } = useQuery({
    queryKey: ["run-sessions-compare"],
    queryFn: () => base44.entities.RunSession.list("-created_date", 50),
    refetchInterval: 8000,
  });

  const successes = sessions.filter((s) => s.status === "completed");
  const failures = sessions.filter((s) => s.status === "failed");

  const [aId, setAId] = React.useState("");
  const [bId, setBId] = React.useState("");

  React.useEffect(() => {
    if (!aId) {
      const s = pickLatest(sessions, "completed");
      if (s) setAId(s.id);
    }
    if (!bId) {
      const s = pickLatest(sessions, "failed");
      if (s) setBId(s.id);
    }
  }, [sessions]); // eslint-disable-line

  const a = sessions.find((s) => s.id === aId);
  const b = sessions.find((s) => s.id === bId);

  const successRateA = a?.completed_count ? Math.round(((a.working_count || 0) / a.completed_count) * 100) : 0;
  const successRateB = b?.completed_count ? Math.round(((b.working_count || 0) / b.completed_count) * 100) : 0;
  const avgStepA = a?.completed_count ? Math.round((a.elapsed_ms || 0) / a.completed_count) : null;
  const avgStepB = b?.completed_count ? Math.round((b.elapsed_ms || 0) / b.completed_count) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitCompare className="h-3.5 w-3.5 text-sky-300" />
          <h3 className="text-sm font-medium">Session compare</h3>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          success vs failure
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          No sessions to compare yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <SessionPicker
              label="Success"
              accent="text-emerald-300"
              value={aId}
              onChange={setAId}
              options={successes}
            />
            <SessionPicker
              label="Failure"
              accent="text-rose-300"
              value={bId}
              onChange={setBId}
              options={failures}
            />
          </div>

          {a && b ? (
            <div className="space-y-1">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 pb-3 border-b border-border/60 mb-2">
                <SessionHeader s={a} align="right" />
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono self-center">vs</div>
                <SessionHeader s={b} align="left" />
              </div>

              <DeltaRow label="Success rate" aVal={successRateA} bVal={successRateB} unit="%" />
              <DeltaRow label="Elapsed" aVal={a.elapsed_ms} bVal={b.elapsed_ms} format={formatMs} invert />
              <DeltaRow label="Avg / step" aVal={avgStepA} bVal={avgStepB} format={formatMs} invert />
              <DeltaRow label="Working" aVal={a.working_count} bVal={b.working_count} />
              <DeltaRow label="Failed" aVal={a.failed_count} bVal={b.failed_count} invert />
              <DeltaRow label="Total steps" aVal={a.total_count} bVal={b.total_count} />

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 border-b border-border/40">
                <div className="text-xs font-mono text-right text-muted-foreground truncate" title={a.proxy_used}>
                  {a.proxy_used || "direct"}
                </div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">Proxy</div>
                <div className={cn(
                  "text-xs font-mono text-left truncate",
                  a.proxy_used !== b.proxy_used && "text-amber-300"
                )} title={b.proxy_used}>
                  {b.proxy_used || "direct"}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2">
                <div className="text-xs font-mono text-right text-muted-foreground">
                  {a.site || "—"}
                </div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">Site</div>
                <div className={cn(
                  "text-xs font-mono text-left",
                  a.site !== b.site && "text-amber-300"
                )}>
                  {b.site || "—"}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Need at least one {!a ? "successful" : "failed"} session to compare.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SessionPicker({ label, accent, value, onChange, options }) {
  return (
    <div>
      <div className={cn("text-[10px] font-mono uppercase tracking-[0.15em] mb-1.5", accent)}>{label}</div>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={options.length ? "Pick a session" : "No sessions"} />
        </SelectTrigger>
        <SelectContent>
          {options.length === 0 && <SelectItem value="_none" disabled>No matches</SelectItem>}
          {options.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.flow_name || s.site} · {s.started_at ? format(new Date(s.started_at), "MMM d HH:mm") : "—"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SessionHeader({ s, align }) {
  return (
    <div className={cn("min-w-0", align === "right" ? "text-right" : "text-left")}>
      <div className={cn("flex items-center gap-2 mb-1", align === "right" && "justify-end")}>
        <SiteChip site={s.site} size="sm" />
        <StatusPill status={s.status} />
      </div>
      <div className="text-[11px] text-muted-foreground font-mono truncate">
        {s.started_at ? format(new Date(s.started_at), "MMM d · HH:mm:ss") : "—"}
      </div>
    </div>
  );
}