import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Square, Play, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import StatusPill from "@/components/shared/StatusPill";
import SiteChip from "@/components/shared/SiteChip";
import ResultsTable from "@/components/runs/ResultsTable";
import { formatMs } from "@/lib/sites";
import { runProgress, summarizeResults } from "@/lib/runMetrics";
import { toast } from "sonner";
import { useRunWorker } from "@/lib/useRunWorker";

export default function RunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = React.useState("all");

  const { data: run, isLoading: runLoading, isError: runError } = useQuery({
    queryKey: ["test-run", id],
    queryFn: async () => (await base44.entities.TestRun.filter({ id }))[0] || null,
    enabled: !!id,
  });

  const { data: results = [] } = useQuery({
    queryKey: ["test-results", id],
    queryFn: () => base44.entities.TestResult.filter({ run_id: id }, "-created_date", 5000),
    enabled: !!id,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list("-created_date", 100),
  });
  const siteLabel = sites.find((s) => s.key === run?.site_key)?.label || run?.site_key;

  React.useEffect(() => {
    if (!id) return;

    const unsubscribeRun = base44.entities.TestRun.subscribe((event) => {
      if (event.id !== id) return;
      qc.setQueryData(["test-run", id], event.type === "delete" ? null : event.data);
    });

    const unsubscribeResults = base44.entities.TestResult.subscribe((event) => {
      if (event.type === "delete" || event.data?.run_id === id) {
        qc.invalidateQueries({ queryKey: ["test-results", id] });
      }
    });

    return () => {
      unsubscribeRun();
      unsubscribeResults();
    };
  }, [id, qc]);

  useRunWorker(run);

  const cancelMut = useMutation({
    mutationFn: async () => {
      await base44.entities.TestRun.update(id, { status: "cancelled", ended_at: new Date().toISOString(), pending_count: 0 });
      const pending = results.filter((r) => r.status === "queued" || r.status === "running");
      await Promise.all(pending.map((r) => base44.entities.TestResult.update(r.id, { status: "error", error_message: "Cancelled" })));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-run", id] });
      qc.invalidateQueries({ queryKey: ["test-results", id] });
      toast.success("Run cancelled");
    },
  });

  const retestFailedMut = useMutation({
    mutationFn: async () => {
      const failed = results.filter((r) => r.status === "failed" || r.status === "error");
      await Promise.all(failed.map((r) => base44.entities.TestResult.update(r.id, { status: "queued", error_message: null, final_url: null, success_marker_found: null })));
      await base44.entities.TestRun.update(id, {
        status: "queued",
        pending_count: failed.length,
        failed_count: 0,
        error_count: 0,
        ended_at: null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-run", id] });
      qc.invalidateQueries({ queryKey: ["test-results", id] });
      toast.success("Re-queued failed credentials");
    },
  });

  const summary = React.useMemo(() => summarizeResults(results), [results]);
  const progress = React.useMemo(() => runProgress(run, summary), [run, summary]);
  const filtered = React.useMemo(
    () => tab === "all" ? results : results.filter((r) => tab === "queued" ? r.status === "queued" || r.status === "running" : r.status === tab),
    [tab, results]
  );

  if (runLoading) {
    return (
      <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
        <div className="rounded-xl border border-border bg-card/40 py-20 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!run || runError) {
    return (
      <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
        <Link to="/runs" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono uppercase tracking-wider mb-4">
          <ArrowLeft className="h-3 w-3" /> back to runs
        </Link>
        <div className="rounded-xl border border-dashed border-border bg-card/40 py-20 text-center">
          <div className="text-sm font-medium mb-1">Run not found</div>
          <div className="text-xs text-muted-foreground">It may have been deleted. <button onClick={() => navigate("/runs")} className="text-primary hover:underline">View all runs</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <Link to="/runs" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono uppercase tracking-wider mb-4">
        <ArrowLeft className="h-3 w-3" /> back to runs
      </Link>

      <PageHeader
        eyebrow={<span className="flex items-center gap-2"><SiteChip siteKey={run.site_key} label={siteLabel} size="sm" /> · run detail</span>}
        title={run.label || "Untitled run"}
        description={`${run.total_count} credentials · concurrency ${run.concurrency} · ${run.max_retries ?? 1} retry`}
        actions={
          <>
            <StatusPill status={run.status} />
            {(run.status === "running" || run.status === "queued") && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => cancelMut.mutate()}>
                <Square className="h-3.5 w-3.5" /> Cancel
              </Button>
            )}
            {(run.status === "completed" || run.status === "cancelled") && results.some((r) => r.status === "failed" || r.status === "error") && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => retestFailedMut.mutate()}>
                <Play className="h-3.5 w-3.5" /> Re-test failed
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Tile label="Progress" icon={Loader2} spin={run.status === "running" || run.status === "queued"} value={`${progress.percent}%`} sub={`${progress.done}/${progress.total}`} />
        <Tile label="Working" icon={CheckCircle2} accent="text-emerald-300" value={summary.working} />
        <Tile label="Failed" icon={XCircle} accent="text-rose-300" value={summary.failed} />
        <Tile label="Errored" icon={AlertTriangle} accent="text-amber-300" value={summary.error} />
        <Tile label="Elapsed" value={formatMs(run.elapsed_ms)} sub={run.status} />
      </div>

      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-6">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress.percent}%` }} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border mb-4">
          <TabsTrigger value="all">All <span className="ml-2 text-muted-foreground font-mono">{results.length}</span></TabsTrigger>
          <TabsTrigger value="working">Working <span className="ml-2 text-emerald-300 font-mono">{summary.working}</span></TabsTrigger>
          <TabsTrigger value="failed">Failed <span className="ml-2 text-rose-300 font-mono">{summary.failed}</span></TabsTrigger>
          <TabsTrigger value="error">Error <span className="ml-2 text-amber-300 font-mono">{summary.error}</span></TabsTrigger>
          <TabsTrigger value="queued">Pending <span className="ml-2 text-muted-foreground font-mono">{summary.pending}</span></TabsTrigger>
        </TabsList>
        <TabsContent value={tab}>
          <ResultsTable results={filtered} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Tile({ label, icon: Icon, accent, value, sub, spin }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
        {Icon && <Icon className={`h-3.5 w-3.5 ${accent || "text-muted-foreground"} ${spin ? "animate-spin" : ""}`} />}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${accent || ""}`}>{value}</div>
      {sub && <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}