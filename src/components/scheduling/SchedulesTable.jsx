import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Play, Trash2, CalendarClock } from "lucide-react";
import SiteChip from "@/components/shared/SiteChip";
import StatusPill from "@/components/shared/StatusPill";
import { describeSchedule } from "@/lib/scheduling";

export default function SchedulesTable({ items = [], onToggle, onRunNow, onDelete }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/40 py-16 text-center">
        <CalendarClock className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">No schedules configured yet.</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono border-b border-border/60">
        <div className="col-span-3">Schedule</div>
        <div className="col-span-2">Flow · Site</div>
        <div className="col-span-2">Cadence</div>
        <div className="col-span-2">Next run</div>
        <div className="col-span-1">Runs</div>
        <div className="col-span-1">Enabled</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {items.map((s) => (
        <div
          key={s.id}
          className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-border/30 last:border-0 hover:bg-secondary/30"
        >
          <div className="col-span-3 min-w-0">
            <div className="font-medium text-sm truncate">{s.name}</div>
            <div className="text-[11px] text-muted-foreground font-mono truncate">
              proxy · {s.proxy_group || "default"}
            </div>
          </div>

          <div className="col-span-2 min-w-0">
            <div className="text-xs truncate">{s.flow_name || "—"}</div>
            <div className="mt-1"><SiteChip site={s.site} size="sm" /></div>
          </div>

          <div className="col-span-2 text-xs font-mono text-muted-foreground truncate">
            {describeSchedule(s)}
          </div>

          <div className="col-span-2 text-xs font-mono text-muted-foreground">
            {s.next_run_at ? format(new Date(s.next_run_at), "MMM d · HH:mm") : "—"}
          </div>

          <div className="col-span-1 text-xs font-mono tabular-nums">{s.run_count || 0}</div>

          <div className="col-span-1">
            <Switch checked={!!s.enabled} onCheckedChange={(v) => onToggle?.(s, v)} />
          </div>

          <div className="col-span-1 flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Run now"
              onClick={() => onRunNow?.(s)}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-rose-400"
              title="Delete"
              onClick={() => onDelete?.(s)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}