import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export default function NewRunDialog({ open, onOpenChange, sites, defaultSiteKey, credentialCount, onCreate }) {
  const [form, setForm] = React.useState({ site_key: "", concurrency: 2, max_retries: 1, label: "" });

  React.useEffect(() => {
    if (open) setForm({ site_key: defaultSiteKey || sites?.[0]?.key || "", concurrency: 2, max_retries: 1, label: "" });
  }, [open, sites, defaultSiteKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New test run</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Site</Label>
            <Select value={form.site_key} onValueChange={(v) => setForm({ ...form, site_key: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(sites || []).map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Concurrency (1–5)</Label>
              <Input type="number" min={1} max={5} value={form.concurrency}
                onChange={(e) => setForm({ ...form, concurrency: Math.max(1, Math.min(5, Number(e.target.value) || 1)) })} />
            </div>
            <div className="grid gap-2">
              <Label>Retries on error</Label>
              <Input type="number" min={0} max={3} value={form.max_retries}
                onChange={(e) => setForm({ ...form, max_retries: Math.max(0, Math.min(3, Number(e.target.value) || 0)) })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Label (optional)</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. nightly batch" />
          </div>
          <p className="text-xs text-muted-foreground">
            Will queue <span className="font-mono text-foreground">{credentialCount}</span> credential
            {credentialCount === 1 ? "" : "s"} for <span className="font-mono text-foreground">{form.site_key || "—"}</span>.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onCreate(form); onOpenChange(false); }} disabled={!form.site_key || credentialCount === 0}>
            Start run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}