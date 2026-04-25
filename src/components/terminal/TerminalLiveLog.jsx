import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Activity, Terminal, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const LEVEL_COLOR = {
  success: "text-emerald-300",
  error: "text-rose-300",
  warn: "text-amber-300",
  debug: "text-slate-400",
  info: "text-sky-300",
};

export default function TerminalLiveLog({ compact = false, className }) {
  const qc = useQueryClient();
  const limit = compact ? 40 : 160;
  const { data: logs = [] } = useQuery({
    queryKey: ["terminal-live-log", limit],
    queryFn: () => base44.entities.ActionLog.list("-created_date", limit),
    refetchInterval: 5000,
  });

  React.useEffect(() => {
    const unsubscribe = base44.entities.ActionLog.subscribe((event) => {
      if (event.type === "delete") {
        qc.setQueryData(["terminal-live-log", limit], (current = []) => current.filter((log) => log.id !== event.id));
        return;
      }
      qc.setQueryData(["terminal-live-log", limit], (current = []) => [event.data, ...current.filter((log) => log.id !== event.id)].slice(0, limit));
    });
    return unsubscribe;
  }, [qc, limit]);

  const orderedLogs = React.useMemo(() => [...logs].reverse(), [logs]);

  return (
    <section className={cn("rounded-2xl border border-border bg-black/90 shadow-2xl overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="h-4 w-4 text-emerald-300" />
          <div>
            <div className="text-sm font-semibold text-emerald-100 flex items-center gap-2">
              Live terminal
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-emerald-200">
                <Activity className="h-3 w-3" /> live
              </span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300/70">requests ↔ responses · CMD steps · sanitized</div>
          </div>
        </div>
        {!compact && (
          <Button variant="ghost" size="sm" className="gap-2 text-emerald-200 hover:text-emerald-100 hover:bg-emerald-500/10" onClick={() => qc.setQueryData(["terminal-live-log", limit], [])}>
            <Trash2 className="h-3.5 w-3.5" /> Clear view
          </Button>
        )}
      </div>
      <div className={cn("thin-scroll overflow-y-auto font-mono text-xs", compact ? "max-h-72" : "h-[640px]")}> 
        {orderedLogs.length === 0 ? (
          <div className="p-5 text-emerald-300/60">$ waiting for live traffic...</div>
        ) : orderedLogs.map((log) => <TerminalLine key={log.id} log={log} />)}
      </div>
    </section>
  );
}

function TerminalLine({ log }) {
  const ts = format(new Date(log.timestamp || log.created_date), "HH:mm:ss.SSS");
  const direction = getDirection(log.message);
  return (
    <div className="grid grid-cols-[94px_26px_74px_1fr] gap-2 px-4 py-2 border-b border-emerald-500/10 hover:bg-emerald-500/5">
      <span className="text-emerald-500/70">{ts}</span>
      <span className={cn("font-bold", direction.color)}>{direction.symbol}</span>
      <span className={cn("uppercase", LEVEL_COLOR[log.level] || LEVEL_COLOR.info)}>{log.level || "info"}</span>
      <span className="min-w-0 break-words text-emerald-100/90">
        <span className="text-emerald-400/70">[{log.category || "system"}{log.site ? `:${log.site}` : ""}]</span> {log.message}
      </span>
    </div>
  );
}

function getDirection(message = "") {
  if (message.startsWith("HTTP →") || message.startsWith("XHR →")) return { symbol: "→", color: "text-sky-300" };
  if (message.startsWith("HTTP ←") || message.startsWith("XHR ←")) return { symbol: "←", color: "text-emerald-300" };
  if (message.startsWith("HTTP ×") || message.startsWith("XHR ×")) return { symbol: "×", color: "text-rose-300" };
  if (message.startsWith("CMD ")) return { symbol: "❯", color: "text-amber-300" };
  return { symbol: "$", color: "text-amber-300" };
}