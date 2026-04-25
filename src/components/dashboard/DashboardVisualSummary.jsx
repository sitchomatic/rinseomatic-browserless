import React from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, Cell, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, CheckCircle2 } from "lucide-react";

const COLORS = ["hsl(var(--success))", "hsl(var(--destructive))"];

export default function DashboardVisualSummary({ totals, siteStats, activeRuns }) {
  const successRate = totals.tested ? Math.round((totals.working / totals.tested) * 100) : 0;
  const pieData = [
    { name: "Working", value: totals.working || 0 },
    { name: "Failed", value: totals.failed || 0 },
  ];
  const barData = siteStats
    .filter(({ lastRun }) => lastRun?.total_count)
    .slice(0, 8)
    .map(({ site, lastRun }) => ({
      name: site.label,
      success: Math.round(((lastRun.working_count || 0) / (lastRun.total_count || 1)) * 100),
    }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold">Success rate</div>
            <div className="text-xs text-muted-foreground mt-1">Across latest completed runs</div>
          </div>
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        </div>
        <div className="h-48 relative">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <PieChart>
              <Pie data={pieData} innerRadius={62} outerRadius={82} paddingAngle={4} dataKey="value" animationDuration={700}>
                {pieData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-3xl font-semibold tabular-nums">{successRate}%</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">working</div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold">Active test runs</div>
            <div className="text-xs text-muted-foreground mt-1">Live queue activity and per-site success rates</div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-mono text-primary">
            <Activity className="h-3.5 w-3.5" /> {activeRuns.length} active
          </div>
        </div>
        <div className="grid lg:grid-cols-[1fr_260px] gap-5">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={barData} margin={{ left: -24, right: 8, top: 8, bottom: 0 }}>
                <XAxis dataKey="name" hide />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="success" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/25 divide-y divide-border/60 overflow-hidden">
            {activeRuns.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">No active runs right now.</div>
            ) : activeRuns.slice(0, 5).map((run) => (
              <motion.div key={run.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3">
                <div className="text-xs font-medium truncate">{run.label || run.site_key}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-1">{run.pending_count || 0} pending · {run.working_count || 0} working</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}