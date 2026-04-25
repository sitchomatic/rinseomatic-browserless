export function buildDashboardMetrics(sites = [], runs = []) {
  const latestCompletedBySite = new Map();

  for (const run of runs) {
    if (run.status !== "completed" || !run.site_key) continue;
    if (!latestCompletedBySite.has(run.site_key)) {
      latestCompletedBySite.set(run.site_key, run);
    }
  }

  const siteStats = [];
  const totals = { working: 0, failed: 0, tested: 0 };

  for (const site of sites) {
    const lastRun = latestCompletedBySite.get(site.key) || null;
    const working = lastRun?.working_count || 0;
    const failed = (lastRun?.failed_count || 0) + (lastRun?.error_count || 0);

    totals.working += working;
    totals.failed += failed;
    totals.tested += working + failed;
    siteStats.push({ site, lastRun, working, failed });
  }

  return { siteStats, totals };
}