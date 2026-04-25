import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatusPill from "@/components/shared/StatusPill";
import { Activity } from "lucide-react";
import { format } from "date-fns";

const LEVEL_VARIANTS = {
  success: "success",
  error: "failed",
  warn: "warning",
  debug: "idle",
  info: "info",
};

export default function LiveAuditLog({ compact = false }) {
  const qc = useQueryClient();
  const { data: logs = [] } = useQuery({
    queryKey: ["live-audit-log"],
    queryFn: () => base44.entities.ActionLog.list("-created_date", compact ? 30 : 80),
    refetchInterval: 15000,
  });

  React.useEffect(() => {
    const unsubscribe = base44.entities.ActionLog.subscribe((event) => {
      if (event.type === "delete") {
        qc.setQueryData(["live-audit-log"], (current = []) => current.filter((log) => log.id !== event.id));
        return;
      }
      qc.setQueryData(["live-audit-log"], (current = []) => {
        const next = [event.data, ...current.filter((log) => log.id !== event.id)];
        return next.slice(0, compact ? 30 : 80);
      });
    });
    return unsubscribe;
  }, [qc, compact]);

  return (
    <section className="rounded-2xl border border-border bg-card/80 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/70 bg-secondary/20">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" /> Live audit log
          </div>
          <p className="text-xs text-muted-foreground mt-1">Real-time stream of app activity and automation events.</p>
        </div>
        <StatusPill status="running" variant="working">live</StatusPill>
      </div>
      <div className="max-h-80 overflow-y-auto thin-scroll divide-y divide-border/50">
        {logs.length === 0 ? (
          <div className="px-5 py-8 text-sm text-muted-foreground text-center">No audit events yet.</div>
        ) : logs.map((log) => (
          <div key={log.id} className="grid grid-cols-[86px_92px_1fr] gap-3 px-5 py-3 text-xs items-start animate-fade-in">
            <div className="font-mono text-muted-foreground">{format(new Date(log.timestamp || log.created_date), "HH:mm:ss")}</div>
            <StatusPill status={log.level || "info"} variant={LEVEL_VARIANTS[log.level] || "info"} className="justify-center" />
            <div className="min-w-0">
              <div className="truncate text-foreground">{log.message}</div>
              <div className="font-mono text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{log.category || "system"}{log.site ? ` · ${log.site}` : ""}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}