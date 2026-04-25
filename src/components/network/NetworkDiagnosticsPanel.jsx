import React from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import StatusPill from "@/components/shared/StatusPill";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function NetworkDiagnosticsPanel({ compact = false, className }) {
  const [result, setResult] = React.useState(null);

  const diagnostics = useMutation({
    mutationFn: () => base44.functions.invoke("networkDiagnostics", { repair: true, country: "AU" }),
    onSuccess: (response) => {
      setResult(response.data);
      toast.success(response.data?.repairs?.length ? "Network repaired and checked" : "Network checks complete");
    },
    onError: (error) => toast.error(error?.response?.data?.error || error.message || "Diagnostics failed"),
  });

  const checks = result?.checks || [];
  const status = result?.status || "idle";

  return (
    <section className={cn("rounded-2xl border border-border bg-card/80 overflow-hidden", className)}>
      <div className="p-4 md:p-5 border-b border-border/70 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl border border-primary/25 bg-primary/10 flex items-center justify-center glow-primary">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold">Live networking, proxy & NordLynx diagnostics</h2>
              <StatusPill status={status === "healthy" ? "working" : status === "healed" ? "completed" : "warning"}>
                {status}
              </StatusPill>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-repairs site proxy defaults, checks Browserless reachability, validates AU proxy setup, and tests NordLynx token access.
            </p>
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={() => diagnostics.mutate()} disabled={diagnostics.isPending}>
          {diagnostics.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
          Heal & test
        </Button>
      </div>

      <div className={cn("grid gap-3 p-4 md:p-5", compact ? "md:grid-cols-2" : "md:grid-cols-3")}>
        {diagnostics.isPending && checks.length === 0 ? (
          <DiagnosticSkeleton />
        ) : checks.length === 0 ? (
          <div className="md:col-span-3 rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-xs text-muted-foreground">
            Click “Heal & test” to run full networking diagnostics and safe automatic repairs.
          </div>
        ) : (
          checks.map((check, index) => <CheckTile key={`${check.label}-${index}`} check={check} />)
        )}
      </div>

      {(result?.repairs?.length > 0 || result?.checks?.some((check) => !check.ok)) && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-2">
          {result?.repairs?.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              Auto-repaired {result.repairs.length} site profile{result.repairs.length === 1 ? "" : "s"}: {result.repairs.map((repair) => repair.site_key).join(", ")}.
            </div>
          )}
          {result?.checks?.filter((check) => !check.ok).map((check, index) => (
            <div key={`${check.label}-${index}`} className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
              <span className="font-medium">Needs attention:</span> {check.label}{check.detail ? ` — ${check.detail}` : ""}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CheckTile({ check }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/25 p-3 min-h-[92px]">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Network check</div>
        {check.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <AlertTriangle className="h-4 w-4 text-amber-300" />}
      </div>
      <div className="text-sm font-medium leading-snug">{check.label}</div>
      {(check.detail || check.latency_ms) && (
        <div className="text-[11px] font-mono text-muted-foreground mt-2 truncate">
          {check.detail || `${check.latency_ms}ms`}
        </div>
      )}
    </div>
  );
}

function DiagnosticSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-xl border border-border/70 bg-secondary/25 p-3 min-h-[92px] animate-pulse">
          <ShieldCheck className="h-4 w-4 text-muted-foreground mb-3" />
          <div className="h-3 bg-muted rounded w-2/3 mb-2" />
          <div className="h-2 bg-muted rounded w-1/2" />
        </div>
      ))}
    </>
  );
}