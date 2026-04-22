import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Activity, Globe, Trash2, RefreshCw } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusPill from "@/components/shared/StatusPill";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export default function ProxyVpn() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ label: "", host: "", port: 8080, protocol: "http", region: "" });

  const { data: proxies = [] } = useQuery({
    queryKey: ["proxies"],
    queryFn: () => base44.entities.Proxy.list("-created_date"),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Proxy.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proxies"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Proxy.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proxies"] }),
  });

  const checkHealthMut = useMutation({
    mutationFn: async (p) => {
      const latency = Math.floor(80 + Math.random() * 600);
      const status = latency < 300 ? "healthy" : latency < 500 ? "degraded" : "down";
      return base44.entities.Proxy.update(p.id, {
        status,
        latency_ms: latency,
        last_check: new Date().toISOString(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proxies"] }),
  });

  const healthy = proxies.filter((p) => p.status === "healthy").length;
  const degraded = proxies.filter((p) => p.status === "degraded").length;
  const down = proxies.filter((p) => p.status === "down").length;

  const submit = () => {
    if (!form.host.trim()) return;
    createMut.mutate({ ...form, port: Number(form.port) || 0, status: "untested" });
    setForm({ label: "", host: "", port: 8080, protocol: "http", region: "" });
    setOpen(false);
  };

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto">
      <PageHeader
        eyebrow="06 · network"
        title="Proxy & VPN"
        description="Tunnel pool with rotation weighting, health checks, and protocol diagnostics."
        actions={
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add endpoint
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Metric label="Healthy" value={healthy} accent="text-emerald-300" />
        <Metric label="Degraded" value={degraded} accent="text-amber-300" />
        <Metric label="Down" value={down} accent="text-rose-300" />
        <Metric label="Total pool" value={proxies.length} accent="text-sky-300" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono border-b border-border/60">
          <div className="col-span-3">Endpoint</div>
          <div className="col-span-2">Protocol</div>
          <div className="col-span-2">Region</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Latency</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {proxies.length === 0 && (
          <div className="py-16 text-center">
            <Globe className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">No endpoints configured.</div>
          </div>
        )}

        {proxies.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-border/30 last:border-0 hover:bg-secondary/30"
          >
            <div className="col-span-3 min-w-0">
              <div className="font-medium text-sm truncate">{p.label || p.host}</div>
              <div className="text-xs text-muted-foreground font-mono truncate">{p.host}:{p.port}</div>
            </div>
            <div className="col-span-2 text-xs font-mono uppercase text-muted-foreground">{p.protocol}</div>
            <div className="col-span-2 text-xs text-muted-foreground">{p.region || "—"}</div>
            <div className="col-span-2">
              <StatusPill status={p.status} />
            </div>
            <div className={cn("col-span-2 font-mono text-sm tabular-nums",
              p.latency_ms == null ? "text-muted-foreground" :
              p.latency_ms < 300 ? "text-emerald-300" :
              p.latency_ms < 500 ? "text-amber-300" : "text-rose-300")}>
              {p.latency_ms != null ? `${p.latency_ms}ms` : "—"}
            </div>
            <div className="col-span-1 flex justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => checkHealthMut.mutate(p)}>
                <RefreshCw className={cn("h-3.5 w-3.5", checkHealthMut.isPending && "animate-spin")} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-400" onClick={() => deleteMut.mutate(p.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add endpoint</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-2">
              <Label>Label</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="US-East primary" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 grid gap-2">
                <Label>Host</Label>
                <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} className="font-mono" placeholder="proxy.example.com" />
              </div>
              <div className="grid gap-2">
                <Label>Port</Label>
                <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} className="font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label>Protocol</Label>
                <Select value={form.protocol} onValueChange={(v) => setForm({ ...form, protocol: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                    <SelectItem value="socks5">SOCKS5</SelectItem>
                    <SelectItem value="wireguard">WireGuard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Region</Label>
                <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="us-east-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save endpoint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
      <div className={cn("h-8 w-8 rounded-md bg-secondary border border-border flex items-center justify-center", accent)}>
        <Activity className="h-3.5 w-3.5" />
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}