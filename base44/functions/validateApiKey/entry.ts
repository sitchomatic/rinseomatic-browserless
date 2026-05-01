import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { name, value } = await req.json();
    if (!name || !value) {
      return Response.json({ error: 'Missing name or value' }, { status: 400 });
    }

    if (name === 'BROWSERLESS_API_KEY') {
      const response = await fetch(`https://production-sfo.browserless.io/json/version?token=${encodeURIComponent(value)}`);
      if (!response.ok) {
        return Response.json({ ok: false, error: `Browserless validation failed (${response.status})` });
      }
      return Response.json({ ok: true });
    }

    if (name === 'NORDVPN_ACCESS_TOKEN') {
      const cleanToken = String(value).replace(/^token:/i, '').replace(/^bearer\s+/i, '').trim();
      const headersToTry = [`Bearer ${cleanToken}`, `token:${cleanToken}`, `token ${cleanToken}`];
      let success = false;
      for (const authorization of headersToTry) {
        const response = await fetch('https://api.nordvpn.com/v1/users/services/credentials', {
          headers: { Accept: 'application/json', Authorization: authorization },
        });
        if (response.ok) {
          success = true;
          break;
        }
      }
      if (!success) {
        return Response.json({ ok: false, error: 'NordVPN token validation failed or expired' });
      }
      return Response.json({ ok: true });
    }

    if (name === 'SCRAPINGBEE_API_KEY') {
      const response = await fetch(`https://app.scrapingbee.com/api/v1/usage?api_key=${encodeURIComponent(value)}`);
      if (!response.ok) {
        return Response.json({ ok: false, error: `ScrapingBee validation failed (${response.status})` });
      }
      return Response.json({ ok: true });
    }

    // Default for unknown keys
    return Response.json({ ok: true });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});