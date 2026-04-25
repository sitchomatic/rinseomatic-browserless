import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function testOne(base44, site, result, credential) {
  const started = Date.now();
  try {
    if (!credential) {
      return { status: 'error', error_message: 'Credential deleted', elapsed_ms: 0 };
    }

    const res = await base44.asServiceRole.functions.invoke('testCredential', {
      username: credential.username,
      password: credential.password,
      password_variants: credential.password_variants || [],
      site_key: site.key,
      run_id: result.run_id,
      result_id: result.id,
      credential_id: credential.id,
    });

    const data = res?.data || res;
    return {
      status: data.status || 'error',
      final_url: data.final_url,
      success_marker_found: data.success_marker_found,
      error_message: data.error_message,
      working_password: data.working_password,
      proxy_fallback_used: !!data.proxy_fallback_used,
      elapsed_ms: data.elapsed_ms ?? (Date.now() - started),
      credential,
    };
  } catch (e) {
    const responseData = e?.response?.data;
    const details = responseData?.error || responseData?.error_message || responseData?.message || (responseData ? JSON.stringify(responseData).slice(0, 500) : e.message);
    return {
      status: 'error',
      error_message: details,
      elapsed_ms: Date.now() - started,
    };
  }
}

Deno.serve(async (req) => {
  let runIdForCleanup = null;
  let base44ForCleanup = null;
  try {
    const base44 = createClientFromRequest(req);
    base44ForCleanup = base44;

    // Support both authenticated UI calls and service-role scheduler calls.
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}

    const { run_id } = await req.json();
    runIdForCleanup = run_id;
    if (!run_id) return Response.json({ error: 'Missing run_id' }, { status: 400 });

    const runs = await base44.asServiceRole.entities.TestRun.filter({ id: run_id });
    let run = runs[0];
    if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });
    if (user && user.role !== 'admin' && run.created_by !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (run.status === 'cancelled' || run.status === 'completed') {
      return Response.json({ done: true, status: run.status });
    }

    const workerId = crypto.randomUUID();
    const claimTime = new Date().toISOString();
    const lockAgeMs = run.claimed_at ? Date.now() - new Date(run.claimed_at).getTime() : Infinity;
    if (run.worker_id && lockAgeMs < 2 * 60 * 1000) {
      return Response.json({ done: false, skipped: true, reason: 'Run is already being processed' });
    }
    await base44.asServiceRole.entities.TestRun.update(run_id, { worker_id: workerId, claimed_at: claimTime });
    run = (await base44.asServiceRole.entities.TestRun.filter({ id: run_id }))[0];
    if (run.worker_id !== workerId) {
      return Response.json({ done: false, skipped: true, reason: 'Run lock was taken by another worker' });
    }

    const sites = await base44.asServiceRole.entities.Site.filter({ key: run.site_key });
    const site = sites[0];
    if (!site) {
      await base44.asServiceRole.entities.TestRun.update(run_id, { worker_id: null, claimed_at: null });
      return Response.json({ error: `Site ${run.site_key} missing` }, { status: 404 });
    }
    if (site.enabled === false) {
      await base44.asServiceRole.entities.TestRun.update(run_id, { worker_id: null, claimed_at: null });
      return Response.json({ error: `Site ${run.site_key} is disabled` }, { status: 400 });
    }

    if (run.status === 'running' && run.updated_date) {
      const staleMs = Date.now() - new Date(run.updated_date).getTime();
      if (staleMs > 15 * 60 * 1000) {
        const stale = await base44.asServiceRole.entities.TestResult.filter({ run_id, status: 'running' }, '-created_date', 5000);
        await Promise.all(stale.map((r) => base44.asServiceRole.entities.TestResult.update(r.id, { status: 'queued', worker_id: null, claimed_at: null })));
      }
    }

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
        const counts = all.reduce((acc, r) => {
          if (r.status === 'working') acc.working += 1;
          if (r.status === 'failed') acc.failed += 1;
          if (r.status === 'error') acc.errored += 1;
          return acc;
        }, { working: 0, failed: 0, errored: 0 });
        await base44.asServiceRole.entities.TestRun.update(run_id, {
          status: 'completed',
          ended_at: new Date().toISOString(),
          elapsed_ms: run.started_at ? Date.now() - new Date(run.started_at).getTime() : Date.now() - new Date(run.created_date).getTime(),
          pending_count: 0,
          working_count: counts.working,
          failed_count: counts.failed,
          error_count: counts.errored,
          worker_id: null,
          claimed_at: null,
        });
      }
      await base44.asServiceRole.entities.TestRun.update(run_id, { worker_id: null, claimed_at: null });
      return Response.json({ done: !stillRunning, processed: 0 });
    }

    // Mark run as running on first batch
    if (run.status !== 'running') {
      await base44.asServiceRole.entities.TestRun.update(run_id, {
        status: 'running',
        started_at: run.started_at || new Date().toISOString(),
      });
    }

    // Claim this batch before launching browser sessions.
    await Promise.all(queued.map((r) =>
      base44.asServiceRole.entities.TestResult.update(r.id, {
        status: 'running',
        worker_id: workerId,
        claimed_at: claimTime,
        attempts: (r.attempts || 0) + 1,
      })
    ));

    const claimed = await base44.asServiceRole.entities.TestResult.filter({ run_id, status: 'running', worker_id: workerId }, 'created_date', concurrency);
    const credentials = await Promise.all(claimed.map((r) => base44.asServiceRole.entities.Credential.filter({ id: r.credential_id }).then((rows) => rows[0] || null)));

    // Execute tests in parallel (capped at 2)
    const outcomes = await Promise.all(claimed.map((r, index) => testOne(base44, site, r, credentials[index])));

    // Persist results + update run progress incrementally.
    const maxRetries = run.max_retries ?? 1;
    const progressDelta = { pending: 0, working: 0, failed: 0, errored: 0 };

    await Promise.all(claimed.map(async (r, i) => {
      const o = outcomes[i];
      const attempts = r.attempts || 1;
      const shouldRetry = o.status === 'error' && attempts < maxRetries + 1;
      const finalStatus = shouldRetry ? 'queued' : o.status;

      if (!shouldRetry) {
        progressDelta.pending -= 1;
        if (finalStatus === 'working') progressDelta.working += 1;
        else if (finalStatus === 'failed') progressDelta.failed += 1;
        else progressDelta.errored += 1;
      }

      await base44.asServiceRole.entities.ActionLog.create({
        session_id: run_id,
        level: finalStatus === 'working' ? 'success' : finalStatus === 'queued' ? 'warn' : 'error',
        category: 'auth',
        site: run.site_key,
        message: `${r.username || 'credential'} → ${finalStatus}${o.proxy_fallback_used ? ' (proxy fallback)' : ''}${o.error_message ? `: ${o.error_message}` : ''}`,
        delta_ms: o.elapsed_ms || 0,
        timestamp: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.TestResult.update(r.id, {
        status: finalStatus,
        attempts,
        final_url: o.final_url || null,
        success_marker_found: !!o.success_marker_found,
        error_message: o.error_message || null,
        elapsed_ms: o.elapsed_ms || 0,
        tested_at: new Date().toISOString(),
        worker_id: null,
        claimed_at: null,
      });

      // Mirror terminal result back to the Credential record
      if (!shouldRetry && (o.status === 'working' || o.status === 'failed' || o.status === 'error')) {
        try {
          const existing = o.credential;
          if (existing) {
            const update = {
              status: o.status === 'working' ? 'working' : o.status === 'failed' ? 'failed' : 'error',
              last_tested: new Date().toISOString(),
              last_result_note: o.error_message || (o.working_password ? `variant matched → ${o.final_url || ''}` : (o.final_url ? `→ ${o.final_url}` : null)),
              attempts: (existing.attempts || 0) + 1,
            };
            // If a variant password worked, promote it to primary
            if (o.working_password && o.working_password !== existing.password) {
              const oldPrimary = existing.password;
              const variants = (existing.password_variants || []).filter((p) => p && p !== o.working_password);
              if (oldPrimary && !variants.includes(oldPrimary)) variants.push(oldPrimary);
              update.password = o.working_password;
              update.password_variants = variants;
            }
            await base44.asServiceRole.entities.Credential.update(r.credential_id, update);
          }
        } catch (_) { /* ignore mirror failure */ }
      }
    }));

    const pendingCount = Math.max(0, (run.pending_count ?? queued.length) + progressDelta.pending);
    const isDone = pendingCount === 0;

    await base44.asServiceRole.entities.TestRun.update(run_id, {
      pending_count: pendingCount,
      working_count: (run.working_count ?? 0) + progressDelta.working,
      failed_count: (run.failed_count ?? 0) + progressDelta.failed,
      error_count: (run.error_count ?? 0) + progressDelta.errored,
      ...(isDone ? {
        status: 'completed',
        ended_at: new Date().toISOString(),
        elapsed_ms: run.started_at ? Date.now() - new Date(run.started_at).getTime() : Date.now() - new Date(run.created_date).getTime(),
      } : {}),
      worker_id: null,
      claimed_at: null,
    });

    return Response.json({ done: isDone, processed: claimed.length });
  } catch (error) {
    if (runIdForCleanup && base44ForCleanup) {
      await base44ForCleanup.asServiceRole.entities.TestRun.update(runIdForCleanup, { worker_id: null, claimed_at: null });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});