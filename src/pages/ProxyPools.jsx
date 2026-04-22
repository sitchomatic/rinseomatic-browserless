import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Shuffle, Layers, Trash2, Pencil, Ban } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import ProxyPoolDialog from "@/components/proxy/ProxyPoolDialog";
import StatusPill from "@/components/shared/StatusPill";
import { cn } from "@/lib/utils";

const STRATEGY_LABEL = {
  round_robin: "Round robin",
  weighted: "Weighted",
  random: "Random",
  least_latency: "Least latency",
};

export default function ProxyPools() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  const { data: pools = [] } = useQuery({
    queryKey: ["proxy-pools"],
    queryFn: () => base44.entities.ProxyPool.list("-created_date"),
  });
  const { data: proxies = [] } = useQuery({
    queryKey: ["proxies"],
    queryFn: () => base44.entities.Proxy.list("-created_date", 200),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.ProxyPool.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proxy-pools"] });
      toast.success("Pool created");
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProxyPool.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proxy-pools"] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.ProxyPool.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proxy-pools"] });
      toast.success("Pool deleted");
    },
  });

  const proxyMap = React.useMemo(() => new Map(proxies.map((p) => [p.id, p])), [proxies]);

  const totalPools = pools.length;
  const active = pools.filter((p) => p.enabled).length;
  const autoBan = pools.filter((p) => p.auto_ban_enabled).length;
  const totalEndpoints = pools.reduce((a, p) => a + (p.proxy_ids?.length || 0), 0);

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto">
      <PageHeader
        eyebrow="10 · proxy pools"
        title="Rotation pools"
        description="Group endpoints with rotation strategy, health thresholds, and auto-ban rules."
        actions={
          <Button size="sm" className="gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" /> New pool
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Metric label="Total pools" value={totalPools} icon={Layers} accent="text-sky-300" />
        <Metric label="Active" value={active} icon={Shuffle} accent="text-emerald-300" />
        <Metric label="Endpoints assigned" value={totalEndpoints} icon={Layers} accent="text-amber-300" />
        <Metric label="Auto-ban active" value={autoBan} icon={Ban} accent="text-rose-300" />
      </div>

      {pools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 py-20 text-center">
          <Layers className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
          <div className="text-sm font-medium mb-1">No pools yet</div>
          <div className="text-xs text-muted-foreground mb-4">
            Create a pool to group endpoints and apply rotation + auto-ban rules.
          </div>
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>Create pool</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pools.map((pool) => {
            const assigned = (pool.proxy_ids || []).map((id) => proxyMap.get(id)).filter(Boolean);
            const healthy = assigned.filter((p) => p.status === "healthy").length;
            return (
              <div key={pool.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-medium truncate">{pool.name}</div>
                      {pool.enabled ? (
                        <StatusPill status="healthy">enabled</StatusPill>
                      ) : (
                        <StatusPill status="idle">paused</StatusPill>
                      )}
                    </div>
                    {pool.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{pool.description}</p>
                    )}
                  </div>
                  <Switch
                    checked={!!pool.enabled}
                    onCheckedChange={(v) => updateMut.mutate({ id: pool.id, data: { enabled: v } })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <Tile label="Strategy" value={STRATEGY_LABEL[pool.rotation_strategy] || pool.rotation_strategy} />
                  <Tile label="Max latency" value={`${pool.latency_threshold_ms || 0}ms`} />
                  <Tile label="Fail limit" value={pool.failure_threshold || 0} />
                </div>

                <div className="rounded-lg border border-border bg-secondary/30 p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      Endpoints
                    </span>
                    <span className="text-xs font-mono tabular-nums">
                      <span className="text-emerald-300">{healthy}</span>
                      <span className="text-muted-foreground/50 mx-1">/</span>
                      <span>{assigned.length}</span>
                    </span>
                  </div>
                  {assigned.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground py-1">No endpoints assigned</div>
                  ) : (
                    <div className="space-y-1 max-h-24 overflow-y-auto thin-scroll">
                      {assigned.slice(0, 6).map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-[11px] font-mono">
                          <span className="truncate text-muted-foreground">{p.label || p.host}</span>
                          <span className={cn(
                            "shrink-0 ml-2",
                            p.status === "healthy" ? "text-emerald-300" :
                            p.status === "degraded" ? "text-amber-300" :
                            p.status === "down" ? "text-rose-300" : "text-muted-foreground"
                          )}>
                            {p.latency_ms ? `${p.latency_ms}ms` : p.status}
                          </span>
                        </div>
                      ))}
                      {assigned.length > 6 && (
                        <div className="text-[10px] text-muted-foreground">+ {assigned.length - 6} more</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                    Auto-ban triggers {!pool.auto_ban_enabled && "(disabled)"}
                  </div>
                  {pool.auto_ban_enabled && (pool.auto_ban_triggers?.length > 0) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {pool.auto_ban_triggers.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 text-[10px] font-mono uppercase tracking-wider">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => { setEditing(pool); setDialogOpen(true); }}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-muted-foreground hover:text-rose-400"
                    onClick={() => { if (confirm(`Delete pool "${pool.name}"?`)) deleteMut.mutate(pool.id); }}
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProxyPoolDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        proxies={proxies}
        onSubmit={(data) => {
          if (editing) updateMut.mutate({ id: editing.id, data });
          else createMut.mutate(data);
          setEditing(null);
        }}
      />
    </div>
  );
}

function Metric({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
      <div className={cn("h-8 w-8 rounded-md bg-secondary border border-border flex items-center justify-center", accent)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 px-2.5 py-2">
      <div className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-medium truncate">{value}</div>
    </div>
  );
}