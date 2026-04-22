import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Columns2, Columns3, Rows3, Images, Copy } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import SiteChip from "@/components/shared/SiteChip";
import { cn } from "@/lib/utils";

const DENSITIES = [
  { key: "large", icon: Rows3, cols: "grid-cols-1 md:grid-cols-2" },
  { key: "medium", icon: Columns2, cols: "grid-cols-2 md:grid-cols-3" },
  { key: "dense", icon: Columns3, cols: "grid-cols-3 md:grid-cols-5" },
];

export default function Screenshots() {
  const [density, setDensity] = React.useState("medium");
  const { data: shots = [] } = useQuery({
    queryKey: ["screenshots"],
    queryFn: () => base44.entities.Screenshot.list("-created_date", 200),
  });

  const dedupSaved = shots.filter((s) => s.is_duplicate).length;
  const gridCols = DENSITIES.find((d) => d.key === density)?.cols;

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto">
      <PageHeader
        eyebrow="05 · screenshots"
        title="Visual lab"
        description="Captured screenshots with hash-based dedup and retention sweeps."
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            {DENSITIES.map((d) => (
              <button
                key={d.key}
                onClick={() => setDensity(d.key)}
                className={cn(
                  "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                  density === d.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <d.icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Total" value={shots.length} icon={Images} />
        <StatTile label="Duplicate saves" value={dedupSaved} icon={Copy} accent="text-amber-300" />
        <StatTile label="Retained" value={shots.length - dedupSaved} icon={Images} accent="text-emerald-300" />
        <StatTile label="Cleanup state" value="nominal" icon={Images} accent="text-sky-300" />
      </div>

      {shots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 py-20 text-center">
          <Images className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">No screenshots captured yet.</div>
        </div>
      ) : (
        <div className={cn("grid gap-3", gridCols)}>
          {shots.map((s) => (
            <div key={s.id} className="group relative rounded-lg overflow-hidden border border-border bg-card">
              <div className="aspect-video bg-secondary/50 relative overflow-hidden">
                {s.image_url ? (
                  <img src={s.image_url} alt={s.step_label || "screenshot"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-grid opacity-40" />
                )}
                {s.is_duplicate && (
                  <div className="absolute top-2 left-2 text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    dup · skipped
                  </div>
                )}
              </div>
              <div className="p-2.5 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{s.step_label || "capture"}</div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">
                    {s.captured_at ? format(new Date(s.captured_at), "MMM d · HH:mm:ss") : ""}
                  </div>
                </div>
                <SiteChip site={s.site} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, icon: Icon, accent = "text-primary" }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
      <div className={cn("h-8 w-8 rounded-md bg-secondary border border-border flex items-center justify-center", accent)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}