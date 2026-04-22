import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const EMPTY = {
  name: "",
  description: "",
  proxy_ids: [],
  rotation_strategy: "round_robin",
  latency_threshold_ms: 500,
  failure_threshold: 3,
  auto_ban_enabled: true,
  auto_ban_triggers: ["captcha", "ip_block", "rate_limit"],
  enabled: true,
};

const TRIGGER_OPTIONS = ["captcha", "ip_block", "rate_limit", "403", "cloudflare", "geo_block"];

export default function ProxyPoolDialog({ open, onOpenChange, onSubmit, initial, proxies = [] }) {
  const [form, setForm] = React.useState(EMPTY);

  React.useEffect(() => {
    if (open) setForm(initial ? { ...EMPTY, ...initial } : EMPTY);
  }, [open, initial]);

  const toggleProxy = (id) => {
    const cur = new Set(form.proxy_ids || []);
    cur.has(id) ? cur.delete(id) : cur.add(id);
    setForm({ ...form, proxy_ids: Array.from(cur) });
  };

  const toggleTrigger = (t) => {
    const cur = new Set(form.auto_ban_triggers || []);
    cur.has(t) ? cur.delete(t) : cur.add(t);
    setForm({ ...form, auto_ban_triggers: Array.from(cur) });
  };

  const submit = () => {
    if (!form.name.trim()) return;
    onSubmit({
      ...form,
      latency_threshold_ms: Number(form.latency_threshold_ms) || 500,
      failure_threshold: Number(form.failure_threshold) || 3,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto thin-scroll">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit pool" : "New proxy pool"}</DialogTitle>
          <DialogDescription>
            Group endpoints with rotation strategy, health thresholds, and auto-ban rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div className="grid gap-2">
              <Label>Pool name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="US residential pool" />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Label className="text-xs">Enabled</Label>
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="When to use this pool..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Rotation</Label>
              <Select value={form.rotation_strategy} onValueChange={(v) => setForm({ ...form, rotation_strategy: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin">Round robin</SelectItem>
                  <SelectItem value="weighted">Weighted</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
                  <SelectItem value="least_latency">Least latency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Latency threshold</Label>
              <Input
                type="number"
                value={form.latency_threshold_ms}
                onChange={(e) => setForm({ ...form, latency_threshold_ms: e.target.value })}
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label>Failure threshold</Label>
              <Input
                type="number"
                value={form.failure_threshold}
                onChange={(e) => setForm({ ...form, failure_threshold: e.target.value })}
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Endpoints ({(form.proxy_ids || []).length} selected)</Label>
            <div className="rounded-lg border border-border max-h-40 overflow-y-auto thin-scroll">
              {proxies.length === 0 && (
                <div className="p-4 text-xs text-muted-foreground text-center">No endpoints configured yet.</div>
              )}
              {proxies.map((p) => {
                const selected = (form.proxy_ids || []).includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProxy(p.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 border-b border-border/30 last:border-0 hover:bg-secondary/40 flex items-center justify-between gap-3",
                      selected && "bg-primary/10"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{p.label || p.host}</div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">
                        {p.host}:{p.port} · {p.protocol} · {p.region || "—"}
                      </div>
                    </div>
                    <div className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center",
                      selected ? "bg-primary border-primary" : "border-border"
                    )}>
                      {selected && <div className="h-2 w-2 rounded-sm bg-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Auto-ban rules</Label>
                <p className="text-[11px] text-muted-foreground">Ban credentials that trigger these signals.</p>
              </div>
              <Switch checked={form.auto_ban_enabled} onCheckedChange={(v) => setForm({ ...form, auto_ban_enabled: v })} />
            </div>
            {form.auto_ban_enabled && (
              <div className="flex flex-wrap gap-2">
                {TRIGGER_OPTIONS.map((t) => {
                  const active = (form.auto_ban_triggers || []).includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTrigger(t)}
                      className={cn(
                        "px-2 py-1 rounded-md border text-[11px] font-mono uppercase tracking-wider transition-colors",
                        active
                          ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!form.name.trim()}>{initial ? "Save changes" : "Create pool"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}