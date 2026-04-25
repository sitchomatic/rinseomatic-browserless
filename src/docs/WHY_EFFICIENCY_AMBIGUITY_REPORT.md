# Why, Efficiency, Implementation, and Ambiguity Report

## Step 1 — The Why Analysis

The application’s ultimate goal is to be an operational credential-testing console: configure target login sites, store credentials per site, queue browser-based verification runs, process those runs through Browserless, and surface results in a way that helps users decide which credentials, selectors, site settings, and proxy behavior need attention.

### Contradictions found
1. **UI concurrency vs worker concurrency**
   - The run dialog advertised 1–5 parallel browser sessions, but the backend worker safely caps execution at 2.
   - Resolution implemented: the UI now reflects the real backend cap of 2, removing misleading controls.

2. **Duplicated run state**
   - `TestRun` stores rollup counts, while `TestResult` rows are also the source of truth.
   - Current resolution: keep rollups for speed, but isolate counting logic so future atomic transitions are easier.

3. **Selected credentials vs selected site**
   - Selected credentials should dominate the run plan, but the dialog still exposes site selection.
   - Current resolution: selected credentials remain constrained to one site; the count disables invalid site choices.

## Step 2 — Efficiency Audit

### High-impact smells addressed
- Repeated credential scans were replaced with `analyzeCredentials`.
- Dashboard aggregation was centralized into `buildDashboardMetrics`.
- Run progress no longer re-summarizes results when a summary is already available.
- Worker no longer re-fetches credential data during result mirroring.
- Run dialog now uses shared run-planning utilities instead of duplicated clamp/count logic.

### Remaining scale bottlenecks
- Loading 2,000 credentials is fine short-term, but not optimal for 10k+ vaults.
- Worker status-based claiming is simple, but a lease/claim-token model would be safer at higher concurrency.
- Bulk run creation still creates all `TestResult` records at once; chunking would be safer for very large runs.

## Step 3 — Implementation Summary

Implemented core logic rewrites:
- `lib/credentialMetrics.js`: single-pass vault analysis.
- `lib/dashboardMetrics.js`: single-pass dashboard rollups.
- `lib/runPlanning.js`: shared run limits, normalization, and counting.
- `functions/runWorker`: reduced duplicate entity reads and replaced repeated full-result recounting with incremental run progress updates.
- `pages/RunDetail`: summary-driven progress and filtering.
- `pages/Dashboard`: centralized dashboard model.
- `components/runs/NewRunDialog`: aligned UI with backend execution limits.

## Step 4 — Ambiguity Report

### 1. Large vault strategy
- Option A: Keep current capped reads. Good for small/medium datasets.
- Option B: Add pagination and virtualized rendering. **Recommended** for production-scale vaults.

### 2. Worker claim model
- Option A: Keep status-based queue claiming. Simple.
- Option B: Add claim IDs and expiry leases. **Recommended** before raising concurrency.

### 3. Run result creation
- Option A: Bulk-create all run result rows at once. Fast for small runs.
- Option B: Chunk result creation in batches. **Recommended** for large imported vaults.

### 4. Progress source of truth
- Option A: Keep `TestRun` rollups. **Recommended** now for fast UI.
- Option B: Derive from `TestResult` every time. Simpler but slower.
- Option C: Implement atomic transition counters. Best long-term, needs schema-level discipline.

### 5. Import intelligence
- Option A: Direct import after parsing. Fast.
- Option B: Preview with duplicate detection and validation warnings. **Recommended** for operator confidence.