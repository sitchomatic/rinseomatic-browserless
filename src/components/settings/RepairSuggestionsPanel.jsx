import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import StatusPill from "@/components/shared/StatusPill";
import { Wrench } from "lucide-react";
import { toast } from "sonner";

export default function RepairSuggestionsPanel() {
  const qc = useQueryClient();
  const { data: suggestions = [] } = useQuery({ queryKey: ["repair-suggestions"], queryFn: () => base44.entities.RepairSuggestion.list("-created_date", 50) });
  const updateMut = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RepairSuggestion.update(id, { status, reviewed_at: new Date().toISOString() }),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["repair-suggestions"] }); toast.success(`Suggestion ${vars.status}`); },
  });

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm space-y-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold"><Wrench className="h-4 w-4 text-primary" /> Repair suggestions</div>
        <p className="text-xs text-muted-foreground mt-1">Review selector repair recommendations generated from failed automation evidence.</p>
      </div>
      <div className="rounded-xl border border-border/70 overflow-hidden">
        {suggestions.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">No repair suggestions yet.</div>
        ) : suggestions.map((item) => (
          <div key={item.id} className="grid md:grid-cols-[1fr_100px_150px] gap-3 p-3 border-b border-border/60 last:border-b-0 text-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1"><span className="font-medium truncate">{item.flow_name || item.site || "Unknown flow"}</span><StatusPill status={item.status || "pending"} /></div>
              <div className="text-xs font-mono text-muted-foreground break-all">{item.failed_selector} → <span className="text-foreground/80">{item.suggested_selector || "No selector yet"}</span></div>
              {item.failure_reason && <div className="text-xs text-muted-foreground mt-1">{item.failure_reason}</div>}
            </div>
            <div className="text-xs font-mono text-muted-foreground">{Math.round((item.confidence || 0) * 100)}% confidence</div>
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ id: item.id, status: "rejected" })}>Reject</Button>
              <Button size="sm" onClick={() => updateMut.mutate({ id: item.id, status: "approved" })}>Approve</Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}