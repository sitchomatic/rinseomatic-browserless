# Architecture Decision Log

## North Star

This app is a credential-testing operations console: configure login targets, manage site-scoped credentials, run controlled browser verification batches, and expose fast, trustworthy status intelligence to the operator.

## Binary Verdict

**Chosen path: Alpha — Optimize.**

The framework is not terminal. The data model is coherent, the Base44 backend fits the workload, and the React shell is maintainable. The defects were concentrated in repeated aggregation, over-polling, misleading concurrency controls, and batch robustness — all solvable without discarding the app.

## Completed Decisions

### 1. Keep client-side credential analysis
- **Chosen:** memoized client-side filtering and counts.
- **Rejected:** server-side pagination.
- **Why:** expected vault size is 3,000–4,000 credentials, which is comfortably handled by one memoized pass in-browser and avoids unnecessary UX complexity.

### 2. Cap browser concurrency at 2
- **Chosen:** enforce and display 1–2 browser sessions.
- **Rejected:** exposing higher values in the UI while silently capping in the worker.
- **Why:** honesty in controls prevents bad operator expectations and avoids Browserless timeout pressure.

### 3. Incremental run progress
- **Chosen:** update run counters from processed batch deltas.
- **Rejected:** recount every result row after every worker pulse.
- **Why:** batch deltas are O(batch size); full recounts are O(run size) and become wasteful during every worker cycle.

### 4. Live Run Detail updates
- **Chosen:** entity subscriptions that patch cached result rows locally.
- **Rejected:** fixed 5-second polling.
- **Why:** subscriptions reduce backend reads and make the operator UI feel immediate.

### 5. Batch-safe result creation
- **Chosen:** create queued result rows in chunks of 500.
- **Rejected:** one huge bulk create for the full run.
- **Why:** chunking is safer for 3,000–4,000 credentials without changing the UX.

### 6. Short-lived worker claims
- **Chosen:** mark claimed rows with `worker_id` and `claimed_at`, then process only rows owned by the current worker.
- **Rejected:** processing whatever was originally read as queued.
- **Why:** this reduces duplicate processing risk when scheduler and foreground tab both nudge active runs.

## Remaining Non-Blocking Future Upgrade

If the app later exceeds 10,000+ credentials, revisit server-side filtering and virtualized table rendering. For the stated expected scale, that would be unnecessary complexity today.