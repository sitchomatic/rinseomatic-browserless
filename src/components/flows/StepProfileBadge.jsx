import React from "react";
import { Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMs } from "@/lib/sites";
import { profileSeverity } from "@/lib/step-profile";

const SEV_STYLES = {
  success: "text-emerald-300 border-emerald-500/30 bg-emerald-500/5",
  warning: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  failed: "text-rose-300 border-rose-500/30 bg-rose-500/10",
  idle: "text-muted-foreground border-border bg-secondary/40",
};

export default function StepProfileBadge({ profile }) {
  if (!profile) return null;
  const sev = profileSeverity(profile);
  const pct = Math.round((profile.failureProb || 0) * 100);

  const failClass =
    pct >= 40 ? "text-rose-300" : pct >= 15 ? "text-amber-300" : "text-emerald-300";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-2 py-1 text-[10px] font-mono shrink-0",
        SEV_STYLES[sev]
      )}
      title={
        profile.hasData
          ? `Avg ${formatMs(profile.avgMs)} · ${profile.errors} error${profile.errors === 1 ? "" : "s"} · ${profile.samples} samples`
          : "No historical samples yet"
      }
    >
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3 opacity-70" />
        <span className="tabular-nums">
          {profile.avgMs != null ? formatMs(profile.avgMs) : "—"}
        </span>
      </span>

      <span className="h-3 w-px bg-current opacity-20" />

      <span className={cn("flex items-center gap-1", failClass)}>
        <TrendingUp className="h-3 w-3 opacity-80" />
        <span className="tabular-nums">{pct}%</span>
      </span>

      {profile.errors > 0 && (
        <>
          <span className="h-3 w-px bg-current opacity-20" />
          <span className="flex items-center gap-1 text-rose-300">
            <AlertTriangle className="h-3 w-3" />
            <span className="tabular-nums">{profile.errors}</span>
          </span>
        </>
      )}
    </div>
  );
}