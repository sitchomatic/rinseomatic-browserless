import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, GitBranch } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import FlowCard from "@/components/flows/FlowCard";
import { useNavigate } from "react-router-dom";

export default function Flows() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["flows"],
    queryFn: () => base44.entities.Flow.list("-updated_date"),
  });

  const createMut = useMutation({
    mutationFn: () =>
      base44.entities.Flow.create({
        name: "Untitled flow",
        site: "joe",
        description: "",
        steps: [{ id: crypto.randomUUID(), type: "navigate", value: "https://example.com/login" }],
        version: 1,
        repair_confidence: 1,
      }),
    onSuccess: async (flow) => {
      await qc.invalidateQueries({ queryKey: ["flows"] });
      if (flow?.id) navigate(`/flows/${flow.id}`);
    },
  });

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto">
      <PageHeader
        eyebrow="03 · flow studio"
        title="Automation flows"
        description="Reusable login sequences with step-by-step interaction, versioning, and AI repair confidence."
        actions={
          <Button size="sm" className="gap-2" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
            <Plus className="h-3.5 w-3.5" /> New flow
          </Button>
        }
      />

      {!isLoading && flows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 py-20 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl border border-border bg-card flex items-center justify-center mb-4">
            <GitBranch className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-sm font-medium mb-1">No flows yet</div>
          <div className="text-xs text-muted-foreground mb-4">Create your first automation flow to start recording steps.</div>
          <Button size="sm" onClick={() => createMut.mutate()}>Create flow</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flows.map((f) => <FlowCard key={f.id} flow={f} />)}
        </div>
      )}
    </div>
  );
}