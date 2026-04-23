import React from "react";
import { base44 } from "@/api/base44Client";

// Polls runWorker while a run is active. Multiple tabs are safe: the backend
// claims batches atomically via status transitions.
export function useRunWorker(run, { intervalMs = 2000 } = {}) {
  const running = run?.status === "running" || run?.status === "queued";
  React.useEffect(() => {
    if (!run?.id || !running) return;
    let cancelled = false;
    let timer = null;

    const tick = async () => {
      if (cancelled) return;
      try {
        await base44.functions.invoke("runWorker", { run_id: run.id });
      } catch (_) { /* swallow — next tick retries */ }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };
    tick();

    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [run?.id, running, intervalMs]);
}