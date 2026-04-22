import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, CalendarClock, CheckCircle2, Zap, Clock } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import SchedulesTable from "@/components/scheduling/SchedulesTable";
import ScheduleHistory from "@/components/scheduling/ScheduleHistory";
import ScheduleDialog from "@/components/scheduling/ScheduleDialog";
import { computeNextRun } from "@/lib/scheduling";
import { cn } from "@/lib/utils";

export default function Scheduling() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => base44.entities.Schedule.list("-created_date", 100),
  });
  const { data: flows = [] } = useQuery({
    queryKey: ["flows"],
    queryFn: () => base44.entities.Flow.list("-updated_date", 200),
  });
  const { data: proxies = [] } = useQuery({
    queryKey: ["proxies"],
    queryFn: () => base44.entities.Proxy.list("-created_date", 200),
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["run-sessions-history"],
    queryFn: () => base44.entities.RunSession.list("-created_date", 50),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Schedule.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Schedule created");
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Schedule.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Schedule.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Schedule deleted");
    },
  });

  const runNowMut = useMutation({
    mutationFn: async (s) => {
      const now = new Date().toISOString();
      const session = await base44.entities.RunSession.create({
        site: s.site,
        flow_name: s.flow_name,
        status: "queued",
        started_at: now,
        proxy_used: s.proxy_group,
      });
      await base44.entities.Schedule.update(s.id, {
        last_run_at: now,
        last_run_status: "running",
        run_count: (s.run_count || 0) + 1,
        next_run_at: computeNextRun(s),
      });
      return session;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      qc.invalidateQueries({ queryKey: ["run-sessions-history"] });
      qc.invalidateQueries({ queryKey: ["run-sessions"] });
      toast.success("Run queued");
    },
  });

  const active = schedules.filter((s) => s.enabled).length;
  const paused = schedules.length - active;
  const nextRun = schedules
    .filter((s) => s.enabled && s.next_run_at)
    .sort((a, b) => new Date(a.next_run_at) - new Date(b.next_run_at))[0];

  const scheduledFlowNames = new Set(schedules.map((s) => s.flow_name).filter(Boolean));
  const pastScheduledSessions = sessions.filter((s) => scheduledFlowNames.has(s.flow_name));

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto">
      <PageHeader
        eyebrow="09 · scheduling"
        title="Recurring runs"
        description="Automate flows on simple intervals or cron expressions."
        actions={
          <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New schedule
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Metric label="Active" value={active} icon={Zap} accent="text-emerald-300" />
        <Metric label="Paused" value={paused} icon={CalendarClock} accent="text-muted-foreground" />
        <Metric label="Total runs" value={schedules.reduce((a, s) => a + (s.run_count || 0), 0)} icon={CheckCircle2} accent="text-sky-300" />
        <Metric
          label="Next run"
          value={nextRun ? new Date(nextRun.next_run_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
          sub={nextRun?.name}
          icon={Clock}
          accent="text-amber-300"
        />
      </div>

      <div className="mb-8">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-3">Upcoming</div>
        <SchedulesTable
          items={schedules}
          onToggle={(s, enabled) => updateMut.mutate({
            id: s.id,
            data: { enabled, next_run_at: enabled ? computeNextRun({ ...s, enabled: true }) : null },
          })}
          onRunNow={(s) => runNowMut.mutate(s)}
          onDelete={(s) => deleteMut.mutate(s.id)}
        />
      </div>

      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-3">History</div>
        <ScheduleHistory sessions={pastScheduledSessions} />
      </div>

      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        flows={flows}
        proxies={proxies}
        onSubmit={(data) => createMut.mutate(data)}
      />
    </div>
  );
}

function Metric({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
      <div className={cn("h-8 w-8 rounded-md bg-secondary border border-border flex items-center justify-center", accent)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums truncate">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground font-mono truncate">{sub}</div>}
      </div>
    </div>
  );
}