import React from "react";
import { Button } from "@/components/ui/button";
import { Download, FileJson } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ExportRunResultsButton({ run, results }) {
  const exportCsv = () => {
    const headers = ["username", "status", "attempts", "final_url", "error_message", "elapsed_ms", "tested_at"];
    const rows = results.map((result) => headers.map((key) => csvCell(result[key])).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${run?.label || run?.site_key || "run"}-results.csv`.replace(/[^a-z0-9._-]+/gi, "-");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportDebugJson = async () => {
    try {
      const reports = await base44.entities.AutomationDebugReport.filter({ run_id: run?.id });
      const screenshots = await base44.entities.Screenshot.filter({ run_id: run?.id });
      
      const exportData = {
        run: run,
        results: results,
        debug_reports: reports,
        screenshots: screenshots.map(s => ({ id: s.id, step_label: s.step_label, image_url: s.image_url, result_id: s.result_id }))
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${run?.label || run?.site_key || "run"}-debug-log.json`.replace(/[^a-z0-9._-]+/gi, "-");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv} disabled={!results?.length}>
        <Download className="h-3.5 w-3.5" /> Export CSV
      </Button>
      <Button variant="outline" size="sm" className="gap-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400" onClick={exportDebugJson} disabled={!results?.length}>
        <FileJson className="h-3.5 w-3.5" /> Export Debug JSON
      </Button>
    </div>
  );
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}