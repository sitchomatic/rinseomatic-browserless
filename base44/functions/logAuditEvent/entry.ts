import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const message = String(body.message || '').trim().slice(0, 500);
    if (!message) return Response.json({ error: 'Message required' }, { status: 400 });

    const log = await base44.entities.ActionLog.create({
      session_id: body.session_id || 'manual',
      level: body.level || 'info',
      category: body.category || 'system',
      message,
      delta_ms: Number(body.delta_ms || 0),
      timestamp: new Date().toISOString(),
      site: body.site || null,
    });

    return Response.json({ ok: true, log });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});