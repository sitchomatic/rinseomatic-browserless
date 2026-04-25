import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export default function CredentialDialog({ open, onOpenChange, onSubmit, credential }) {
  const [form, setForm] = React.useState({
    username: "",
    password: "",
    password_variants: [],
    custom_login_url: "",
    login_strategy: "form",
    notes: "",
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        username: credential?.username || "",
        password: credential?.password || "",
        password_variants: credential?.password_variants || [],
        custom_login_url: credential?.custom_login_url || "",
        login_strategy: credential?.login_strategy || "form",
        notes: credential?.notes || "",
      });
    }
  }, [open, credential]);

  const submit = () => {
    if (!form.username || !form.password) return;
    onSubmit(form);
    onOpenChange(false);
  };

  const addPasswordVariant = () => {
    setForm({ ...form, password_variants: [...(form.password_variants || []), ""] });
  };

  const updatePasswordVariant = (idx, val) => {
    const updated = [...(form.password_variants || [])];
    updated[idx] = val;
    setForm({ ...form, password_variants: updated });
  };

  const removePasswordVariant = (idx) => {
    setForm({ ...form, password_variants: (form.password_variants || []).filter((_, i) => i !== idx) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{credential ? "Edit credential" : "Add credential"}</DialogTitle>
          <DialogDescription>Store one reusable username and password. Choose the target site only when starting a run.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Username / email</Label>
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Primary password</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          <div className="pt-1 border-t border-border/40">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Optional</div>
            
            <div className="grid gap-2 mb-3">
              <Label>Login strategy</Label>
              <Select value={form.login_strategy || "form"} onValueChange={(v) => setForm({ ...form, login_strategy: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="form">Form</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 mb-3">
              <Label>Custom login URL</Label>
              <Input className="font-mono text-xs" placeholder="Optional same-domain login URL override" value={form.custom_login_url || ""} onChange={(e) => setForm({ ...form, custom_login_url: e.target.value })} />
            </div>
            <div className="grid gap-2 mb-3">
              <Label>Notes</Label>
              <Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional reminder or source" />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Password variants (fallback)</Label>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={addPasswordVariant}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {(form.password_variants || []).map((pwd, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input 
                    type="password"
                    placeholder={`Alt password ${idx + 1}`}
                    value={pwd}
                    onChange={(e) => updatePasswordVariant(idx, e.target.value)}
                    className="text-xs"
                  />
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400"
                    onClick={() => removePasswordVariant(idx)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{credential ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}