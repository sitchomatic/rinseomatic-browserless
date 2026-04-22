import React from "react";
import { cn } from "@/lib/utils";
import Sparkline from "../shared/Sparkline";

export default function StatCard({ label, value, sub, trend, icon: Icon, accent = "text-primary", className }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">{label}</div>
          <div className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
          {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
        {Icon && (
          <div className={cn("h-9 w-9 rounded-lg bg-secondary/60 border border-border flex items-center justify-center", accent)}>
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
        )}
      </div>

      {trend && trend.length > 1 && (
        <div className={cn("mt-4 -mb-1", accent)}>
          <Sparkline data={trend} height={28} />
        </div>
      )}
    </div>
  );
}