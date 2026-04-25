import React from "react";
import { base44 } from "@/api/base44Client";

// Nudges runWorker while a run is active; the 5-minute scheduler is the durable worker.
// The local tab only accelerates visible runs without overloading Browserless.
export function useRunWorker(run, { intervalMs = 15000 } = {}) {
  const running = run?.status === "running" || run?.status === "queued";
  React.useEffect(() => {
    if (!run?.id || !running) return;
    let cancelled = false;
    let timer = null;

    const tick = async () => {
      if (cancelled) return;
      try {
        await base44.functions.invoke("runWorker", { run_id: run.id });
      } catch (_) { /* scheduler will retry */ }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };
    tick();

    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [run?.id, running, intervalMs]);
}