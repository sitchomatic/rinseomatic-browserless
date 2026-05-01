import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let apiKey = Deno.env.get('BROWSERLESS_API_KEY');
    try {
      const secrets = await base44.asServiceRole.entities.AppSecret.filter({ name: 'BROWSERLESS_API_KEY' });
      if (secrets.length > 0) apiKey = secrets[0].value;
    } catch (e) {}

    if (!apiKey) return Response.json({ sessions: [], error: 'BROWSERLESS_API_KEY not set' });

    // Browserless exposes /json for active pages/targets, and /sessions for active sessions (depending on the plan)
    const jsonRes = await fetch(`https://production-sfo.browserless.io/json?token=${encodeURIComponent(apiKey)}`).catch(() => null);
    
    let activePages = [];
    if (jsonRes && jsonRes.ok) {
      try {
        const text = await jsonRes.text();
        // The API might return text like "You've reached..." if rate limited
        if (text.startsWith('[')) {
          activePages = JSON.parse(text);
        }
      } catch (e) {}
    }

    const sessionsRes = await fetch(`https://production-sfo.browserless.io/sessions?token=${encodeURIComponent(apiKey)}`).catch(() => null);
    let activeSessions = [];
    if (sessionsRes && sessionsRes.ok) {
      try {
        const text = await sessionsRes.text();
        if (text.startsWith('[')) {
          activeSessions = JSON.parse(text);
        }
      } catch (e) {}
    }

    return Response.json({ 
      pages: activePages,
      sessions: activeSessions,
      ok: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});