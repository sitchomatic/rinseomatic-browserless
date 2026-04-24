import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import SiteFormPanel, { BLANK_SITE } from "@/components/settings/SiteFormPanel";
import { Trash2, Sparkles, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Settings() {
  const qc = useQueryClient();
  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list("-created_date", 100),
  });

  const [draft, setDraft] = React.useState(BLANK_SITE);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  const saveMut = useMutation({
    mutationFn: async (d) => {
      return d.id
        ? base44.entities.Site.update(d.id, d)
        : base44.entities.Site.create(d);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      setDraft(BLANK_SITE);
      toast.success("Site saved");
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Site.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sites"] }); toast.success("Site deleted"); },
  });
  const seedMut = useMutation({
    mutationFn: () => base44.functions.invoke("seedSites", {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sites"] }); toast.success("Seeded default sites"); },
    onError: (e) => toast.error(e?.response?.data?.error || e.message),
  });

  const editing = !!draft.id;

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="03 · config"
        title="Settings"
        description="Per-site automation profile: selectors, proxy routing, stealth, viewport, and Chrome flags. Browserless API key is stored server-side."
        actions={
          sites.length === 0 ? (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
              <Sparkles className="h-3.5 w-3.5" /> Seed defaults
            </Button>
          ) : null
        }
      />

      <div className="grid lg:grid-cols-[1fr_440px] gap-6">
        <div className="space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Configured sites · {sites.length}</div>
          {sites.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card/40 py-10 text-center text-sm text-muted-foreground">
              No sites yet. Add one on the right, or click "Seed defaults".
            </div>
          )}
          {sites.map((s) => (
            <div
              key={s.id}
              className={cn(
                "rounded-xl border bg-card p-4 transition-colors",
                draft.id === s.id ? "border-primary/60 ring-1 ring-primary/20" : "border-border"
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    {s.label}
                    <span className="text-muted-foreground font-mono text-xs">· {s.key}</span>
                    {!s.enabled && <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 border border-amber-500/30 bg-amber-500/10 rounded px-1.5 py-0.5">disabled</span>}
                    {s.proxy_type === "residential" && (
                      <span className="text-[10px] font-mono uppercase text-primary border border-primary/30 bg-primary/10 rounded px-1.5 py-0.5">
                        proxy · {(s.proxy_country || "any").toUpperCase()}{s.proxy_sticky ? " · sticky" : ""}
                      </span>
                    )}
                    {s.proxy_type === "external" && (
                      <span className="text-[10px] font-mono uppercase text-cyan-300 border border-cyan-500/30 bg-cyan-500/10 rounded px-1.5 py-0.5">external proxy</span>
                    )}
                    {s.stealth && <span className="text-[10px] font-mono uppercase text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 rounded px-1.5 py-0.5">stealth</span>}
                    {s.block_ads && <span className="text-[10px] font-mono uppercase text-muted-foreground border border-border rounded px-1.5 py-0.5">blockAds</span>}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground truncate">{s.login_url}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setDraft({ ...BLANK_SITE, ...s })}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-400"
                    onClick={() => setConfirmDelete(s)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-muted-foreground">
                <div>user: <span className="text-foreground/80 truncate inline-block max-w-full align-bottom">{s.username_selector}</span></div>
                <div>pass: <span className="text-foreground/80 truncate inline-block max-w-full align-bottom">{s.password_selector}</span></div>
                <div>submit: <span className="text-foreground/80 truncate inline-block max-w-full align-bottom">{s.submit_selector}</span></div>
                <div>success: <span className="text-foreground/80 truncate inline-block max-w-full align-bottom">{s.success_selector}</span></div>
              </div>
            </div>
          ))}
        </div>

        <SiteFormPanel
          draft={draft}
          setDraft={setDraft}
          editing={editing}
          onSave={() => saveMut.mutate(draft)}
          onCancel={() => setDraft(BLANK_SITE)}
        />
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete site?"
        description={confirmDelete ? `${confirmDelete.label} (${confirmDelete.key}) will be permanently removed.` : ""}
        confirmLabel="Delete site"
        destructive
        onConfirm={() => { if (confirmDelete) deleteMut.mutate(confirmDelete.id); setConfirmDelete(null); }}
      />
    </div>
  );
}