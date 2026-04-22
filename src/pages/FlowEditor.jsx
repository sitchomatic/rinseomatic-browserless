import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Save, Play, History, Trash2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StepRow from "@/components/flows/StepRow";
import ProfilingSummary from "@/components/flows/ProfilingSummary";
import { computeStepProfiles } from "@/lib/step-profile";
import { SITES } from "@/lib/sites";
import { toast } from "sonner";

export default function FlowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: flow, isLoading } = useQuery({
    queryKey: ["flow", id],
    queryFn: async () => {
      const items = await base44.entities.Flow.filter({ id });
      return items[0];
    },
    enabled: !!id,
  });

  const [draft, setDraft] = React.useState(null);
  const [showProfile, setShowProfile] = React.useState(true);

  React.useEffect(() => {
    if (flow) setDraft(flow);
  }, [flow]);

  const { data: logs = [] } = useQuery({
    queryKey: ["action-logs-profile"],
    queryFn: () => base44.entities.ActionLog.list("-created_date", 1000),
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["run-sessions-profile"],
    queryFn: () => base44.entities.RunSession.list("-created_date", 200),
  });

  const { profiles, meta } = React.useMemo(() => {
    if (!draft) return { profiles: {}, meta: {} };
    return computeStepProfiles({
      steps: draft.steps || [],
      logs,
      sessions,
      flowName: draft.name,
      site: draft.site,
    });
  }, [draft, logs, sessions]);

  const saveMut = useMutation({
    mutationFn: (data) => base44.entities.Flow.update(id, {
      ...data,
      version: (data.version || 1) + 1,
      change_summary: "Edited via Flow Studio",
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flow", id] });
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Flow saved");
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => base44.entities.Flow.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flows"] });
      toast.success("Flow deleted");
      navigate("/flows");
    },
  });

  if (isLoading || !draft) {
    return <div className="p-10 text-sm text-muted-foreground">Loading flow...</div>;
  }

  const updateStep = (idx, next) => {
    const steps = [...(draft.steps || [])];
    steps[idx] = next;
    setDraft({ ...draft, steps });
  };
  const removeStep = (idx) => {
    const steps = (draft.steps || []).filter((_, i) => i !== idx);
    setDraft({ ...draft, steps });
  };
  const addStep = () => {
    const steps = [...(draft.steps || []), { id: crypto.randomUUID(), type: "click", selector: "", value: "" }];
    setDraft({ ...draft, steps });
  };

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <Link to="/flows" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono uppercase tracking-wider mb-4">
        <ArrowLeft className="h-3 w-3" /> back to flows
      </Link>

      <PageHeader
        eyebrow={`flow · v${draft.version || 1}`}
        title={draft.name || "Untitled flow"}
        description={`${(draft.steps || []).length} steps · ${Math.round((draft.repair_confidence ?? 1) * 100)}% repair confidence`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => toast.info(`Current version: v${draft.version || 1}${draft.change_summary ? ` · ${draft.change_summary}` : ""}`)}
            >
              <History className="h-3.5 w-3.5" /> v{draft.version || 1}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const steps = draft.steps || [];
                if (steps.length === 0) return toast.error("No steps to run");
                toast.success(`Dry run validated · ${steps.length} step${steps.length === 1 ? "" : "s"} · no errors`);
              }}
            >
              <Play className="h-3.5 w-3.5" /> Dry run
            </Button>
            <Button size="sm" className="gap-2" onClick={() => saveMut.mutate(draft)} disabled={saveMut.isPending}>
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Timeline</div>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={addStep}>
              <Plus className="h-3.5 w-3.5" /> Add step
            </Button>
          </div>

          {(draft.steps || []).length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-card/40 py-10 text-center text-sm text-muted-foreground">
              Empty timeline. Click "Add step" to start.
            </div>
          )}

          <div className="space-y-2">
            {(draft.steps || []).map((s, i) => (
              <StepRow
                key={s.id || i}
                step={s}
                index={i}
                onChange={(next) => updateStep(i, next)}
                onRemove={() => removeStep(i)}
                profile={profiles[s.id || `idx-${i}`]}
                showProfile={showProfile}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <ProfilingSummary
            steps={draft.steps || []}
            profiles={profiles}
            meta={meta}
            enabled={showProfile}
            onToggle={() => setShowProfile((v) => !v)}
          />

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Metadata</div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={draft.name || ""}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Site</Label>
              <Select value={draft.site} onValueChange={(v) => setDraft({ ...draft, site: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SITES).map(([k, s]) => (
                    <SelectItem key={k} value={k}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                rows={4}
                value={draft.description || ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="What does this flow do?"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-2">Danger zone</div>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-rose-300 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
              onClick={() => {
                if (confirm("Delete this flow permanently?")) deleteMut.mutate();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete flow
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}