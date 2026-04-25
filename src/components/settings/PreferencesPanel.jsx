import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, Gauge } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_PREFS = {
  notify_run_completed: true,
  notify_run_failed: true,
  notify_maintenance_alerts: true,
  dashboard_refresh_seconds: 30,
};

export default function PreferencesPanel() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });
  const [prefs, setPrefs] = React.useState(DEFAULT_PREFS);

  React.useEffect(() => {
    if (!user) return;
    setPrefs({
      ...DEFAULT_PREFS,
      notify_run_completed: user.notify_run_completed ?? DEFAULT_PREFS.notify_run_completed,
      notify_run_failed: user.notify_run_failed ?? DEFAULT_PREFS.notify_run_failed,
      notify_maintenance_alerts: user.notify_maintenance_alerts ?? DEFAULT_PREFS.notify_maintenance_alerts,
      dashboard_refresh_seconds: user.dashboard_refresh_seconds ?? DEFAULT_PREFS.dashboard_refresh_seconds,
    });
  }, [user]);

  const saveMut = useMutation({
    mutationFn: () => base44.auth.updateMe(prefs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Preferences saved");
    },
  });

  const update = (key, value) => setPrefs((current) => ({ ...current, [key]: value }));

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4 text-primary" /> Notification preferences
          </div>
          <p className="text-xs text-muted-foreground mt-1">Choose which operational updates should be surfaced to you.</p>
        </div>
        <Button size="sm" onClick={() => saveMut.mutate()} disabled={isLoading || saveMut.isPending}>Save preferences</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <ToggleRow label="Run completed" description="When a credential batch finishes." checked={prefs.notify_run_completed} onChange={(v) => update("notify_run_completed", v)} />
        <ToggleRow label="Run errors" description="When failures or browser errors appear." checked={prefs.notify_run_failed} onChange={(v) => update("notify_run_failed", v)} />
        <ToggleRow label="Maintenance alerts" description="When dashboard status needs attention." checked={prefs.notify_maintenance_alerts} onChange={(v) => update("notify_maintenance_alerts", v)} />
      </div>

      <div className="rounded-xl border border-border/70 bg-secondary/25 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Gauge className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <Label>Dashboard refresh speed</Label>
            <p className="text-xs text-muted-foreground mt-1">Controls how often dashboard maintenance data refreshes automatically.</p>
          </div>
        </div>
        <Select value={String(prefs.dashboard_refresh_seconds)} onValueChange={(v) => update("dashboard_refresh_seconds", Number(v))}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="15">Fast · 15 sec</SelectItem>
            <SelectItem value="30">Balanced · 30 sec</SelectItem>
            <SelectItem value="60">Calm · 1 min</SelectItem>
            <SelectItem value="300">Light · 5 min</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/25 p-4 flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}