import React from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const LEVEL_COLOR = {
  info: "text-sky-300",
  success: "text-emerald-300",
  warn: "text-amber-300",
  error: "text-rose-300",
  debug: "text-muted-foreground",
};

export default function LiveLogStream({ logs = [], height = "h-80" }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card overflow-hidden flex flex-col", height)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 text-emerald-400 live-dot" />
          <span className="text-sm font-medium">Live telemetry</span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{logs.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll font-mono text-xs">
        {logs.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground text-xs">
            Awaiting events...
          </div>
        )}
        {logs.map((log, i) => (
          <div
            key={log.id || i}
            className="group flex items-start gap-3 px-4 py-1.5 hover:bg-secondary/40 border-b border-border/30 last:border-0"
          >
            <span className="text-muted-foreground/60 tabular-nums shrink-0">
              {log.timestamp ? format(new Date(log.timestamp), "HH:mm:ss.SSS") : "--:--:--"}
            </span>
            <span className={cn("shrink-0 w-16 uppercase text-[10px] tracking-wider mt-0.5", LEVEL_COLOR[log.level] || LEVEL_COLOR.info)}>
              {log.level || "info"}
            </span>
            <span className="shrink-0 text-muted-foreground/60 w-16 mt-0.5">[{log.category || "sys"}]</span>
            <span className="text-foreground/90 break-all flex-1">{log.message}</span>
            <span className="text-muted-foreground/50 tabular-nums shrink-0">
              +{log.delta_ms ?? 0}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}