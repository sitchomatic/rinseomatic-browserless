import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Play, Pause, CheckCircle2, Clock, Gauge, KeyRound, Cpu } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import RunProgress from "@/components/dashboard/RunProgress";
import LiveLogStream from "@/components/dashboard/LiveLogStream";
import SiteBreakdown from "@/components/dashboard/SiteBreakdown";
import StatusPill from "@/components/shared/StatusPill";
import SiteChip from "@/components/shared/SiteChip";
import { formatMs } from "@/lib/sites";
import { format } from "date-fns";

export default function CommandCenter() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: sessions = [] } = useQuery({
    queryKey: ["run-sessions"],
    queryFn: () => base44.entities.RunSession.list("-created_date", 20),
    refetchInterval: 4000,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["action-logs-recent"],
    queryFn: () => base44.entities.ActionLog.list("-created_date", 40),
    refetchInterval: 3000,
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ["credentials-summary"],
    queryFn: () => base44.entities.Credential.list("-created_date", 500),
  });

  const activeSession = sessions.find((s) => s.status === "running") || sessions[0];
  const working = credentials.filter((c) => c.status === "working").length;
  const failed = credentials.filter((c) => c.status === "failed").length;
  const burned = credentials.filter((c) => c.status === "burned").length;
  const successRate = credentials.length
    ? Math.round((working / credentials.length) * 100)
    : 0;

  const avgElapsed = sessions.length
    ? sessions.reduce((a, s) => a + (s.elapsed_ms || 0), 0) / sessions.length
    : 0;

  const pauseAllMut = useMutation({
    mutationFn: async () => {
      const running = sessions.filter((s) => s.status === "running");
      await Promise.all(
        running.map((s) =>
          base44.entities.RunSession.update(s.id, { status: "cancelled", ended_at: new Date().toISOString() })
        )
      );
      return running.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["run-sessions"] });
      toast.success(count ? `Paused ${count} session${count === 1 ? "" : "s"}` : "No running sessions");
    },
  });

  // Build site breakdown counts
  const siteCounts = credentials.reduce((acc, c) => {
    if (!acc[c.site]) acc[c.site] = { working: 0, failed: 0 };
    if (c.status === "working") acc[c.site].working++;
    if (c.status === "failed" || c.status === "burned") acc[c.site].failed++;
    return acc;
  }, {});

  // Sparkline trend — derived from sessions
  const trend = sessions
    .slice(0, 12)
    .reverse()
    .map((s) => s.working_count || 0);

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto">
      <PageHeader
        eyebrow="01 · command center"
        title="Operational overview"
        description="Live credential verification & automated login runs across all sites."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => pauseAllMut.mutate()}
              disabled={pauseAllMut.isPending}
            >
              <Pause className="h-3.5 w-3.5" /> Pause all
            </Button>
            <Button size="sm" className="gap-2" onClick={() => navigate("/flows")}>
              <Play className="h-3.5 w-3.5" /> New run
            </Button>
          </>
        }
      />

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Success rate"
          value={`${successRate}%`}
          sub={`${working} working of ${credentials.length}`}
          icon={Gauge}
          accent="text-emerald-300"
          trend={trend}
        />
        <StatCard
          label="Working credentials"
          value={working.toLocaleString()}
          sub={`${burned} burned · ${failed} failed`}
          icon={CheckCircle2}
          accent="text-emerald-300"
        />
        <StatCard
          label="Active sessions"
          value={sessions.filter((s) => s.status === "running").length}
          sub={`${sessions.length} total in history`}
          icon={Cpu}
          accent="text-sky-300"
        />
        <StatCard
          label="Avg elapsed"
          value={formatMs(avgElapsed)}
          sub="per session"
          icon={Clock}
          accent="text-amber-300"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 space-y-4">
          {activeSession ? (
            <RunProgress session={activeSession} />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center">
              <div className="text-sm text-muted-foreground">No active session. Start a new run to see live progress.</div>
            </div>
          )}
          <LiveLogStream logs={logs} height="h-96" />
        </div>

        <div className="space-y-4">
          <SiteBreakdown counts={siteCounts} />

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Recent sessions</h3>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {sessions.length}
              </span>
            </div>
            <div className="space-y-2.5 max-h-80 overflow-y-auto thin-scroll pr-1">
              {sessions.length === 0 && (
                <div className="text-xs text-muted-foreground py-4 text-center">No sessions yet</div>
              )}
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <SiteChip site={s.site} size="sm" />
                      <span className="text-xs text-muted-foreground font-mono">
                        {s.started_at ? format(new Date(s.started_at), "HH:mm") : "—"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.working_count}/{s.total_count} · {formatMs(s.elapsed_ms)}
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer banner */}
      <div className="rounded-xl border border-border bg-card/60 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> tunnel healthy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> ai repair ready
          </span>
          <span className="flex items-center gap-1.5">
            <KeyRound className="h-3 w-3" /> keychain unlocked
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
          v2.0 · mvvm · dual-site worker
        </span>
      </div>
    </div>
  );
}