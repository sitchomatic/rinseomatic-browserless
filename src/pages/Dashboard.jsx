import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { CheckCircle2, XCircle, Clock, Play, Square } from "lucide-react";
import { Link } from "react-router-dom";
import { formatMs } from "@/lib/sites";
import { buildDashboardMetrics } from "@/lib/dashboardMetrics";
import MaintenanceStatusBadge from "@/components/dashboard/MaintenanceStatusBadge";
import DashboardVisualSummary from "@/components/dashboard/DashboardVisualSummary";
import { Button } from "@/components/ui/button";
import { runInBatches } from "@/lib/batches";
import { toast } from "sonner";

export default function Dashboard() {
  const qc = useQueryClient();
  const { data: userPrefs } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
    staleTime: 60 * 1000,
  });
  const refreshMs = Math.max(15, Number(userPrefs?.dashboard_refresh_seconds ?? 30)) * 1000;

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list("-created_date", 100),
    refetchInterval: refreshMs,
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ["test-runs-all"],
    queryFn: () => base44.entities.TestRun.list("-created_date", 500),
    refetchInterval: refreshMs,
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ["dashboard-credentials"],
    queryFn: () => base44.entities.Credential.list("-created_date", 5000),
    staleTime: 30 * 1000,
  });

  const { siteStats, totals } = React.useMemo(() => buildDashboardMetrics(sites, runs), [sites, runs]);
  const activeRuns = React.useMemo(() => runs.filter((run) => run.status === "queued" || run.status === "running"), [runs]);
  const activeRunsBySite = React.useMemo(() => {
    const map = new Map();
    activeRuns.forEach((run) => {
      const list = map.get(run.site_key) || [];
      list.push(run);
      map.set(run.site_key, list);
    });
    return map;
  }, [activeRuns]);
  const credentialsBySite = React.useMemo(() => {
    const map = new Map();
    credentials.forEach((credential) => {
      const list = map.get(credential.site_key) || [];
      list.push(credential);
      map.set(credential.site_key, list);
    });
    return map;
  }, [credentials]);
  const isLoading = sitesLoading || runsLoading;

  const startRunMut = useMutation({
    mutationFn: async (site) => {
      const siteCredentials = credentialsBySite.get(site.key) || [];
      if (siteCredentials.length === 0) throw new Error("No credentials for this site");
      const run = await base44.entities.TestRun.create({
        label: `Maintenance · ${site.label}`,
        site_key: site.key,
        concurrency: 2,
        max_retries: 1,
        status: "queued",
        total_count: siteCredentials.length,
        pending_count: siteCredentials.length,
      });
      await runInBatches(siteCredentials, 500, (chunk) => base44.entities.TestResult.bulkCreate(chunk.map((credential) => ({
        run_id: run.id,
        credential_id: credential.id,
        site_key: credential.site_key,
        username: credential.username,
        status: "queued",
      }))));
      await base44.functions.invoke("runWorker", { run_id: run.id });
      return run;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-runs-all"] });
      toast.success("Maintenance run started");
    },
    onError: (error) => toast.error(error?.message || "Could not start run"),
  });

  const stopRunMut = useMutation({
    mutationFn: async (siteKey) => {
      const siteRuns = activeRunsBySite.get(siteKey) || [];
      await Promise.all(siteRuns.map(async (run) => {
        await base44.entities.TestRun.update(run.id, { status: "cancelled", ended_at: new Date().toISOString(), pending_count: 0, worker_id: null, claimed_at: null });
        const pending = await base44.entities.TestResult.filter({ run_id: run.id }, "-created_date", 5000);
        await Promise.all(pending.filter((result) => result.status === "queued" || result.status === "running").map((result) => base44.entities.TestResult.update(result.id, { status: "error", error_message: "Cancelled" })));
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-runs-all"] });
      toast.success("Maintenance run stopped");
    },
  });

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        eyebrow="00 · overview"
        title="Dashboard"
        description="Maintenance status by site, based on the latest completed credential test run."
        className="mb-0"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryTile label="Total tested" value={totals.tested} icon={Clock} />
        <SummaryTile label="Working" value={totals.working} icon={CheckCircle2} accent="text-emerald-300" />
        <SummaryTile label="Failed / Error" value={totals.failed} icon={XCircle} accent="text-rose-300" />
      </div>

      <DashboardVisualSummary totals={totals} siteStats={siteStats} activeRuns={activeRuns} />

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card/40 py-16 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : sites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 py-16 text-center">
          <div className="text-sm text-muted-foreground">No sites configured yet.</div>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Site maintenance</h2>
              <p className="text-xs text-muted-foreground mt-1">Quickly spot healthy, monitored, and critical sites.</p>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{siteStats.length} sites</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {siteStats.map(({ site, lastRun }) => {
              const siteActiveRuns = activeRunsBySite.get(site.key) || [];
              const credentialCount = credentialsBySite.get(site.key)?.length || 0;
              return (
                <SiteCard
                  key={site.key}
                  site={site}
                  lastRun={lastRun}
                  activeRuns={siteActiveRuns}
                  credentialCount={credentialCount}
                  onStart={() => startRunMut.mutate(site)}
                  onStop={() => stopRunMut.mutate(site.key)}
                  isStarting={startRunMut.isPending}
                  isStopping={stopRunMut.isPending}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function SiteCard({ site, lastRun, activeRuns = [], credentialCount = 0, onStart, onStop, isStarting, isStopping }) {
  const working = lastRun?.working_count || 0;
  const failed = (lastRun?.failed_count || 0) + (lastRun?.error_count || 0);
  const total = lastRun?.total_count || 0;
  const pct = total ? Math.round((working / total) * 100) : null;

  const passRate = pct !== null ? pct : null;
  const hasRun = !!lastRun;
  const isActive = activeRuns.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm hover:border-primary/30 transition-colors flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-base font-semibold truncate">{site.label}</div>
          <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate max-w-[320px]">{site.login_url}</div>
        </div>
        <MaintenanceStatusBadge hasRun={hasRun} passRate={passRate} />
      </div>

      <div className="flex items-center gap-2">
        {isActive ? (
          <Button variant="outline" size="sm" className="gap-2 flex-1 border-rose-500/30 text-rose-300 hover:text-rose-200" onClick={onStop} disabled={isStopping}>
            <Square className="h-3.5 w-3.5" /> Stop
          </Button>
        ) : (
          <Button size="sm" className="gap-2 flex-1" onClick={onStart} disabled={isStarting || credentialCount === 0} title={credentialCount === 0 ? "No credentials for this site" : "Start maintenance run"}>
            <Play className="h-3.5 w-3.5" /> Start
          </Button>
        )}
        <div className="text-[10px] font-mono text-muted-foreground px-2">{credentialCount} creds</div>
      </div>

      {hasRun ? (
        <>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Working" value={working} color="text-emerald-300" />
            <Stat label="Failed" value={failed} color="text-rose-300" />
            <Stat label="Total" value={total} />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
              <span>Pass rate</span>
              <span>{passRate}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${passRate}%`,
                  background: passRate >= 80 ? "hsl(var(--success))" : passRate >= 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))",
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
            <span>Elapsed: {formatMs(lastRun.elapsed_ms)}</span>
            <Link to={`/runs/${lastRun.id}`} className="text-primary hover:underline">
              View run →
            </Link>
          </div>
        </>
      ) : (
        <div className="text-xs text-muted-foreground italic">No completed runs yet.</div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className={`h-3.5 w-3.5 ${accent || "text-muted-foreground"}`} />
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${accent || ""}`}>{value}</div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/30 px-3 py-3">
      <div className={`text-xl font-semibold tabular-nums ${color || ""}`}>{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}