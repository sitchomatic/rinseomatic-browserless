import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { countCredentialsForSite, MAX_BROWSER_SESSIONS, MAX_RETRIES, normalizeRunForm } from "@/lib/runPlanning";

export default function NewRunDialog({ open, onOpenChange, sites, defaultSiteKey, credentials, onCreate }) {
  const [form, setForm] = React.useState({ site_key: "", concurrency: 2, max_retries: 1, label: "" });

  React.useEffect(() => {
    if (open) setForm({ site_key: defaultSiteKey || sites?.[0]?.key || "", concurrency: MAX_BROWSER_SESSIONS, max_retries: 1, label: "" });
  }, [open, sites, defaultSiteKey]);

  const normalizedForm = React.useMemo(() => normalizeRunForm(form), [form]);
  const credentialCount = React.useMemo(
    () => countCredentialsForSite(credentials, normalizedForm.site_key),
    [credentials, normalizedForm.site_key]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New test run</DialogTitle>
          <DialogDescription>Select the target site. Credentials are reusable and are applied to this site only for this run.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Site to test</Label>
            <Select value={form.site_key} onValueChange={(v) => setForm({ ...form, site_key: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(sites || []).map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Parallel browser sessions (1–{MAX_BROWSER_SESSIONS})</Label>
              <Input type="number" min={1} max={MAX_BROWSER_SESSIONS} value={form.concurrency}
                onChange={(e) => setForm({ ...form, concurrency: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Retry failed browser errors</Label>
              <Input type="number" min={0} max={MAX_RETRIES} value={form.max_retries}
                onChange={(e) => setForm({ ...form, max_retries: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Label (optional)</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. nightly batch" />
          </div>
          <p className="text-xs text-muted-foreground rounded-md border border-border bg-secondary/40 p-2">
            Effect: clicking <span className="text-foreground font-medium">Start test run</span> will queue <span className="font-mono text-foreground">{credentialCount}</span> reusable credential
            {credentialCount === 1 ? "" : "s"} against <span className="font-mono text-foreground">{normalizedForm.site_key || "—"}</span>.
            {credentialCount === 0 && <span className="block mt-1 text-amber-300">No credentials exist yet, so the run cannot start.</span>}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} title="Close without starting a run">Cancel</Button>
          <Button onClick={() => { onCreate(normalizedForm); onOpenChange(false); }} disabled={!normalizedForm.site_key || credentialCount === 0} title="Create queued results and begin testing credentials for the selected site">
            Start test run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}