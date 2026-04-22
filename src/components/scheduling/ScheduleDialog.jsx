import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SITES } from "@/lib/sites";
import { computeNextRun } from "@/lib/scheduling";

const EMPTY = {
  name: "",
  flow_id: "",
  flow_name: "",
  site: "joe",
  proxy_group: "default",
  mode: "simple",
  interval_unit: "hours",
  interval_value: 1,
  cron_expression: "",
  enabled: true,
};

export default function ScheduleDialog({ open, onOpenChange, onSubmit, flows = [], proxies = [] }) {
  const [form, setForm] = React.useState(EMPTY);

  React.useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  const proxyGroups = React.useMemo(() => {
    const regions = Array.from(new Set(proxies.map((p) => p.region).filter(Boolean)));
    return ["default", "any", ...regions];
  }, [proxies]);

  const submit = () => {
    if (!form.name.trim() || !form.flow_id) return;
    const flow = flows.find((f) => f.id === form.flow_id);
    const payload = {
      ...form,
      flow_name: flow?.name || form.flow_name,
      site: flow?.site || form.site,
      interval_value: Number(form.interval_value) || 1,
      next_run_at: computeNextRun(form),
      run_count: 0,
    };
    onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New schedule</DialogTitle>
          <DialogDescription>Run a flow automatically on a recurring interval.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>Schedule name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nightly PPSR refresh"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Flow</Label>
              <Select value={form.flow_id} onValueChange={(v) => setForm({ ...form, flow_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick a flow" /></SelectTrigger>
                <SelectContent>
                  {flows.length === 0 && <SelectItem value="_none" disabled>No flows yet</SelectItem>}
                  {flows.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name} · {SITES[f.site]?.label || f.site}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Proxy group</Label>
              <Select value={form.proxy_group} onValueChange={(v) => setForm({ ...form, proxy_group: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {proxyGroups.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Mode</Label>
            <Tabs value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
              <TabsList className="bg-secondary">
                <TabsTrigger value="simple" className="text-xs">Simple interval</TabsTrigger>
                <TabsTrigger value="cron" className="text-xs">Cron expression</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {form.mode === "simple" ? (
            <div className="grid grid-cols-[1fr_1fr] gap-3">
              <div className="grid gap-2">
                <Label>Every</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.interval_value}
                  onChange={(e) => setForm({ ...form, interval_value: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Select value={form.interval_unit} onValueChange={(v) => setForm({ ...form, interval_unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>Cron expression</Label>
              <Input
                value={form.cron_expression}
                onChange={(e) => setForm({ ...form, cron_expression: e.target.value })}
                placeholder="0 9 * * 1-5"
                className="font-mono"
              />
              <p className="text-[10px] text-muted-foreground font-mono">
                minute hour day-of-month month day-of-week
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!form.name.trim() || !form.flow_id}>Create schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}