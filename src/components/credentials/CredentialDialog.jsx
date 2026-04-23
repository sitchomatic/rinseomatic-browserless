import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export default function CredentialDialog({ open, onOpenChange, sites, onSubmit }) {
  const [form, setForm] = React.useState({ username: "", password: "", site_key: "" });

  React.useEffect(() => {
    if (open) setForm({ username: "", password: "", site_key: sites?.[0]?.key || "" });
  }, [open, sites]);

  const submit = () => {
    if (!form.username || !form.password || !form.site_key) return;
    onSubmit(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add credential</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Site</Label>
            <Select value={form.site_key} onValueChange={(v) => setForm({ ...form, site_key: v })}>
              <SelectTrigger><SelectValue placeholder="Pick a site" /></SelectTrigger>
              <SelectContent>
                {(sites || []).map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Username / email</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Password</Label>
            <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}