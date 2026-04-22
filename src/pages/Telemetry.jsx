import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LiveLogStream from "@/components/dashboard/LiveLogStream";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CATEGORIES = ["all", "network", "dom", "auth", "proxy", "ai", "system"];

function exportLogs(logs) {
  const rows = [
    ["timestamp", "level", "category", "site", "delta_ms", "message"],
    ...logs.map((l) => [
      l.timestamp || l.created_date || "",
      l.level || "",
      l.category || "",
      l.site || "",
      l.delta_ms ?? 0,
      (l.message || "").replace(/"/g, '""'),
    ]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `telemetry-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Telemetry() {
  const [category, setCategory] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const { data: logs = [] } = useQuery({
    queryKey: ["action-logs"],
    queryFn: () => base44.entities.ActionLog.list("-created_date", 300),
    refetchInterval: 2500,
  });

  const filtered = logs.filter((l) => {
    if (category !== "all" && l.category !== category) return false;
    if (search && !l.message?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const levelCounts = logs.reduce((acc, l) => {
    acc[l.level || "info"] = (acc[l.level || "info"] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto">
      <PageHeader
        eyebrow="04 · telemetry"
        title="Live action stream"
        description="Delta-timestamped action events across all sessions with ms-level gap tracking."
        actions={
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportLogs(filtered)} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        }
      />

      {/* Level counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {["info", "success", "warn", "error", "debug"].map((lvl) => (
          <div key={lvl} className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{lvl}</div>
            <div className="text-xl font-semibold tabular-nums mt-1">{levelCounts[lvl] || 0}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="bg-card border border-border overflow-x-auto">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c} value={c} className="text-xs font-mono uppercase tracking-wider">{c}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-md md:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="pl-9 font-mono h-9 text-xs"
          />
        </div>
      </div>

      <LiveLogStream logs={filtered} height="h-[600px]" />
    </div>
  );
}