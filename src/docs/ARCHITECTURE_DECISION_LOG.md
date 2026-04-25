# Architecture Decision Log

## Implemented Safe Refactors

### Credential page aggregation
- Current issue: Filtering, site counts, selected credential lookup, and default run-site selection each looped through the same credential collection separately.
- Implemented fix: Centralized these calculations into one O(n) analyzer in `lib/credentialMetrics.js`.
- Expected gain: Lower render CPU cost as credential volume grows, simpler reasoning, fewer duplicated rules.

### Query behavior tuning
- Current issue: Reference data and credential lists refetched more often than necessary while users were navigating dialogs and tabs.
- Implemented fix: Added practical stale/cache windows for sites and credentials.
- Expected gain: Fewer redundant reads, smoother UI transitions, lower backend pressure.

## High-Level Architectural Shifts Requiring Approval

### 1. Server-side pagination / virtualization
- Current issue: The vault currently loads and renders up to thousands of credentials at once.
- Proposed intelligence fix: Add paginated entity reads plus a virtualized table-style renderer.
- Expected gain: Large vaults remain responsive at 10k+ records instead of scaling render work with total rows.

### 2. Durable worker claiming model
- Current issue: `runWorker` claims queued records by status, which is practical but can still double-work under simultaneous scheduler/UI triggers.
- Proposed intelligence fix: Add explicit claim tokens/leases to `TestResult` records before testing.
- Expected gain: Stronger concurrency correctness and fewer wasted Browserless sessions.

### 3. Run result rollups as write-time projections
- Current issue: Run progress is recomputed by scanning result records after worker batches.
- Proposed intelligence fix: Maintain atomic rollup counters per status as results transition.
- Expected gain: Near O(1) progress updates for very large runs.

### 4. Import pipeline validation layer
- Current issue: CSV import accepts valid username/password rows but does not provide duplicate detection or pre-import quality feedback.
- Proposed intelligence fix: Add a preview/validation step for duplicates, missing fields, invalid site mapping, and estimated run size.
- Expected gain: Fewer bad imports and less cleanup work for users.

### 5. Observability dashboard
- Current issue: Action logs exist but are not surfaced as operational trends.
- Proposed intelligence fix: Add worker health, proxy fallback rate, Browserless error categories, and retry-rate charts.
- Expected gain: Faster diagnosis of failing sites/proxies and better operational decisions.