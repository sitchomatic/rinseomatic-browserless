import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function testOne(base44, site, result) {
  const started = Date.now();
  try {
    const creds = await base44.asServiceRole.entities.Credential.filter({ id: result.credential_id });
    const credential = creds[0];
    if (!credential) {
      return { status: 'error', error_message: 'Credential deleted', elapsed_ms: 0 };
    }

    const res = await base44.asServiceRole.functions.invoke('testCredential', {
      username: credential.username,
      password: credential.password,
      site_key: site.key,
    });

    const data = res?.data || res;
    return {
      status: data.status || 'error',
      final_url: data.final_url,
      success_marker_found: data.success_marker_found,
      error_message: data.error_message,
      elapsed_ms: data.elapsed_ms ?? (Date.now() - started),
    };
  } catch (e) {
    return {
      status: 'error',
      error_message: e.message,
      elapsed_ms: Date.now() - started,
    };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Support both authenticated (from UI) and service-role (from scheduler) calls
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}

    const { run_id } = await req.json();
    if (!run_id) return Response.json({ error: 'Missing run_id' }, { status: 400 });

    const runs = await base44.asServiceRole.entities.TestRun.filter({ id: run_id });
    const run = runs[0];
    if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });

    if (run.status === 'cancelled' || run.status === 'completed') {
      return Response.json({ done: true, status: run.status });
    }

    const sites = await base44.asServiceRole.entities.Site.filter({ key: run.site_key });
    const site = sites[0];
    if (!site) return Response.json({ error: `Site ${run.site_key} missing` }, { status: 404 });

    // Cap concurrency at 2 to avoid function timeouts with Playwright sessions
    const concurrency = Math.max(1, Math.min(2, run.concurrency || 2));

    const queued = await base44.asServiceRole.entities.TestResult.filter(
      { run_id, status: 'queued' },
      'created_date',
      concurrency
    );

    if (queued.length === 0) {
      const all = await base44.asServiceRole.entities.TestResult.filter({ run_id }, '-created_date', 5000);
      const stillRunning = all.some((r) => r.status === 'running' || r.status === 'queued');
      if (!stillRunning) {
        const working = all.filter((r) => r.status === 'working').length;
        const failed = all.filter((r) => r.status === 'failed').length;
        const errored = all.filter((r) => r.status === 'error').length;
        await base44.asServiceRole.entities.TestRun.update(run_id, {
          status: 'completed',
          ended_at: new Date().toISOString(),
          elapsed_ms: run.started_at ? Date.now() - new Date(run.started_at).getTime() : 0,
          pending_count: 0,
          working_count: working,
          failed_count: failed,
          error_count: errored,
        });
      }
      return Response.json({ done: true, processed: 0 });
    }

    // Mark run as running on first batch
    if (run.status !== 'running') {
      await base44.asServiceRole.entities.TestRun.update(run_id, {
        status: 'running',
        started_at: run.started_at || new Date().toISOString(),
      });
    }

    // Claim batch atomically by marking them 'running'
    await Promise.all(queued.map((r) =>
      base44.asServiceRole.entities.TestResult.update(r.id, {
        status: 'running',
        attempts: (r.attempts || 0) + 1,
      })
    ));

    // Execute tests in parallel (capped at 2)
    const outcomes = await Promise.all(queued.map((r) => testOne(base44, site, r)));

    // Persist results + handle retries
    const maxRetries = run.max_retries ?? 1;
    await Promise.all(queued.map(async (r, i) => {
      const o = outcomes[i];
      const attempts = (r.attempts || 0) + 1;
      const shouldRetry = o.status === 'error' && attempts <= maxRetries;
      const finalStatus = shouldRetry ? 'queued' : o.status;

      await base44.asServiceRole.entities.TestResult.update(r.id, {
        status: finalStatus,
        attempts,
        final_url: o.final_url || null,
        success_marker_found: !!o.success_marker_found,
        error_message: o.error_message || null,
        elapsed_ms: o.elapsed_ms || 0,
        tested_at: new Date().toISOString(),
      });

      // Mirror terminal result back to the Credential record
      if (!shouldRetry && (o.status === 'working' || o.status === 'failed' || o.status === 'error')) {
        try {
          const existing = await base44.asServiceRole.entities.Credential.filter({ id: r.credential_id });
          if (existing[0]) {
            await base44.asServiceRole.entities.Credential.update(r.credential_id, {
              status: o.status === 'working' ? 'working' : o.status === 'failed' ? 'failed' : 'error',
              last_tested: new Date().toISOString(),
              last_result_note: o.error_message || (o.final_url ? `→ ${o.final_url}` : null),
              attempts: (existing[0].attempts || 0) + 1,
            });
          }
        } catch (_) { /* ignore mirror failure */ }
      }
    }));

    // Recount and update run progress
    const all = await base44.asServiceRole.entities.TestResult.filter({ run_id }, '-created_date', 5000);
    const pending = all.filter((r) => r.status === 'queued' || r.status === 'running').length;
    const working = all.filter((r) => r.status === 'working').length;
    const failed = all.filter((r) => r.status === 'failed').length;
    const errored = all.filter((r) => r.status === 'error').length;
    const isDone = pending === 0;

    await base44.asServiceRole.entities.TestRun.update(run_id, {
      pending_count: pending,
      working_count: working,
      failed_count: failed,
      error_count: errored,
      ...(isDone ? {
        status: 'completed',
        ended_at: new Date().toISOString(),
        elapsed_ms: run.started_at ? Date.now() - new Date(run.started_at).getTime() : 0,
      } : {}),
    });

    return Response.json({ done: isDone, processed: queued.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});