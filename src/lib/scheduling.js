// Helpers for computing schedule "next run" times from a Schedule entity.
export function computeNextRun(schedule, fromDate = new Date()) {
  if (!schedule || schedule.enabled === false) return null;

  if (schedule.mode === "simple") {
    const val = Number(schedule.interval_value) || 1;
    const unitMs = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    }[schedule.interval_unit || "hours"];
    return new Date(fromDate.getTime() + val * unitMs).toISOString();
  }

  // Cron mode — we don't evaluate cron here (server would), just display as-is.
  return null;
}

export function describeSchedule(s) {
  if (!s) return "—";
  if (s.mode === "cron") return s.cron_expression || "cron";
  const val = s.interval_value || 1;
  const unit = s.interval_unit || "hours";
  return `Every ${val} ${val === 1 ? unit.replace(/s$/, "") : unit}`;
}