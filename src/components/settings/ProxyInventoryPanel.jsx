import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusPill from "@/components/shared/StatusPill";
import { Network, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const BLANK_PROXY = { label: "", host: "", port: 8080, protocol: "http", region: "AU", status: "untested", rotation_weight: 1 };

export default function ProxyInventoryPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = React.useState(BLANK_PROXY);
  const { data: proxies = [] } = useQuery({ queryKey: ["proxy-inventory"], queryFn: () => base44.entities.Proxy.list("-created_date", 100) });

  const saveMut = useMutation({
    mutationFn: () => base44.entities.Proxy.create(draft),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proxy-inventory"] }); setDraft(BLANK_PROXY); toast.success("Proxy saved"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Proxy.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proxy-inventory"] }); toast.success("Proxy removed"); },
  });

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold"><Network className="h-4 w-4 text-primary" /> Proxy inventory</div>
          <p className="text-xs text-muted-foreground mt-1">Register external or WireGuard proxy endpoints for rotation and health tracking.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => saveMut.mutate()} disabled={!draft.host || saveMut.isPending}><Plus className="h-3.5 w-3.5" /> Add proxy</Button>
      </div>

      <div className="grid md:grid-cols-6 gap-2">
        <Input placeholder="Label" value={draft.label} onChange={(e) => update("label", e.target.value)} />
        <Input className="md:col-span-2 font-mono" placeholder="Host" value={draft.host} onChange={(e) => update("host", e.target.value)} />
        <Input type="number" placeholder="Port" value={draft.port} onChange={(e) => update("port", Number(e.target.value))} />
        <Select value={draft.protocol} onValueChange={(v) => update("protocol", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="http">HTTP</SelectItem>
            <SelectItem value="https">HTTPS</SelectItem>
            <SelectItem value="socks5">SOCKS5</SelectItem>
            <SelectItem value="wireguard">WireGuard</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Region" value={draft.region} onChange={(e) => update("region", e.target.value)} />
      </div>

      <div className="rounded-xl border border-border/70 overflow-hidden">
        {proxies.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">No proxies registered yet.</div>
        ) : proxies.map((proxy) => (
          <div key={proxy.id} className="grid md:grid-cols-[1fr_120px_120px_90px_40px] gap-3 items-center p-3 border-b border-border/60 last:border-b-0 text-sm">
            <div className="min-w-0">
              <div className="font-medium truncate">{proxy.label || proxy.host}</div>
              <div className="text-xs font-mono text-muted-foreground truncate">{proxy.protocol}://{proxy.host}:{proxy.port}</div>
            </div>
            <div className="text-xs font-mono text-muted-foreground">{proxy.region || "—"}</div>
            <StatusPill status={proxy.status || "untested"} />
            <div className="text-xs font-mono text-muted-foreground">{proxy.latency_ms ? `${proxy.latency_ms}ms` : "—"}</div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-400" onClick={() => deleteMut.mutate(proxy.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </section>
  );
}