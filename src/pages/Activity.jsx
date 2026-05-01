import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusPill from "@/components/shared/StatusPill";
import { format } from "date-fns";
import { Activity as ActivityIcon, Code2, Server, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Activity() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 500),
    refetchInterval: 5000,
  });

  const handleExport = () => {
    if (!logs.length) return;
    const header = "Date,Function,Status,Run ID,Metadata\n";
    const csv = logs.map(l => `"${format(new Date(l.created_date), "yyyy-MM-dd HH:mm:ss")}","${l.function_name}","${l.status}","${l.run_id || ''}","${(l.metadata || '').replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_logs_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="05 · Monitoring"
        title="Activity Log"
        description="History of all Cloud Function executions and automation runs."
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2" disabled={logs.length === 0}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 bg-secondary/20 flex items-center gap-2">
          <ActivityIcon className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Execution History</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading activity...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No activity logs recorded yet.</div>
        ) : (
          <div className="divide-y divide-border/50 max-h-[800px] overflow-y-auto thin-scroll">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-secondary/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-md bg-secondary/50 border border-border">
                      <Code2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-foreground">
                          {log.function_name}
                        </span>
                        <StatusPill status={log.status} />
                        {log.run_id && log.run_id !== "manual" && (
                          <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground border border-border">
                            run: {log.run_id.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground max-w-3xl whitespace-pre-wrap font-mono break-words bg-secondary/10 p-2 rounded-md mt-2 border border-border/30">
                        {log.metadata || "No metadata provided"}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground whitespace-nowrap text-right flex flex-col items-end gap-1">
                    <span>{format(new Date(log.created_date), "MMM d, HH:mm:ss")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}