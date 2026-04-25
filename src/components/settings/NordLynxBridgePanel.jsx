import React from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cable, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function NordLynxBridgePanel() {
  const [country, setCountry] = React.useState("AU");
  const [result, setResult] = React.useState(null);

  const generateMut = useMutation({
    mutationFn: () => base44.functions.invoke("nordLynxProxyEngine", { country }),
    onSuccess: (response) => {
      setResult(response.data);
      toast.success("NordLynx bridge generated");
    },
    onError: (error) => toast.error(error?.response?.data?.error || error.message || "Could not generate NordLynx bridge"),
  });

  const copy = async (text, label) => {
    await navigator.clipboard.writeText(text || "");
    toast.success(`${label} copied`);
  };

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold"><Cable className="h-4 w-4 text-primary" /> NordLynx bridge</div>
          <p className="text-xs text-muted-foreground mt-1">Generate WireGuard + SOCKS5 handoff details for a selected NordVPN exit country.</p>
        </div>
        <div className="flex gap-2">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AU">Australia</SelectItem>
              <SelectItem value="US">United States</SelectItem>
              <SelectItem value="GB">United Kingdom</SelectItem>
              <SelectItem value="CA">Canada</SelectItem>
              <SelectItem value="NZ">New Zealand</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-2" onClick={() => generateMut.mutate()} disabled={generateMut.isPending}>
            <RefreshCw className={`h-3.5 w-3.5 ${generateMut.isPending ? "animate-spin" : ""}`} /> Generate
          </Button>
        </div>
      </div>

      {result ? (
        <div className="grid gap-3">
          <div className="grid md:grid-cols-3 gap-3">
            <Info label="Server" value={result.server?.hostname || result.server?.name || "—"} />
            <Info label="Load" value={typeof result.server?.load === "number" ? `${result.server.load}%` : "—"} />
            <Info label="Browser proxy" value={result.browser_proxy || "—"} mono />
          </div>
          <CommandBox label="Cloud bridge command" value={result.cloud_bridge_command} onCopy={() => copy(result.cloud_bridge_command, "Bridge command")} />
          <CommandBox label="WireGuard config" value={result.wireguard_config} onCopy={() => copy(result.wireguard_config, "WireGuard config")} tall />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-xs text-muted-foreground">Choose a country and generate a bridge to see server, command, and WireGuard output.</div>
      )}
    </section>
  );
}

function Info({ label, value, mono }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/25 p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className={`text-sm truncate ${mono ? "font-mono" : "font-medium"}`}>{value}</div>
    </div>
  );
}

function CommandBox({ label, value, onCopy, tall }) {
  return (
    <div className="rounded-xl border border-border/70 bg-black/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={onCopy}><Copy className="h-3 w-3" /> Copy</Button>
      </div>
      <pre className={`thin-scroll overflow-auto p-3 text-xs font-mono text-emerald-100/90 whitespace-pre-wrap ${tall ? "max-h-72" : "max-h-28"}`}>{value || "—"}</pre>
    </div>
  );
}