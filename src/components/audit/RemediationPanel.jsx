import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RemediationPanel() {
  const qc = useQueryClient();
  const [siteKey, setSiteKey] = useState("");
  const [username, setUsername] = useState("");

  const healMut = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("autoHealRuns", {
        site_key: siteKey || undefined,
        username: username || undefined
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully healed ${data.healed_count} failed result(s)`);
      qc.invalidateQueries({ queryKey: ["test-results"] });
      qc.invalidateQueries({ queryKey: ["test-runs"] });
      qc.invalidateQueries({ queryKey: ["auditLogs"] });
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message)
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 mt-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold">Remediation</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Selectively auto-heal failed results by resetting them to queued state. Leave fields blank to apply broadly.
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label className="text-xs">Site Key (Optional)</Label>
          <Input placeholder="e.g. joe" value={siteKey} onChange={e => setSiteKey(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Username (Optional)</Label>
          <Input placeholder="e.g. testuser@gmail.com" value={username} onChange={e => setUsername(e.target.value)} className="h-8 text-sm" />
        </div>
        <Button onClick={() => healMut.mutate()} disabled={healMut.isPending} size="sm" className="h-8">
          {healMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Heal Failed Runs
        </Button>
      </div>
    </div>
  );
}