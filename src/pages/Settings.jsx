import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { Plus, Trash2, Sparkles, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BLANK = {
  key: "", label: "", login_url: "",
  username_selector: "input[type='email'], input[name='username']",
  password_selector: "input[type='password']",
  submit_selector: "button[type='submit']",
  success_selector: ".ol-alert__content.ol-alert__content--status_success",
  login_url_marker: "/login",
  success_url_contains: "",
  wait_after_submit_ms: 3500,
  proxy_type: "none",
  proxy_country: "",
  proxy_city: "",
  proxy_sticky: false,
  proxy_locale_match: false,
  proxy_preset: "",
  external_proxy_url: "",
  enabled: true,
};

export default function Settings() {
  const qc = useQueryClient();
  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list("-created_date", 100),
  });

  const [draft, setDraft] = React.useState(BLANK);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  const saveMut = useMutation({
    mutationFn: async (d) => {
      const existing = d.id
        ? await base44.entities.Site.update(d.id, d)
        : await base44.entities.Site.create(d);
      return existing;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sites"] });
      setDraft(BLANK);
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
    <div className="px-6 md:px-10 py-8 max-w-[1200px] mx-auto">
      <PageHeader
        eyebrow="03 · config"
        title="Settings"
        description="Sites the tester can log into. Browserless API key is stored server-side as a secret."
        actions={
          sites.length === 0 ? (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
              <Sparkles className="h-3.5 w-3.5" /> Seed defaults
            </Button>
          ) : null
        }
      />

      <div className="grid lg:grid-cols-[1fr_420px] gap-6">
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
                <div className="min-w-0 flex items-center gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {s.label}
                      <span className="text-muted-foreground font-mono text-xs">· {s.key}</span>
                      {!s.enabled && <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 border border-amber-500/30 bg-amber-500/10 rounded px-1.5 py-0.5">disabled</span>}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground truncate">{s.login_url}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setDraft(s)}>
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

        <div className="rounded-xl border border-border bg-card p-5 space-y-3 h-fit sticky top-6">
          <div className="flex items-center gap-2 mb-1">
            <Plus className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">{editing ? "Edit site" : "Add site"}</div>
          </div>
          <Field label="Key (slug)" value={draft.key} onChange={(v) => setDraft({ ...draft, key: v })} />
          <Field label="Label" value={draft.label} onChange={(v) => setDraft({ ...draft, label: v })} />
          <Field label="Login URL" value={draft.login_url} onChange={(v) => setDraft({ ...draft, login_url: v })} />
          <Field label="Username selector" mono value={draft.username_selector} onChange={(v) => setDraft({ ...draft, username_selector: v })} />
          <Field label="Password selector" mono value={draft.password_selector} onChange={(v) => setDraft({ ...draft, password_selector: v })} />
          <Field label="Submit selector" mono value={draft.submit_selector} onChange={(v) => setDraft({ ...draft, submit_selector: v })} />
          <Field label="Success selector" mono value={draft.success_selector} onChange={(v) => setDraft({ ...draft, success_selector: v })} />
          <Field label="Login URL marker (fail if URL still contains)" mono value={draft.login_url_marker} onChange={(v) => setDraft({ ...draft, login_url_marker: v })} />
          <Field label="Success URL contains (optional)" mono value={draft.success_url_contains || ""} onChange={(v) => setDraft({ ...draft, success_url_contains: v })} />
          <Field label="Wait after submit (ms)" type="number" value={draft.wait_after_submit_ms} onChange={(v) => setDraft({ ...draft, wait_after_submit_ms: Number(v) || 0 })} />
          
          <div className="pt-3 border-t border-border/40 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proxy settings</div>
            <SelectField 
              label="Proxy type" 
              value={draft.proxy_type || "none"} 
              options={[
                { label: "None", value: "none" },
                { label: "Residential (Browserless)", value: "residential" },
                { label: "External proxy", value: "external" }
              ]}
              onChange={(v) => setDraft({ ...draft, proxy_type: v })} 
            />
            {(draft.proxy_type === "residential" || draft.proxy_type === undefined) && (
              <>
                <Field label="Country (ISO 3166 code, e.g. au, us)" value={draft.proxy_country || ""} onChange={(v) => setDraft({ ...draft, proxy_country: v })} />
                <Field label="City (Scale plan only)" value={draft.proxy_city || ""} onChange={(v) => setDraft({ ...draft, proxy_city: v })} />
                <SelectField 
                  label="Preset" 
                  value={draft.proxy_preset || ""} 
                  options={[
                    { label: "None", value: "" },
                    { label: "Government sites (px_gov01)", value: "px_gov01" },
                    { label: "Google domains (px_ipv6)", value: "px_ipv6" }
                  ]}
                  onChange={(v) => setDraft({ ...draft, proxy_preset: v })} 
                />
                <div className="flex items-center gap-2">
                  <Switch checked={!!draft.proxy_sticky} onCheckedChange={(v) => setDraft({ ...draft, proxy_sticky: v })} />
                  <span className="text-xs text-muted-foreground">Sticky IP (same across session)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!draft.proxy_locale_match} onCheckedChange={(v) => setDraft({ ...draft, proxy_locale_match: v })} />
                  <span className="text-xs text-muted-foreground">Match locale to proxy location</span>
                </div>
              </>
            )}
            {draft.proxy_type === "external" && (
              <Field label="Proxy URL (http(s)://[user:pass@]host:port)" value={draft.external_proxy_url || ""} onChange={(v) => setDraft({ ...draft, external_proxy_url: v })} />
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Switch checked={!!draft.enabled} onCheckedChange={(v) => setDraft({ ...draft, enabled: v })} />
              <span className="text-sm text-muted-foreground">Enabled</span>
            </div>
            <div className="flex gap-2">
              {editing && <Button variant="outline" size="sm" onClick={() => setDraft(BLANK)}>Cancel</Button>}
              <Button size="sm" onClick={() => saveMut.mutate(draft)} disabled={!draft.key || !draft.label || !draft.login_url}>
                {editing ? "Save" : "Add"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Delete site?"
        description={confirmDelete ? `${confirmDelete.label} (${confirmDelete.key}) will be permanently removed. Existing credentials and runs referencing this site will remain but will no longer be testable.` : ""}
        confirmLabel="Delete site"
        destructive
        onConfirm={() => { if (confirmDelete) deleteMut.mutate(confirmDelete.id); setConfirmDelete(null); }}
      />
    </div>
  );
}

function Field({ label, value, onChange, mono, type = "text" }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={mono ? "font-mono text-xs" : ""} />
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}