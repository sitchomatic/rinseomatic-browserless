import React from "react";
import PageHeader from "@/components/shared/PageHeader";
import TerminalLiveLog from "@/components/terminal/TerminalLiveLog";
import TerminalTraceStatus from "@/components/terminal/TerminalTraceStatus";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function Terminal() {
  const handleExport = async () => {
    try {
      const logs = await base44.entities.ActionLog.list("-created_date", 5000);
      if (!logs.length) return toast.info("No terminal logs to export");
      const header = "Timestamp,Level,Category,Message,Session,Site,Delta_MS\n";
      const csv = logs.map(l => `"${l.timestamp || l.created_date}","${l.level}","${l.category}","${(l.message || '').replace(/"/g, '""')}","${l.session_id}","${l.site}","${l.delta_ms}"`).join("\n");
      const blob = new Blob([header + csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terminal_logs_${new Date().toISOString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${logs.length} logs`);
    } catch (e) {
      toast.error("Export failed");
    }
  };

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="99 · live stream"
        title="Terminal"
        description="A terminal-style live stream of app activity, outgoing requests, and incoming responses with sensitive values redacted."
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-3.5 w-3.5" /> Export Logs
          </Button>
        }
      />
      <TerminalTraceStatus />
      <TerminalLiveLog />
    </div>
  );
}