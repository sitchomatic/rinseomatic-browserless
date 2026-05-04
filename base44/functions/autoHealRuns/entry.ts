import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { site_key, username } = await req.json();
    const query = { status: 'failed' };
    if (site_key) query.site_key = site_key;
    if (username) query.username = username;

    const failedResults = await base44.asServiceRole.entities.TestResult.filter(query, '', 100);
    
    let healed = 0;
    for (const r of failedResults) {
      await base44.asServiceRole.entities.TestResult.update(r.id, { 
        status: 'queued', 
        attempts: 0,
        error_message: 'Auto-healed for retest',
        worker_id: null,
        claimed_at: null
      });
      healed++;
      
      // Update the run's pending count if needed
      if (r.run_id) {
         try {
           const runs = await base44.asServiceRole.entities.TestRun.filter({ id: r.run_id });
           if (runs.length > 0) {
             const run = runs[0];
             await base44.asServiceRole.entities.TestRun.update(run.id, {
               pending_count: (run.pending_count || 0) + 1,
               failed_count: Math.max(0, (run.failed_count || 0) - 1),
               status: 'queued'
             });
           }
         } catch (e) {}
      }
    }

    return Response.json({ success: true, healed_count: healed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});