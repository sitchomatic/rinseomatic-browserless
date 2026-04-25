import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const logs = await base44.asServiceRole.entities.ActionLog.filter(
      { category: 'system', message: 'Scheduler heartbeat' },
      '-created_date',
      1
    );

    const heartbeat = logs[0] || null;
    const last_run_at = heartbeat?.timestamp || heartbeat?.created_date || null;
    const minutes_since_run = last_run_at ? (Date.now() - new Date(last_run_at).getTime()) / 60000 : null;

    return Response.json({
      last_run_at,
      healthy: typeof minutes_since_run === 'number' && minutes_since_run <= 10,
      minutes_since_run,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});