import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEFAULT_SUCCESS_SELECTOR = '.ol-alert__content.ol-alert__content--status_success';

function classify(site, finalUrl, markerFound) {
  if (markerFound) return 'working';
  const loginMarker = site.login_url_marker || '/login';
  const successUrlContains = site.success_url_contains || '';
  // If still on the login page, it failed
  if (loginMarker && finalUrl.includes(loginMarker)) return 'failed';
  // If a success URL substring is required, check it
  if (successUrlContains && !finalUrl.includes(successUrlContains)) return 'failed';
  // URL changed away from login — treat as working
  return 'working';
}

Deno.serve(async (req) => {
  const started = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { username, password, site_key } = body;

    if (!username || !password || !site_key) {
      return Response.json({ error: 'Missing username/password/site_key' }, { status: 400 });
    }

    const sites = await base44.asServiceRole.entities.Site.filter({ key: site_key });
    const site = sites[0];
    if (!site) return Response.json({ error: `Unknown site: ${site_key}` }, { status: 404 });

    const apiKey = Deno.env.get('BROWSERLESS_API_KEY');
    if (!apiKey) return Response.json({ error: 'BROWSERLESS_API_KEY not set' }, { status: 500 });

    const waitMs = site.wait_after_submit_ms || 3500;
    const successSelector = site.success_selector || DEFAULT_SUCCESS_SELECTOR;
    // Take only first selector (no comma-separated lists in Puppeteer)
    const usernameSelector = (site.username_selector || '#username').split(',')[0].trim();
    const passwordSelector = (site.password_selector || '#password').split(',')[0].trim();
    const submitSelector = (site.submit_selector || '#loginSubmit').split(',')[0].trim();
    const loginUrl = site.login_url;

    const sessionTimeout = waitMs + 50000;
    const proxyCountry = site.proxy_country ? site.proxy_country.trim().toLowerCase() : '';
    const proxyParams = proxyCountry ? `&proxy=residential&proxyCountry=${proxyCountry}&proxySticky` : '';
    const browserlessUrl = `https://production-sfo.browserless.io/function?token=${apiKey}&timeout=${sessionTimeout}${proxyParams}`;

    // Puppeteer function executed remotely inside Browserless
    const fnBody = `
      export default async ({ page }) => {
        const loginUrl = ${JSON.stringify(loginUrl)};
        const userSel = ${JSON.stringify(usernameSelector)};
        const passSel = ${JSON.stringify(passwordSelector)};
        const submitSel = ${JSON.stringify(submitSelector)};
        const successSel = ${JSON.stringify(successSelector)};
        const waitMs = ${waitMs};
        const user = ${JSON.stringify(username)};
        const pass = ${JSON.stringify(password)};

        await page.goto(loginUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        await page.waitForSelector(userSel, { timeout: 10000 });
        await page.click(userSel, { clickCount: 3 });
        await page.type(userSel, user, { delay: 30 });

        await page.waitForSelector(passSel, { timeout: 10000 });
        await page.click(passSel, { clickCount: 3 });
        await page.type(passSel, pass, { delay: 30 });

        await page.waitForSelector(submitSel, { timeout: 10000 });
        await page.click(submitSel);

        await new Promise(r => setTimeout(r, waitMs));

        const finalUrl = page.url();
        const markerFound = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }, successSel);

        return { data: { finalUrl, markerFound } };
      };
    `;

    const res = await fetch(browserlessUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/javascript' },
      body: fnBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json(
        { status: 'error', error_message: `Browserless ${res.status}: ${errText.slice(0, 400)}`, elapsed_ms: Date.now() - started },
        { status: 500 }
      );
    }

    const result = await res.json();
    const { finalUrl, markerFound } = result?.data || result;

    const status = classify(site, finalUrl || '', !!markerFound);
    return Response.json({ status, final_url: finalUrl, success_marker_found: !!markerFound, elapsed_ms: Date.now() - started });

  } catch (error) {
    return Response.json({ status: 'error', error_message: error.message, elapsed_ms: Date.now() - started }, { status: 500 });
  }
});