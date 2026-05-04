import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { login_url, username_selector, password_selector, submit_selector, success_selector } = await req.json();
    if (!login_url) return Response.json({ error: 'login_url is required' }, { status: 400 });

    let apiKey = Deno.env.get('BROWSERLESS_API_KEY');
    try {
      const secrets = await base44.asServiceRole.entities.AppSecret.filter({ name: 'BROWSERLESS_API_KEY' });
      if (secrets.length > 0) apiKey = secrets[0].value;
    } catch (e) {}

    if (!apiKey) return Response.json({ error: 'BROWSERLESS_API_KEY not set' }, { status: 500 });

    const fnBody = `
      export default async ({ page }) => {
        const url = ${JSON.stringify(login_url)};
        const sels = {
          user: ${JSON.stringify(username_selector)},
          pass: ${JSON.stringify(password_selector)},
          submit: ${JSON.stringify(submit_selector)},
          success: ${JSON.stringify(success_selector)}
        };
        
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        });
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const results = {};
        for (const [key, sel] of Object.entries(sels)) {
          if (sel) {
            const found = await page.evaluate((s) => {
              const el = document.querySelector(s);
              return el ? true : false;
            }, sel);
            results[key] = found;
          } else {
            results[key] = null;
          }
        }
        
        const screenshot = await page.screenshot({ encoding: 'base64' });
        
        return { data: { results, screenshot }, type: 'application/json' };
      };
    `;

    const params = new URLSearchParams();
    params.set('token', apiKey);
    params.set('stealth', 'true');
    params.set('headless', 'false');
    const args = [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process'
    ];
    params.set('launch', JSON.stringify({ args }));
    
    const res = await fetch("https://production-sfo.browserless.io/function?" + params.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/javascript' },
      body: fnBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: "Browserless failed: " + errText }, { status: 500 });
    }

    const result = await res.json();
    return Response.json(result.data || result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});