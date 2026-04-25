export function summarizeResults(results = []) {
  return results.reduce((summary, result) => {
    const status = result.status || "queued";
    summary.total += 1;
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;

    if (status === "queued" || status === "running") summary.pending += 1;
    if (status === "working") summary.working += 1;
    if (status === "failed") summary.failed += 1;
    if (status === "error") summary.error += 1;

    return summary;
  }, {
    total: 0,
    pending: 0,
    working: 0,
    failed: 0,
    error: 0,
    byStatus: {},
  });
}

export function runProgress(run, results = []) {
  const total = run?.total_count || results.length || 0;
  const pending = typeof run?.pending_count === "number"
    ? run.pending_count
    : summarizeResults(results).pending;
  const done = Math.max(0, total - pending);
  const percent = total ? Math.round((done / total) * 100) : 0;

  return { total, pending, done, percent };
}

export function latestCompletedRunBySite(runs = []) {
  const latest = new Map();

  for (const run of runs) {
    if (run.status !== "completed") continue;
    if (!latest.has(run.site_key)) latest.set(run.site_key, run);
  }

  return latest;
}

export function mapByKey(items = [], key = "key") {
  return new Map(items.map((item) => [item[key], item]));
}