import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by a scheduled automation every minute.
// Picks up any active runs and drives them forward — no open tab needed.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active runs across all users
    const activeRuns = await base44.asServiceRole.entities.TestRun.filter(
      { status: 'queued' },
      '-created_date',
      50
    );
    const runningRuns = await base44.asServiceRole.entities.TestRun.filter(
      { status: 'running' },
      '-created_date',
      50
    );
    const allActive = [...activeRuns, ...runningRuns];

    if (allActive.length === 0) {
      return Response.json({ message: 'No active runs', processed: 0 });
    }

    // Drive each active run forward (invoke runWorker per run)
    const results = await Promise.all(
      allActive.map(async (run) => {
        try {
          const res = await base44.asServiceRole.functions.invoke('runWorker', { run_id: run.id });
          return { run_id: run.id, result: res?.data || res };
        } catch (e) {
          return { run_id: run.id, error: e.message };
        }
      })
    );

    return Response.json({ processed: allActive.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});