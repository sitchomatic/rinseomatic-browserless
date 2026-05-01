import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { url } = body;
    if (!url) return Response.json({ error: 'Missing url' }, { status: 400 });

    let apiKey = Deno.env.get('SCRAPINGBEE_API_KEY');
    try {
      const secrets = await base44.asServiceRole.entities.AppSecret.filter({ name: 'SCRAPINGBEE_API_KEY' });
      if (secrets.length > 0) apiKey = secrets[0].value;
    } catch (e) {}

    if (!apiKey) return Response.json({ error: 'SCRAPINGBEE_API_KEY not set' }, { status: 400 });

    const sbUrl = `https://app.scrapingbee.com/api/v1/?api_key=${encodeURIComponent(apiKey)}&url=${encodeURIComponent(url)}&screenshot=true&screenshot_full_page=true&window_width=1920&window_height=1080`;

    const res = await fetch(sbUrl);
    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `ScrapingBee error ${res.status}: ${errText}` }, { status: 500 });
    }

    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);

    return Response.json({ ok: true, screenshot_base64: `data:image/png;base64,${base64}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});