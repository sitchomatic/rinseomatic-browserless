import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Wand2, Check, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import SiteChip from "@/components/shared/SiteChip";
import { cn } from "@/lib/utils";

export default function RepairMonitor() {
  const qc = useQueryClient();

  const { data: suggestions = [] } = useQuery({
    queryKey: ["repair-suggestions", "pending"],
    queryFn: () => base44.entities.RepairSuggestion.filter({ status: "pending" }, "-created_date", 10),
    refetchInterval: 5000,
  });

  const reviewMut = useMutation({
    mutationFn: async ({ suggestion, status }) => {
      // If approved, patch the flow: replace failed_selector with suggested_selector in its steps.
      if (status === "approved" && suggestion.flow_id && suggestion.suggested_selector) {
        const flows = await base44.entities.Flow.filter({ id: suggestion.flow_id });
        const flow = flows[0];
        if (flow) {
          const steps = (flow.steps || []).map((s) =>
            s.selector === suggestion.failed_selector
              ? { ...s, selector: suggestion.suggested_selector }
              : s
          );
          await base44.entities.Flow.update(flow.id, {
            steps,
            version: (flow.version || 1) + 1,
            last_repair_date: new Date().toISOString(),
            change_summary: `AI repair: ${suggestion.failed_selector} → ${suggestion.suggested_selector}`,
            repair_confidence: suggestion.confidence ?? flow.repair_confidence ?? 1,
          });
        }
      }
      return base44.entities.RepairSuggestion.update(suggestion.id, {
        status,
        reviewed_at: new Date().toISOString(),
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["repair-suggestions"] });
      qc.invalidateQueries({ queryKey: ["flows"] });
      qc.invalidateQueries({ queryKey: ["flow"] });
      toast.success(vars.status === "approved" ? "Repair applied to flow" : "Suggestion rejected");
    },
    onError: (err) => toast.error(err?.message || "Review failed"),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wand2 className="h-3.5 w-3.5 text-sky-300" />
          <h3 className="text-sm font-medium">Repair monitor</h3>
          {suggestions.length > 0 && (
            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {suggestions.length} pending
            </span>
          )}
        </div>
        <Link to="/ai-repair" className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground">
          open console →
        </Link>
      </div>

      {suggestions.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          No pending repairs. Sessions running clean.
        </div>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto thin-scroll pr-1">
          {suggestions.map((s) => {
            const confidence = Math.round((s.confidence || 0) * 100);
            const confColor =
              confidence >= 80 ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" :
              confidence >= 50 ? "text-amber-300 border-amber-500/30 bg-amber-500/10" :
              "text-rose-300 border-rose-500/30 bg-rose-500/10";
            const isPending = reviewMut.isPending && reviewMut.variables?.suggestion?.id === s.id;

            return (
              <div key={s.id} className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <SiteChip site={s.site} size="sm" />
                    <span className="text-xs font-medium truncate">{s.flow_name || "Unknown flow"}</span>
                  </div>
                  <span className={cn("shrink-0 text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded border", confColor)}>
                    {confidence}%
                  </span>
                </div>

                {s.failure_reason && (
                  <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">{s.failure_reason}</p>
                )}

                <div className="flex items-center gap-2 font-mono text-[11px] mb-3 min-w-0">
                  <span className="rounded px-1.5 py-0.5 border border-rose-500/20 bg-rose-500/5 text-rose-300 truncate flex-1" title={s.failed_selector}>
                    {s.failed_selector || "—"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="rounded px-1.5 py-0.5 border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 truncate flex-1" title={s.suggested_selector}>
                    {s.suggested_selector || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs text-rose-300 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                    onClick={() => reviewMut.mutate({ suggestion: s, status: "rejected" })}
                    disabled={isPending}
                  >
                    <X className="h-3 w-3" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-emerald-950"
                    onClick={() => reviewMut.mutate({ suggestion: s, status: "approved" })}
                    disabled={isPending || !s.flow_id || !s.suggested_selector}
                  >
                    <Check className="h-3 w-3" /> Approve & patch
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}