import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    let apiKey = Deno.env.get('SCRAPINGBEE_API_KEY');
    try {
      const secrets = await base44.asServiceRole.entities.AppSecret.filter({ name: 'SCRAPINGBEE_API_KEY' });
      if (secrets.length > 0) apiKey = secrets[0].value;
    } catch (e) {}

    if (!apiKey) return Response.json({ ok: false, error: 'SCRAPINGBEE_API_KEY not set' });

    const response = await fetch(`https://app.scrapingbee.com/api/v1/usage?api_key=${encodeURIComponent(apiKey)}`);
    if (!response.ok) {
      return Response.json({ ok: false, error: `ScrapingBee returned ${response.status}` });
    }
    const data = await response.json();
    return Response.json({ ok: true, data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});