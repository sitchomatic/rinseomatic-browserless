import React from "react";
import { CheckCircle2, AlertTriangle, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MaintenanceStatusBadge({ hasRun, passRate }) {
  const state = !hasRun
    ? { label: "Pending", icon: Clock, className: "bg-muted text-muted-foreground border-border" }
    : passRate >= 80
      ? { label: "Healthy", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/25" }
      : passRate >= 40
        ? { label: "Monitor", icon: AlertTriangle, className: "bg-amber-500/10 text-amber-300 border-amber-500/25" }
        : { label: "Critical", icon: XCircle, className: "bg-rose-500/10 text-rose-300 border-rose-500/25" };

  const Icon = state.icon;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider", state.className)}>
      <Icon className="h-3.5 w-3.5" />
      {state.label}
    </span>
  );
}