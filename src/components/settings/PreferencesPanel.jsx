import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, Gauge, Terminal } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_PREFS = {
  notify_run_completed: true,
  notify_run_failed: true,
  notify_maintenance_alerts: true,
  dashboard_refresh_seconds: 30,
  terminal_trace_enabled: true,
  terminal_trace_network: true,
  terminal_trace_responses: true,
  terminal_trace_verbose: true,
  audit_tracking_enabled: true,
  audit_track_inputs: true,
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
      terminal_trace_enabled: user.terminal_trace_enabled ?? DEFAULT_PREFS.terminal_trace_enabled,
      terminal_trace_network: user.terminal_trace_network ?? DEFAULT_PREFS.terminal_trace_network,
      terminal_trace_responses: user.terminal_trace_responses ?? DEFAULT_PREFS.terminal_trace_responses,
      terminal_trace_verbose: user.terminal_trace_verbose ?? DEFAULT_PREFS.terminal_trace_verbose,
      audit_tracking_enabled: user.audit_tracking_enabled ?? DEFAULT_PREFS.audit_tracking_enabled,
      audit_track_inputs: user.audit_track_inputs ?? DEFAULT_PREFS.audit_track_inputs,
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

      <div className="rounded-xl border border-border/70 bg-secondary/25 p-4 space-y-4">
        <div className="flex items-start gap-3">
          <Terminal className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <Label>Live terminal tracing</Label>
            <p className="text-xs text-muted-foreground mt-1">Controls what appears in the terminal-style command and response stream.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <ToggleRow label="Enable terminal" description="Turn live tracing on or off." checked={prefs.terminal_trace_enabled} onChange={(v) => update("terminal_trace_enabled", v)} />
          <ToggleRow label="Network traffic" description="Capture fetch and XHR calls." checked={prefs.terminal_trace_network} onChange={(v) => update("terminal_trace_network", v)} />
          <ToggleRow label="Responses" description="Show sanitized response previews." checked={prefs.terminal_trace_responses} onChange={(v) => update("terminal_trace_responses", v)} />
          <ToggleRow label="Verbose bodies" description="Show sanitized request body previews." checked={prefs.terminal_trace_verbose} onChange={(v) => update("terminal_trace_verbose", v)} />
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-secondary/25 p-4 space-y-4">
        <div className="flex items-start gap-3">
          <Terminal className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <Label>Audit tracking</Label>
            <p className="text-xs text-muted-foreground mt-1">Controls UI activity logging in the ActionLog stream.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <ToggleRow label="Track UI activity" description="Capture navigation, clicks, and form submissions." checked={prefs.audit_tracking_enabled} onChange={(v) => update("audit_tracking_enabled", v)} />
          <ToggleRow label="Track input updates" description="Capture non-sensitive input edits with debounce." checked={prefs.audit_track_inputs} onChange={(v) => update("audit_track_inputs", v)} />
        </div>
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