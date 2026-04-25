import React from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PlayCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function SchedulerControlPanel() {
  const [result, setResult] = React.useState(null);

  const runMut = useMutation({
    mutationFn: () => base44.functions.invoke("runScheduler", {}),
    onSuccess: (response) => {
      setResult(response.data);
      toast.success(response.data?.processed ? `Scheduler processed ${response.data.processed} run(s)` : "Scheduler checked: no active runs");
    },
    onError: (error) => toast.error(error?.response?.data?.error || error.message || "Scheduler failed"),
  });

  return (
    <section className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold"><PlayCircle className="h-4 w-4 text-primary" /> Scheduler controls</div>
          <p className="text-xs text-muted-foreground mt-1">Manually trigger the background scheduler to advance queued or running credential tests.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => runMut.mutate()} disabled={runMut.isPending}>
          <RefreshCw className={`h-3.5 w-3.5 ${runMut.isPending ? "animate-spin" : ""}`} /> Run scheduler now
        </Button>
      </div>
      {result && (
        <div className="rounded-xl border border-border/70 bg-secondary/25 p-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Last manual run</div>
          <pre className="thin-scroll max-h-48 overflow-auto text-xs font-mono text-muted-foreground whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}