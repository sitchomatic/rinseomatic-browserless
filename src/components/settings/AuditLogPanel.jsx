import React from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Send } from "lucide-react";
import { toast } from "sonner";

export default function AuditLogPanel() {
  const [form, setForm] = React.useState({ message: "", level: "info", category: "system", site: "manual" });

  const logMut = useMutation({
    mutationFn: () => base44.functions.invoke("logAuditEvent", form),
    onSuccess: () => {
      setForm((current) => ({ ...current, message: "" }));
      toast.success("Audit event logged");
    },
    onError: (error) => toast.error(error?.response?.data?.error || error.message || "Could not log audit event"),
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-primary" /> Manual audit event</div>
          <p className="text-xs text-muted-foreground mt-1">Create a manual ActionLog entry for operational notes, investigations, or maintenance checkpoints.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => logMut.mutate()} disabled={!form.message || logMut.isPending}>
          <Send className="h-3.5 w-3.5" /> Log event
        </Button>
      </div>

      <div className="grid md:grid-cols-[1fr_130px_140px_140px] gap-2">
        <Input placeholder="Audit message" value={form.message} onChange={(e) => update("message", e.target.value)} />
        <Select value={form.level} onValueChange={(v) => update("level", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="success">Success</SelectItem>
          </SelectContent>
        </Select>
        <Select value={form.category} onValueChange={(v) => update("category", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="network">Network</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="proxy">Proxy</SelectItem>
            <SelectItem value="dom">DOM</SelectItem>
            <SelectItem value="ai">AI</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Site/context" value={form.site} onChange={(e) => update("site", e.target.value)} />
      </div>
    </section>
  );
}