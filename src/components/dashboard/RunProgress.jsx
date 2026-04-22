import React from "react";
import { cn } from "@/lib/utils";
import { getSite, formatMs } from "@/lib/sites";
import StatusPill from "../shared/StatusPill";

export default function RunProgress({ session }) {
  if (!session) return null;
  const site = getSite(session.site);
  const pct = session.total_count ? (session.completed_count / session.total_count) * 100 : 0;
  const successRate = session.completed_count
    ? Math.round((session.working_count / session.completed_count) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-2.5 w-2.5 rounded-full", site.dot, session.status === "running" && "live-dot")} style={{ color: "currentColor" }} />
          <div>
            <div className="text-sm font-medium">{session.flow_name || `${site.label} run`}</div>
            <div className="text-xs text-muted-foreground font-mono">session · {(session.id || "—").slice(0, 8)}</div>
          </div>
        </div>
        <StatusPill status={session.status} />
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden mb-4">
        <div
          className="absolute inset-y-0 left-0 bg-primary transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
        {session.status === "running" && (
          <div
            className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
            style={{ backgroundSize: "200% 100%" }}
          />
        )}
      </div>

      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Done</div>
          <div className="text-lg font-semibold tabular-nums">{session.completed_count}/{session.total_count}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Working</div>
          <div className="text-lg font-semibold tabular-nums text-emerald-300">{session.working_count}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Failed</div>
          <div className="text-lg font-semibold tabular-nums text-rose-300">{session.failed_count}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Rate</div>
          <div className="text-lg font-semibold tabular-nums">{successRate}%</div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60 text-xs text-muted-foreground font-mono">
        <span>elapsed · {formatMs(session.elapsed_ms)}</span>
        <span>proxy · {session.proxy_used || "direct"}</span>
      </div>
    </div>
  );
}