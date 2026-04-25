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
      password_variants: credential.password_variants || [],
      custom_login_url: credential.custom_login_url || undefined,
      site_key: site.key,
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
  try {
    const base44 = createClientFromRequest(req);

    // Support both authenticated UI calls and service-role scheduler calls.
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}

    const { run_id } = await req.json();
    if (!run_id) return Response.json({ error: 'Missing run_id' }, { status: 400 });

    const runs = await base44.asServiceRole.entities.TestRun.filter({ id: run_id });
    const run = runs[0];
    if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });
    if (user && user.role !== 'admin' && run.created_by !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (run.status === 'cancelled' || run.status === 'completed') {
      return Response.json({ done: true, status: run.status });
    }

    const sites = await base44.asServiceRole.entities.Site.filter({ key: run.site_key });
    const site = sites[0];
    if (!site) return Response.json({ error: `Site ${run.site_key} missing` }, { status: 404 });
    if (site.enabled === false) return Response.json({ error: `Site ${run.site_key} is disabled` }, { status: 400 });

    if (run.status === 'running' && run.updated_date) {
      const staleMs = Date.now() - new Date(run.updated_date).getTime();
      if (staleMs > 15 * 60 * 1000) {
        const stale = await base44.asServiceRole.entities.TestResult.filter({ run_id, status: 'running' }, '-created_date', 5000);
        await Promise.all(stale.map((r) => base44.asServiceRole.entities.TestResult.update(r.id, { status: 'queued' })));
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
        const working = all.filter((r) => r.status === 'working').length;
        const failed = all.filter((r) => r.status === 'failed').length;
        const errored = all.filter((r) => r.status === 'error').length;
        await base44.asServiceRole.entities.TestRun.update(run_id, {
          status: 'completed',
          ended_at: new Date().toISOString(),
          elapsed_ms: run.started_at ? Date.now() - new Date(run.started_at).getTime() : Date.now() - new Date(run.created_date).getTime(),
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

    // Claim this batch before launching browser sessions.
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
      });

      // Mirror terminal result back to the Credential record
      if (!shouldRetry && (o.status === 'working' || o.status === 'failed' || o.status === 'error')) {
        try {
          const existing = await base44.asServiceRole.entities.Credential.filter({ id: r.credential_id });
          if (existing[0]) {
            const update = {
              status: o.status === 'working' ? 'working' : o.status === 'failed' ? 'failed' : 'error',
              last_tested: new Date().toISOString(),
              last_result_note: o.error_message || (o.working_password ? `variant matched → ${o.final_url || ''}` : (o.final_url ? `→ ${o.final_url}` : null)),
              attempts: (existing[0].attempts || 0) + 1,
            };
            // If a variant password worked, promote it to primary
            if (o.working_password && o.working_password !== existing[0].password) {
              const oldPrimary = existing[0].password;
              const variants = (existing[0].password_variants || []).filter((p) => p && p !== o.working_password);
              if (oldPrimary && !variants.includes(oldPrimary)) variants.push(oldPrimary);
              update.password = o.working_password;
              update.password_variants = variants;
            }
            await base44.asServiceRole.entities.Credential.update(r.credential_id, update);
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
        elapsed_ms: run.started_at ? Date.now() - new Date(run.started_at).getTime() : Date.now() - new Date(run.created_date).getTime(),
      } : {}),
    });

    return Response.json({ done: isDone, processed: queued.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});