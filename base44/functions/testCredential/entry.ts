import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BROWSERLESS_URL = 'https://production-sfo.browserless.io';
const DEFAULT_SUCCESS_SELECTOR = '.ol-alert__content.ol-alert__content--status_success';

function classify(site, finalUrl, markerFound) {
  const loginMarker = site.login_url_marker || '/login';
  const successUrlContains = site.success_url_contains;

  const urlOkByMarker = loginMarker ? !finalUrl.includes(loginMarker) : true;
  const urlOkByContains = successUrlContains ? finalUrl.includes(successUrlContains) : true;
  const urlChanged = urlOkByMarker && urlOkByContains;

  // OR logic: either URL changed away from login page, OR success marker found
  if (urlChanged || markerFound) return 'working';
  return 'failed';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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
    const usernameSelector = site.username_selector || "input[type='email'], input[name='username']";
    const passwordSelector = site.password_selector || "input[type='password']";
    const submitSelector = site.submit_selector || "button[type='submit']";
    const loginUrl = site.login_url;

    // Browserless /function endpoint — runs arbitrary Puppeteer code server-side
    const code = `
export default async function ({ page }) {
  await page.goto(${JSON.stringify(loginUrl)}, { waitUntil: 'networkidle2', timeout: 30000 });

  // Fill username
  await page.waitForSelector(${JSON.stringify(usernameSelector)}, { timeout: 10000 });
  await page.type(${JSON.stringify(usernameSelector)}, ${JSON.stringify(username)}, { delay: 40 });

  // Fill password
  await page.waitForSelector(${JSON.stringify(passwordSelector)}, { timeout: 10000 });
  await page.type(${JSON.stringify(passwordSelector)}, ${JSON.stringify(password)}, { delay: 40 });

  // Submit
  await page.click(${JSON.stringify(submitSelector)});

  // Wait for navigation / JS to settle
  await new Promise(r => setTimeout(r, ${waitMs}));

  const finalUrl = page.url();
  const markerFound = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }, ${JSON.stringify(successSelector)});

  return { data: { finalUrl, markerFound } };
}
`;

    const started = Date.now();
    const blRes = await fetch(`${BROWSERLESS_URL}/function?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/javascript' },
      body: code,
    });
    const elapsed = Date.now() - started;

    if (!blRes.ok) {
      const text = await blRes.text();
      return Response.json({
        status: 'error',
        error_message: `Browserless ${blRes.status}: ${text.slice(0, 300)}`,
        elapsed_ms: elapsed,
      });
    }

    const result = await blRes.json();
    const { finalUrl = loginUrl, markerFound = false } = result?.data || {};
    const status = classify(site, finalUrl, markerFound);

    return Response.json({
      status,
      final_url: finalUrl,
      success_marker_found: markerFound,
      elapsed_ms: elapsed,
    });
  } catch (error) {
    return Response.json({ status: 'error', error_message: error.message }, { status: 500 });
  }
});