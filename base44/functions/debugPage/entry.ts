import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { url } = body;

    const apiKey = Deno.env.get('BROWSERLESS_API_KEY');
    if (!apiKey) return Response.json({ error: 'BROWSERLESS_API_KEY not set' }, { status: 500 });

    const { proxy_country } = body;
    const proxyParams = proxy_country ? `&proxy=residential&proxyCountry=${proxy_country.toLowerCase()}&proxySticky` : '';
    const browserlessUrl = `https://production-sfo.browserless.io/function?token=${apiKey}&timeout=60000${proxyParams}`;

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

        return { data: { finalUrl, title, inputs, iframes, bodySnippet } };
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