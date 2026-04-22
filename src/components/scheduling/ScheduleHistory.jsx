import React from "react";
import { format } from "date-fns";
import SiteChip from "@/components/shared/SiteChip";
import StatusPill from "@/components/shared/StatusPill";
import { formatMs } from "@/lib/sites";
import { History } from "lucide-react";

export default function ScheduleHistory({ sessions = [] }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">Past scheduled runs</span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {sessions.length} runs
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          No scheduled runs have executed yet.
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {sessions.map((s) => (
            <div key={s.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center text-xs">
              <div className="col-span-4 min-w-0">
                <div className="truncate font-medium text-sm">{s.flow_name || "Run"}</div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {s.started_at ? format(new Date(s.started_at), "MMM d · HH:mm:ss") : "—"}
                </div>
              </div>
              <div className="col-span-2"><SiteChip site={s.site} size="sm" /></div>
              <div className="col-span-2 font-mono text-muted-foreground">
                {s.working_count}/{s.total_count || 0}
              </div>
              <div className="col-span-2 font-mono text-muted-foreground">{formatMs(s.elapsed_ms)}</div>
              <div className="col-span-2 flex justify-end"><StatusPill status={s.status} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}