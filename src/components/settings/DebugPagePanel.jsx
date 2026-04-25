import React from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bug, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function DebugPagePanel() {
  const [url, setUrl] = React.useState("");
  const [proxyCountry, setProxyCountry] = React.useState("au");
  const [result, setResult] = React.useState(null);

  const debugMut = useMutation({
    mutationFn: () => base44.functions.invoke("debugPage", { url, proxy_country: proxyCountry }),
    onSuccess: (response) => {
      setResult(response.data);
      toast.success("Page debug complete");
    },
    onError: (error) => toast.error(error?.response?.data?.error || error.message || "Could not debug page"),
  });

  const data = result?.data || result || {};

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold"><Bug className="h-4 w-4 text-primary" /> Browserless page debugger</div>
          <p className="text-xs text-muted-foreground mt-1">Inspect a target page through Browserless to discover inputs, iframes, title, URL and visible body text.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => debugMut.mutate()} disabled={!url || debugMut.isPending}>
          <RefreshCw className={`h-3.5 w-3.5 ${debugMut.isPending ? "animate-spin" : ""}`} /> Debug page
        </Button>
      </div>

      <div className="grid md:grid-cols-[1fr_160px] gap-2">
        <Input className="font-mono" placeholder="https://example.com/login" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Select value={proxyCountry} onValueChange={setProxyCountry}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="au">Australia proxy</SelectItem>
            <SelectItem value="us">US proxy</SelectItem>
            <SelectItem value="gb">UK proxy</SelectItem>
            <SelectItem value="ca">Canada proxy</SelectItem>
            <SelectItem value="nz">NZ proxy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {result ? (
        <div className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <DebugTile label="Title" value={data.title || "—"} />
            <DebugTile label="Final URL" value={data.finalUrl || "—"} mono />
          </div>
          <DebugList label="Inputs" rows={data.inputs || []} render={(item) => `${item.type || "text"} · #${item.id || "—"} · name=${item.name || "—"} · ${item.placeholder || ""}`} />
          <DebugList label="Iframes" rows={data.iframes || []} render={(item) => `${item.src || "—"} · #${item.id || "—"} · name=${item.name || "—"}`} />
          <div className="rounded-xl border border-border/70 bg-secondary/25 p-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Body snippet</div>
            <div className="text-xs text-muted-foreground whitespace-pre-wrap">{data.bodySnippet || "No body text returned."}</div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-xs text-muted-foreground">Enter a login URL to inspect the page before configuring selectors.</div>
      )}
    </section>
  );
}

function DebugTile({ label, value, mono }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/25 p-3 min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className={`text-sm truncate ${mono ? "font-mono" : "font-medium"}`}>{value}</div>
    </div>
  );
}

function DebugList({ label, rows, render }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/25 p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">{label} · {rows.length}</div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">None found.</div>
      ) : (
        <div className="space-y-1 max-h-40 overflow-auto thin-scroll">
          {rows.map((row, index) => <div key={index} className="text-xs font-mono text-muted-foreground break-all">{render(row)}</div>)}
        </div>
      )}
    </div>
  );
}