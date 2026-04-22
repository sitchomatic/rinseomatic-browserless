// Build per-step execution profiles from ActionLog + RunSession history.
// Matching strategy: logs are associated to a step when the message contains
// the step's selector or value. We aggregate avg delta_ms, error frequency,
// and derive a failure probability per step across recent sessions.

const norm = (s) => (s || "").toLowerCase();

function stepKey(step, index) {
  return step?.id || `idx-${index}`;
}

function stepTokens(step) {
  const tokens = [];
  if (step?.selector) tokens.push(norm(step.selector));
  if (step?.value) tokens.push(norm(step.value));
  // For navigate/wait/screenshot where selector is empty, fall back to type-only match
  return tokens.filter(Boolean);
}

function matchesStep(log, tokens, stepType) {
  const msg = norm(log.message);
  if (!msg) return false;
  if (tokens.length > 0) {
    return tokens.some((t) => t && msg.includes(t));
  }
  // No tokens to match on — fall back to type keyword
  return stepType ? msg.includes(norm(stepType)) : false;
}

export function computeStepProfiles({ steps = [], logs = [], sessions = [], flowName, site }) {
  // Filter logs to the flow's site where known to reduce noise
  const relevantLogs = logs.filter((l) => !site || !l.site || l.site === site);

  // Session counts — used for failure probability baseline
  const flowSessions = sessions.filter((s) =>
    (!flowName || s.flow_name === flowName) && (!site || s.site === site)
  );
  const totalSessions = flowSessions.length || 0;
  const failedSessions = flowSessions.filter((s) => s.status === "failed").length;
  const baselineFailure = totalSessions > 0 ? failedSessions / totalSessions : 0;

  const profiles = {};

  steps.forEach((step, i) => {
    const key = stepKey(step, i);
    const tokens = stepTokens(step);
    const matched = relevantLogs.filter((l) => matchesStep(l, tokens, step.type));

    const durations = matched
      .map((l) => Number(l.delta_ms) || 0)
      .filter((v) => v > 0);
    const errors = matched.filter((l) => l.level === "error").length;
    const warnings = matched.filter((l) => l.level === "warn").length;
    const total = matched.length;

    const avgMs = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;
    const maxMs = durations.length ? Math.max(...durations) : null;

    // Failure probability: blend observed step-level error rate with flow failure baseline
    // (so first-time steps still get a sensible estimate).
    let failureProb = 0;
    if (total > 0) {
      const stepErrRate = errors / total;
      failureProb = stepErrRate * 0.75 + baselineFailure * 0.25;
    } else {
      failureProb = baselineFailure;
    }
    failureProb = Math.max(0, Math.min(1, failureProb));

    profiles[key] = {
      samples: total,
      avgMs,
      maxMs,
      errors,
      warnings,
      failureProb,
      hasData: total > 0,
    };
  });

  return {
    profiles,
    meta: {
      totalSessions,
      failedSessions,
      baselineFailure,
      logsConsidered: relevantLogs.length,
    },
  };
}

export function profileSeverity(p) {
  if (!p) return "idle";
  if (p.failureProb >= 0.4 || p.errors >= 5) return "failed";
  if (p.failureProb >= 0.15 || p.errors >= 1 || p.warnings >= 3) return "warning";
  if (p.hasData) return "success";
  return "idle";
}