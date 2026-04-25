import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Camera, FileJson, ExternalLink, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import StatusPill from "@/components/shared/StatusPill";

export default function RunEvidencePanel({ runId }) {
  const qc = useQueryClient();
  const { data: screenshots = [] } = useQuery({
    queryKey: ["run-screenshots", runId],
    queryFn: () => base44.entities.Screenshot.filter({ run_id: runId }, "created_date", 5000),
    enabled: !!runId,
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["run-debug-reports", runId],
    queryFn: () => base44.entities.AutomationDebugReport.filter({ run_id: runId }, "-created_date", 1000),
    enabled: !!runId,
  });
  const { data: recordings = [] } = useQuery({
    queryKey: ["run-recordings", runId],
    queryFn: () => base44.entities.RunRecording.filter({ run_id: runId }, "-created_date", 1000),
    enabled: !!runId,
  });

  React.useEffect(() => {
    if (!runId) return;
    const upsert = (key, event) => {
      if (event.type === "delete") {
        qc.setQueryData(key, (current = []) => current.filter((item) => item.id !== event.id));
        return;
      }
      if (event.data?.run_id !== runId) return;
      qc.setQueryData(key, (current = []) => [event.data, ...current.filter((item) => item.id !== event.id)]);
    };
    const unsubScreens = base44.entities.Screenshot.subscribe((event) => upsert(["run-screenshots", runId], event));
    const unsubReports = base44.entities.AutomationDebugReport.subscribe((event) => upsert(["run-debug-reports", runId], event));
    const unsubRecordings = base44.entities.RunRecording.subscribe((event) => upsert(["run-recordings", runId], event));
    return () => { unsubScreens(); unsubReports(); unsubRecordings(); };
  }, [runId, qc]);

  return (
    <section className="rounded-2xl border border-border bg-card/80 shadow-sm overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-border/70 bg-secondary/20 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold"><Camera className="h-4 w-4 text-primary" /> Automation evidence</div>
          <p className="text-xs text-muted-foreground mt-1">Screenshots, WebSocket replays, WebM videos, and debug reports for this run.</p>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{screenshots.length} shots · {reports.length} reports · {recordings.length} recordings</div>
      </div>

      {screenshots.length === 0 && reports.length === 0 && recordings.length === 0 ? (
        <div className="px-5 py-10 text-sm text-muted-foreground text-center">Evidence will appear here as credentials are tested.</div>
      ) : (
        <div className="p-5 space-y-5">
          {recordings.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-secondary/20 divide-y divide-border/60 overflow-hidden">
              {recordings.map((recording) => (
                <div key={recording.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                      {recording.mode === "video" ? <PlayCircle className="h-3.5 w-3.5 text-primary" /> : <ExternalLink className="h-3.5 w-3.5 text-primary" />}
                      {recording.mode === "video" ? "WebM video" : "Browserless session replay"}
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate">{recording.username || "credential"} · {recording.note || recording.site}</div>
                    {recording.captured_at && <div className="text-[10px] font-mono text-muted-foreground mt-1">{format(new Date(recording.captured_at), "MMM d, HH:mm:ss")}</div>}
                  </div>
                  {recording.mode === "video" && recording.video_url ? (
                    <video controls preload="metadata" src={recording.video_url} className="w-full md:w-72 rounded-lg border border-border bg-background" />
                  ) : recording.mode === "video" ? (
                    <span className="text-xs text-amber-300">Video unavailable</span>
                  ) : (
                    <a href={recording.dashboard_url || "https://account.browserless.io/session-replay"} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Open Browserless dashboard</a>
                  )}
                </div>
              ))}
            </div>
          )}

          {screenshots.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {screenshots.map((shot) => (
                <a key={shot.id} href={shot.image_url} target="_blank" rel="noreferrer" className="group rounded-xl border border-border bg-secondary/20 overflow-hidden hover:border-primary/40 transition-colors">
                  <div className="aspect-video bg-background overflow-hidden">
                    <img src={shot.image_url} alt={shot.step_label || "Automation screenshot"} className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform" />
                  </div>
                  <div className="p-3 min-w-0">
                    <div className="text-xs font-medium truncate">{shot.step_label || "Screenshot"}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate">{shot.username || "credential"} · {shot.captured_at ? format(new Date(shot.captured_at), "HH:mm:ss") : "—"}</div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {reports.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-secondary/20 divide-y divide-border/60 overflow-hidden">
              {reports.map((report) => (
                <details key={report.id} className="group">
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3 hover:bg-secondary/30">
                    <div className="min-w-0 flex items-center gap-2">
                      <FileJson className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{report.username || "credential"}</div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate">{report.final_url || "No final URL"}</div>
                      </div>
                    </div>
                    <StatusPill status={report.status || "info"} />
                  </summary>
                  <pre className="max-h-80 overflow-auto thin-scroll p-4 text-[11px] bg-background/70 text-muted-foreground whitespace-pre-wrap">{report.report_json || "{}"}</pre>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}