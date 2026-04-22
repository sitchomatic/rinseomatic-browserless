import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { SITES } from "@/lib/sites";

export default function CredentialDialog({ open, onOpenChange, onSubmit }) {
  const [form, setForm] = React.useState({ username: "", password: "", site: "joe", notes: "" });

  const submit = () => {
    if (!form.username.trim()) return;
    onSubmit({ ...form, status: "untested", attempts: 0 });
    setForm({ username: "", password: "", site: "joe", notes: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add credential</DialogTitle>
          <DialogDescription>Store a new credential pair in the vault. It will be untested until a run completes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="site">Site</Label>
            <Select value={form.site} onValueChange={(v) => setForm({ ...form, site: v })}>
              <SelectTrigger id="site"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SITES).map(([k, s]) => (
                  <SelectItem key={k} value={k}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="user@example.com"
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. primary account"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save credential</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}