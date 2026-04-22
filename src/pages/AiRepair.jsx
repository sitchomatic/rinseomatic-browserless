import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Wand2, Check, X, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import StatusPill from "@/components/shared/StatusPill";
import SiteChip from "@/components/shared/SiteChip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function AiRepair() {
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState("pending");

  const { data: suggestions = [] } = useQuery({
    queryKey: ["repair-suggestions"],
    queryFn: () => base44.entities.RepairSuggestion.list("-created_date", 200),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RepairSuggestion.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["repair-suggestions"] }),
  });

  const filtered = suggestions.filter((s) => filter === "all" || s.status === filter);

  const counts = {
    pending: suggestions.filter((s) => s.status === "pending").length,
    approved: suggestions.filter((s) => s.status === "approved").length,
    rejected: suggestions.filter((s) => s.status === "rejected").length,
    all: suggestions.length,
  };

  const avgConfidence = suggestions.length
    ? Math.round((suggestions.reduce((a, s) => a + (s.confidence || 0), 0) / suggestions.length) * 100)
    : 0;

  const review = (s, status) => {
    updateMut.mutate({
      id: s.id,
      data: { status, reviewed_at: new Date().toISOString() },
    });
  };

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto">
      <PageHeader
        eyebrow="07 · ai repair"
        title="Repair review console"
        description="AI-suggested selector replacements for failed flow steps. Manual review only — no live auto-apply."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Tile label="Pending review" value={counts.pending} accent="text-amber-300" />
        <Tile label="Approved" value={counts.approved} accent="text-emerald-300" />
        <Tile label="Rejected" value={counts.rejected} accent="text-rose-300" />
        <Tile label="Avg confidence" value={`${avgConfidence}%`} accent="text-sky-300" />
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="pending">Pending <span className="ml-2 font-mono text-muted-foreground">{counts.pending}</span></TabsTrigger>
          <TabsTrigger value="approved">Approved <span className="ml-2 font-mono text-muted-foreground">{counts.approved}</span></TabsTrigger>
          <TabsTrigger value="rejected">Rejected <span className="ml-2 font-mono text-muted-foreground">{counts.rejected}</span></TabsTrigger>
          <TabsTrigger value="all">All <span className="ml-2 font-mono text-muted-foreground">{counts.all}</span></TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 py-20 text-center">
          <Wand2 className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">No suggestions in this view.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const confidence = Math.round((s.confidence || 0) * 100);
            const confColor = confidence >= 80 ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" :
                              confidence >= 50 ? "text-amber-300 border-amber-500/30 bg-amber-500/10" :
                              "text-rose-300 border-rose-500/30 bg-rose-500/10";
            return (
              <div key={s.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <SiteChip site={s.site} size="sm" />
                      <span className="text-sm font-medium">{s.flow_name || "Unknown flow"}</span>
                      <StatusPill status={s.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{s.failure_reason || "Selector failed to match."}</p>
                  </div>
                  <div className={cn("shrink-0 text-xs font-mono tabular-nums px-2.5 py-1 rounded-full border", confColor)}>
                    {confidence}% confidence
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center mb-4">
                  <CodeBlock label="failed selector" variant="failed" value={s.failed_selector} />
                  <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground mx-auto" />
                  <CodeBlock label="suggested" variant="success" value={s.suggested_selector} />
                </div>

                {s.status === "pending" ? (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-rose-300 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                      onClick={() => review(s, "rejected")}
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-emerald-950"
                      onClick={() => review(s, "approved")}
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground font-mono pt-3 border-t border-border/50">
                    reviewed · {s.reviewed_at ? format(new Date(s.reviewed_at), "MMM d · HH:mm") : "—"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CodeBlock({ label, variant, value }) {
  const colors = variant === "failed"
    ? "text-rose-300 border-rose-500/20 bg-rose-500/5"
    : "text-emerald-300 border-emerald-500/20 bg-emerald-500/5";
  return (
    <div className={cn("rounded-lg border px-3 py-2.5", colors)}>
      <div className="text-[9px] font-mono uppercase tracking-[0.15em] opacity-70 mb-1">{label}</div>
      <div className="font-mono text-xs break-all">{value || "—"}</div>
    </div>
  );
}

function Tile({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className={cn("text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground")}>{label}</div>
      <div className={cn("text-xl font-semibold tabular-nums mt-1", accent)}>{value}</div>
    </div>
  );
}