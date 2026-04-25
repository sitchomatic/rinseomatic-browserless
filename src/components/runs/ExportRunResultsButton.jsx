import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv} disabled={!results?.length}>
      <Download className="h-3.5 w-3.5" /> Export CSV
    </Button>
  );
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}