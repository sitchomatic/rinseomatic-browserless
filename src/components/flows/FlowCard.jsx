import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { GitBranch, Wand2, Star, Zap } from "lucide-react";
import SiteChip from "../shared/SiteChip";
import { cn } from "@/lib/utils";

export default function FlowCard({ flow }) {
  const stepCount = flow.steps?.length || 0;
  const confidence = Math.round((flow.repair_confidence ?? 1) * 100);
  const confidenceColor = confidence >= 80 ? "text-emerald-300" : confidence >= 50 ? "text-amber-300" : "text-rose-300";
  const isFastFill = flow.mode === "fast_fill";

  return (
    <Link
      to={`/flows/${flow.id}`}
      className="group relative block rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-secondary/30 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-8 w-8 rounded-lg border flex items-center justify-center",
            isFastFill ? "bg-primary/10 border-primary/30" : "bg-secondary border-border"
          )}>
            {isFastFill
              ? <Zap className="h-4 w-4 text-primary" />
              : <GitBranch className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate flex items-center gap-1.5">
              {flow.name}
              {flow.is_default && <Star className="h-3 w-3 text-amber-400 fill-amber-400" />}
              {isFastFill && (
                <span className="px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary text-[9px] font-mono uppercase tracking-wider">
                  fast fill
                </span>
              )}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              v{flow.version || 1} · {isFastFill ? "inject & submit" : `${stepCount} steps`}
            </div>
          </div>
        </div>
        <SiteChip site={flow.site} size="sm" />
      </div>

      {flow.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{flow.description}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
          <Wand2 className="h-3 w-3" />
          <span className={cn("tabular-nums", confidenceColor)}>{confidence}% repair</span>
        </div>
        <span className="text-muted-foreground font-mono">
          {flow.updated_date ? format(new Date(flow.updated_date), "MMM d") : "—"}
        </span>
      </div>
    </Link>
  );
}