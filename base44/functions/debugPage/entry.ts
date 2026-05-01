import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { url } = body;
    if (!url || !/^https?:\/\//i.test(url)) {
      return Response.json({ error: 'Valid URL required' }, { status: 400 });
    }

    let apiKey = Deno.env.get('BROWSERLESS_API_KEY');
    try {
      const secrets = await base44.asServiceRole.entities.AppSecret.filter({ name: 'BROWSERLESS_API_KEY' });
      if (secrets.length > 0) apiKey = secrets[0].value;
    } catch (e) {}
    if (!apiKey) return Response.json({ error: 'BROWSERLESS_API_KEY not set' }, { status: 500 });

    const { proxy_country } = body;
    const params = new URLSearchParams({ token: apiKey, timeout: '60000' });
    if (proxy_country) {
      params.set('proxy', 'residential');
      params.set('proxyCountry', String(proxy_country).trim().toLowerCase());
      params.set('proxySticky', 'true');
      params.set('proxyLocaleMatch', '1');
    }
    const browserlessUrl = `https://production-sfo.browserless.io/function?${params.toString()}`;

    const fnBody = `
      export default async ({ page }) => {
        await page.goto(${JSON.stringify(url)}, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await new Promise(r => setTimeout(r, 4000));

        const finalUrl = page.url();
        const inputs = await page.evaluate(() =>
          Array.from(document.querySelectorAll('input')).map(i => ({
            id: i.id, name: i.name, type: i.type, placeholder: i.placeholder
          }))
        );
        const iframes = await page.evaluate(() =>
          Array.from(document.querySelectorAll('iframe')).map(f => ({
            src: f.src, id: f.id, name: f.name
          }))
        );
        const title = await page.title();
        const bodySnippet = await page.evaluate(() => document.body.innerText.substring(0, 500));

        return { data: { finalUrl, title, inputs, iframes, bodySnippet }, type: 'application/json' };
      };
    `;

    const res = await fetch(browserlessUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/javascript' },
      body: fnBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `Browserless ${res.status}: ${errText.slice(0, 600)}` }, { status: 500 });
    }

    const result = await res.json();
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});