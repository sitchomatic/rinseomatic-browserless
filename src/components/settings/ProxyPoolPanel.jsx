import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Boxes, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const BLANK_POOL = { name: "", description: "", rotation_strategy: "round_robin", latency_threshold_ms: 500, failure_threshold: 3, auto_ban_enabled: true, enabled: true, proxy_ids: [], auto_ban_triggers: ["captcha", "403", "rate_limit"] };

export default function ProxyPoolPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = React.useState(BLANK_POOL);
  const { data: pools = [] } = useQuery({ queryKey: ["proxy-pools"], queryFn: () => base44.entities.ProxyPool.list("-created_date", 100) });

  const saveMut = useMutation({
    mutationFn: () => base44.entities.ProxyPool.create(draft),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proxy-pools"] }); setDraft(BLANK_POOL); toast.success("Proxy pool saved"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.ProxyPool.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proxy-pools"] }); toast.success("Proxy pool removed"); },
  });

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold"><Boxes className="h-4 w-4 text-primary" /> Proxy pools</div>
          <p className="text-xs text-muted-foreground mt-1">Define rotation strategy, failure thresholds, and auto-ban behaviour for proxy groups.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => saveMut.mutate()} disabled={!draft.name || saveMut.isPending}><Plus className="h-3.5 w-3.5" /> Add pool</Button>
      </div>

      <div className="grid md:grid-cols-5 gap-2">
        <Input placeholder="Pool name" value={draft.name} onChange={(e) => update("name", e.target.value)} />
        <Input className="md:col-span-2" placeholder="Description" value={draft.description} onChange={(e) => update("description", e.target.value)} />
        <Select value={draft.rotation_strategy} onValueChange={(v) => update("rotation_strategy", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="round_robin">Round robin</SelectItem>
            <SelectItem value="weighted">Weighted</SelectItem>
            <SelectItem value="random">Random</SelectItem>
            <SelectItem value="least_latency">Least latency</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center justify-between rounded-md border border-input px-3 text-xs text-muted-foreground">
          Auto-ban <Switch checked={draft.auto_ban_enabled} onCheckedChange={(v) => update("auto_ban_enabled", v)} />
        </label>
      </div>

      <div className="rounded-xl border border-border/70 overflow-hidden">
        {pools.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">No proxy pools configured yet.</div>
        ) : pools.map((pool) => (
          <div key={pool.id} className="grid md:grid-cols-[1fr_130px_120px_40px] gap-3 items-center p-3 border-b border-border/60 last:border-b-0 text-sm">
            <div className="min-w-0">
              <div className="font-medium truncate">{pool.name}</div>
              <div className="text-xs text-muted-foreground truncate">{pool.description || "No description"}</div>
            </div>
            <div className="text-xs font-mono text-muted-foreground">{pool.rotation_strategy}</div>
            <div className="text-xs font-mono text-muted-foreground">{pool.auto_ban_enabled ? "auto-ban on" : "auto-ban off"}</div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-400" onClick={() => deleteMut.mutate(pool.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </section>
  );
}