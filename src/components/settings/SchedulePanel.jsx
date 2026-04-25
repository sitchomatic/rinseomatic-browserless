import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import StatusPill from "@/components/shared/StatusPill";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const BLANK_SCHEDULE = { name: "", flow_id: "manual-test-run", flow_name: "Credential test run", site: "joe", mode: "simple", interval_unit: "hours", interval_value: 1, enabled: true };

export default function SchedulePanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = React.useState(BLANK_SCHEDULE);
  const { data: schedules = [] } = useQuery({ queryKey: ["automation-schedules"], queryFn: () => base44.entities.Schedule.list("-created_date", 100) });

  const saveMut = useMutation({
    mutationFn: () => base44.entities.Schedule.create(draft),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-schedules"] }); setDraft(BLANK_SCHEDULE); toast.success("Schedule saved"); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, patch }) => base44.entities.Schedule.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-schedules"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Schedule.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-schedules"] }); toast.success("Schedule removed"); },
  });

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-primary" /> Run schedules</div>
          <p className="text-xs text-muted-foreground mt-1">Store schedule definitions for recurring credential maintenance windows.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => saveMut.mutate()} disabled={!draft.name || saveMut.isPending}><Plus className="h-3.5 w-3.5" /> Add schedule</Button>
      </div>

      <div className="grid md:grid-cols-6 gap-2">
        <Input className="md:col-span-2" placeholder="Schedule name" value={draft.name} onChange={(e) => update("name", e.target.value)} />
        <Select value={draft.site} onValueChange={(v) => update("site", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="joe">Joe</SelectItem>
            <SelectItem value="ignition">Ignition</SelectItem>
            <SelectItem value="ppsr">PPSR</SelectItem>
            <SelectItem value="double">Double</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" value={draft.interval_value} onChange={(e) => update("interval_value", Number(e.target.value))} />
        <Select value={draft.interval_unit} onValueChange={(v) => update("interval_unit", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="hours">Hours</SelectItem>
            <SelectItem value="days">Days</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center justify-between rounded-md border border-input px-3 text-xs text-muted-foreground">
          Enabled <Switch checked={draft.enabled} onCheckedChange={(v) => update("enabled", v)} />
        </label>
      </div>

      <div className="rounded-xl border border-border/70 overflow-hidden">
        {schedules.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">No schedules configured yet.</div>
        ) : schedules.map((schedule) => (
          <div key={schedule.id} className="grid md:grid-cols-[1fr_110px_150px_90px_40px] gap-3 items-center p-3 border-b border-border/60 last:border-b-0 text-sm">
            <div className="min-w-0">
              <div className="font-medium truncate">{schedule.name}</div>
              <div className="text-xs font-mono text-muted-foreground truncate">{schedule.flow_name || schedule.flow_id}</div>
            </div>
            <div className="text-xs font-mono text-muted-foreground">{schedule.site || "all"}</div>
            <div className="text-xs font-mono text-muted-foreground">Every {schedule.interval_value || 1} {schedule.interval_unit || "hours"}</div>
            <button onClick={() => updateMut.mutate({ id: schedule.id, patch: { enabled: !schedule.enabled } })}><StatusPill status={schedule.enabled ? "working" : "cancelled"}>{schedule.enabled ? "enabled" : "disabled"}</StatusPill></button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-400" onClick={() => deleteMut.mutate(schedule.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </section>
  );
}