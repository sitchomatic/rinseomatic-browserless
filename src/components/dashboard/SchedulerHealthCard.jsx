import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3, CheckCircle2, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import StatusPill from "@/components/shared/StatusPill";
import { formatDistanceToNow } from "date-fns";

export default function SchedulerHealthCard() {
  const { data: health, isLoading } = useQuery({
    queryKey: ["scheduler-health"],
    queryFn: async () => (await base44.functions.invoke("getSchedulerHealth", {})).data,
    refetchInterval: 60 * 1000,
  });

  const healthy = !!health?.healthy;
  const lastRunLabel = health?.last_run_at
    ? formatDistanceToNow(new Date(health.last_run_at), { addSuffix: true })
    : "never";

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Scheduler health</div>
          <div className="text-sm font-semibold mt-2">Run automation</div>
          <div className="text-xs text-muted-foreground mt-1">Last checked {isLoading ? "…" : lastRunLabel}</div>
        </div>
        {healthy ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4 text-amber-300" />}
      </div>
      <div className="flex items-center justify-between gap-3 mt-4">
        <StatusPill status={healthy ? "working" : "warning"}>{healthy ? "healthy" : "attention"}</StatusPill>
        <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
          <Clock3 className="h-3 w-3" /> every 5 min
        </div>
      </div>
    </div>
  );
}