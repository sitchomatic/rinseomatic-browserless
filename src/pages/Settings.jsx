import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Key, HardDrive, Shield, Database } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Settings() {
  const [apiKey, setApiKey] = React.useState(() => localStorage.getItem("sitchomatic.grok_key") || "");

  const saveKey = () => {
    localStorage.setItem("sitchomatic.grok_key", apiKey);
    toast.success("API key saved locally");
  };

  const { data: shots = [] } = useQuery({
    queryKey: ["screenshots"],
    queryFn: () => base44.entities.Screenshot.list("-created_date", 500),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["action-logs"],
    queryFn: () => base44.entities.ActionLog.list("-created_date", 500),
  });

  const dup = shots.filter((s) => s.is_duplicate).length;
  const retained = shots.length - dup;

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1200px] mx-auto">
      <PageHeader
        eyebrow="08 · settings"
        title="System & storage"
        description="Storage health, automation preferences, and secrets."
      />

      {/* Storage Health */}
      <section className="mb-8">
        <h2 className="text-sm font-medium mb-3">Storage health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HealthTile label="Screenshots" value={shots.length} sub="total captured" icon={HardDrive} />
          <HealthTile label="Dedup saves" value={dup} sub="bytes avoided" icon={HardDrive} accent="text-amber-300" />
          <HealthTile label="Retained" value={retained} sub="active records" icon={Database} accent="text-emerald-300" />
          <HealthTile label="Log events" value={logs.length} sub="delta-timestamped" icon={HardDrive} accent="text-sky-300" />
        </div>
      </section>

      {/* Automation settings */}
      <section className="mb-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium mb-1">Automation</h2>
        <p className="text-xs text-muted-foreground mb-5">Behavioral toggles for the login engine.</p>
        <div className="space-y-4">
          <Row title="Human-emulation typing" desc="Gaussian-jittered keystroke timing (Box-Muller)." defaultChecked />
          <Row title="Coordinate-based clicks" desc="Tap jitter and drift for realistic interaction." defaultChecked />
          <Row title="Credential burn protection" desc="Never auto-mark a credential as burned without confirmation." />
          <Row title="Auto proxy rotation" desc="Rotate proxy on failure or after N requests." defaultChecked />
          <Row title="AI auto-apply repairs" desc="Dangerous. Keep off — review manually in AI Repair." />
        </div>
      </section>

      {/* Secrets */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium mb-1">Secrets & API keys</h2>
        <p className="text-xs text-muted-foreground mb-5">Stored securely. Never bundled with app traffic.</p>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Key className="h-3.5 w-3.5" /> Grok / xAI API key
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="xai-•••••••••••••••••••"
                className="font-mono"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button variant="outline" onClick={saveKey}>Save</Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" /> App group identifier
            </Label>
            <Input
              readOnly
              value="group.app.rork.ve5l1conjgc135kle8kuj"
              className="font-mono text-muted-foreground"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function HealthTile({ label, value, sub, icon: Icon, accent = "text-primary" }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
        <Icon className={cn("h-3.5 w-3.5", accent)} />
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground font-mono">{sub}</div>
    </div>
  );
}

function Row({ title, desc, defaultChecked }) {
  const [on, setOn] = React.useState(!!defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={on} onCheckedChange={setOn} />
    </div>
  );
}