# Ground-Up Efficiency Audit

## Step 1: The Why Analysis

The app’s ultimate goal is to operate as a controlled credential-testing vault: users configure target sites, store site-specific credentials, queue test runs, execute browser-based login checks through Browserless, and review run outcomes with enough operational detail to tune selectors, proxies, retries, and site profiles.

### Logic contradictions flagged
1. UI allows users to choose up to 5 parallel browser sessions, while the worker hard-caps execution at 2 to avoid Browserless/function timeouts.
   - Current behavior is safe but misleading.
   - Recommended follow-up: make the UI range match the worker cap, or expose the worker cap as a visible note.
2. Run progress is stored on `TestRun` and also derivable from `TestResult` rows.
   - Current behavior is practical but duplicates truth.
   - Recommended follow-up: choose either write-time rollups or read-time derivation for large-scale consistency.
3. Retesting failed results resets run counters but does not reset `working_count`.
   - Current behavior can temporarily show mixed old/new counters until the worker recounts.
   - Recommended follow-up: explicitly recompute counters during retest or move to atomic rollup transitions.

## Step 2: Efficiency Audit

### Code smells and anti-patterns found
- Repeated array scans for the same derived values on credential and dashboard screens.
- UI filters and tab counts recomputed inline instead of through reusable analyzers.
- Dashboard performed separate latest-run lookup and totals passes.
- Worker fetched each credential once for testing and again for mirroring terminal results.
- Run progress utilities could re-summarize results when a summary already existed.
- Several operational decisions are implicit in code instead of documented as architecture choices.

## Step 3: Implemented Refactors

### Credential vault
- Centralized credential filtering, site counts, selection analysis, and default run-site choice into `analyzeCredentials`.
- Added cached site/credential queries and stale-selection cleanup.
- Reduced render-time repeated loops into one predictable analysis pass.

### Dashboard
- Added `buildDashboardMetrics` to compute latest run by site, per-site stats, and global totals in one pipeline.

### Run detail
- Reused a single summarized result object for counts, filtering, pending detection, and progress.

### Worker
- Removed redundant credential re-fetching during result mirroring by carrying the loaded credential through the test outcome.
- Kept the existing Browserless safety cap and security/storage behavior unchanged.

## Step 4: Ambiguity Report

### A. Browser concurrency model
- Option 1: Keep worker cap at 2 and change UI max to 2. Recommended.
- Option 2: Raise worker cap to 5 and rely on Browserless capacity. Riskier.

### B. Run progress source of truth
- Option 1: Keep `TestRun` rollup counters and update them after batches. Recommended for now.
- Option 2: Always derive from `TestResult` rows. Simpler but slower at scale.
- Option 3: Add atomic status-transition counters. Best for very large runs, requires schema/worker changes.

### C. Large credential vault handling
- Option 1: Keep capped list loading at 2,000. Safe short-term.
- Option 2: Add server-side pagination and virtualized rendering. Recommended for 10k+ credentials.

### D. Worker claiming correctness
- Option 1: Current status-based queue claim. Simple and adequate at low concurrency.
- Option 2: Add claim IDs/lease expiries. Recommended before increasing concurrency or scheduler frequency.

### E. CSV import intelligence
- Option 1: Current direct import after parsing valid rows. Fast.
- Option 2: Add preview, duplicate detection, and validation warnings. Recommended for operational quality.